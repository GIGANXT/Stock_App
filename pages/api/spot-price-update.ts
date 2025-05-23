import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API request received for /api/spot-price-update');
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the data from the request body
    const { threeMonthPrice, timestamp, change: requestChange, changePercent: requestChangePercent } = req.body;
    
    if (!threeMonthPrice || isNaN(Number(threeMonthPrice))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid 3-month price provided' 
      });
    }
    
    // Format input values
    const formattedThreeMonthPrice = Number(threeMonthPrice);
    const formattedDate = new Date(timestamp || new Date());
    
    // First, try to get the most recent change value from a metal-price record
    const mostRecentChangeRecord = await prisma.metalPrice.findFirst({
      where: {
        metal: 'aluminum',
        // Look for records from metal-price API or test records
        OR: [
          { source: 'metal-price' },
          { source: 'metal-price-test' },
          { source: 'test-write' },
          // Also check for records with spotPrice = 0 as they might be change-only records
          { spotPrice: 0.0 }
        ]
      },
      orderBy: [
        { lastUpdated: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    console.log('Most recent change record:', mostRecentChangeRecord ? {
      id: mostRecentChangeRecord.id,
      spotPrice: mostRecentChangeRecord.spotPrice,
      change: mostRecentChangeRecord.change,
      changePercent: mostRecentChangeRecord.changePercent,
      source: mostRecentChangeRecord.source || 'unknown',
      lastUpdated: mostRecentChangeRecord.lastUpdated
    } : 'None');
    
    // If we didn't find a specific change record, look for any record
    const mostRecentAnyRecord = !mostRecentChangeRecord ? await prisma.metalPrice.findFirst({
      where: {
        metal: 'aluminum'
      },
      orderBy: [
        { lastUpdated: 'desc' },
        { createdAt: 'desc' }
      ]
    }) : null;
    
    if (mostRecentAnyRecord) {
      console.log('Falling back to most recent record (any source):', {
        id: mostRecentAnyRecord.id,
        spotPrice: mostRecentAnyRecord.spotPrice,
        change: mostRecentAnyRecord.change,
        changePercent: mostRecentAnyRecord.changePercent,
        source: mostRecentAnyRecord.source || 'unknown',
        lastUpdated: mostRecentAnyRecord.lastUpdated
      });
    }
    
    // Use whichever record we found
    const mostRecentEntry = mostRecentChangeRecord || mostRecentAnyRecord;
    
    // Default change values
    let change = 0;
    let changePercent = 0;
    
    // Priority order for change values:
    // 1. Request values (if provided)
    // 2. Most recent database values (if available)
    // 3. Default values (0)
    
    // Get change value
    if (requestChange !== undefined && !isNaN(Number(requestChange))) {
      change = Number(requestChange);
      console.log(`Using change from request: ${change}`);
    } else if (mostRecentEntry) {
      change = Number(mostRecentEntry.change);
      console.log(`Using change from most recent entry: ${change}`);
    } else {
      console.log('No previous entry found, using default change value: 0');
    }
    
    // Get changePercent value
    if (requestChangePercent !== undefined && !isNaN(Number(requestChangePercent))) {
      changePercent = Number(requestChangePercent);
      console.log(`Using changePercent from request: ${changePercent}`);
    } else if (mostRecentEntry) {
      changePercent = Number(mostRecentEntry.changePercent);
      console.log(`Using changePercent from most recent entry: ${changePercent}%`);
    } else {
      console.log('No previous entry found, using default changePercent value: 0');
    }
    
    // Calculate spot price: 3-month price + change
    const calculatedSpotPrice = formattedThreeMonthPrice + change;
    
    console.log(`Calculating spot price: ${formattedThreeMonthPrice} (3-month price) + ${change} (change) = ${calculatedSpotPrice}`);
    
    // Check if this exact price already exists for today (to prevent duplicates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingRecord = await prisma.metalPrice.findFirst({
      where: {
        metal: 'aluminum',
        source: 'spot-price-update', // Only look for records created by this source
        spotPrice: {
          equals: calculatedSpotPrice
        },
        change: {
          equals: change
        },
        lastUpdated: {
          gte: today
        }
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });
    
    if (existingRecord) {
      console.log('Similar record found - price already exists for today with same change value. Updating timestamp.');
      
      // Update timestamp of existing record instead of creating duplicate
      const updatedRecord = await prisma.metalPrice.update({
        where: { id: existingRecord.id },
        data: { lastUpdated: formattedDate }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Updated timestamp of existing price record',
        data: {
          id: updatedRecord.id,
          spotPrice: Number(updatedRecord.spotPrice),
          change: Number(updatedRecord.change),
          changePercent: Number(updatedRecord.changePercent),
          lastUpdated: updatedRecord.lastUpdated,
          source: updatedRecord.source || 'spot-price-update'
        }
      });
    }
    
    // Save new record to database
    const newRecord = await prisma.metalPrice.create({
      data: {
        metal: 'aluminum',
        spotPrice: calculatedSpotPrice,
        change: change,
        changePercent: changePercent,
        lastUpdated: formattedDate,
        source: 'spot-price-update' // Mark the source of this record
      }
    });
    
    console.log(`Added new price record: ${calculatedSpotPrice}, using change: ${change}, timestamp: ${formattedDate}`);
    
    // Return success response with both 3-month and spot prices
    return res.status(201).json({
      success: true,
      message: 'Spot price saved to database',
      data: {
        id: newRecord.id,
        threeMonthPrice: formattedThreeMonthPrice,
        spotPrice: Number(newRecord.spotPrice),
        change: Number(newRecord.change),
        changePercent: Number(newRecord.changePercent),
        lastUpdated: newRecord.lastUpdated,
        source: newRecord.source || 'spot-price-update'
      }
    });
  } catch (error) {
    console.error('Error saving spot price to database:', error);
    
    // Return error response
    return res.status(500).json({
      success: false,
      message: 'Failed to save spot price to database',
      error: String(error)
    });
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
} 