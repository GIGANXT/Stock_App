import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

// Define a type for the extended PrismaClient that includes our custom models
type ExtendedPrismaClient = PrismaClient & {
  lME_West_Metal_Price: {
    upsert: (params: {
      where: { date: string };
      update: { Price: number };
      create: { date: string; Price: number };
    }) => Promise<{ id: number; date: string; Price: number; createdAt: Date }>;
  };
};

const prisma = new PrismaClient() as ExtendedPrismaClient;

// Define interfaces for different response formats
interface PriceData {
  spot_price: number;
  price_change: number;
  change_percentage: number;
  last_updated: string;
}

// New interface for cash settlement format
interface CashSettlementData {
  cashSettlement: number;
  dateTime: string;
}

// Cache control headers to prevent browser caching
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Function to clean up old records, keeping only the most recent ones
async function cleanupOldRecords(metal: string, keepCount = 1000) {
  try {
    // Get total count for this metal
    const totalCount = await prisma.metalPrice.count({
      where: { metal }
    });
    
    // Only perform cleanup if we have more records than we want to keep
    if (totalCount <= keepCount) {
      return;
    }
    
    console.log(`Cleaning up ${metal} price records (keeping ${keepCount} of ${totalCount})`);
    
    // Get IDs of records to keep
    const recordsToKeep = await prisma.metalPrice.findMany({
      where: { metal },
      orderBy: [
        { lastUpdated: 'desc' },
        { createdAt: 'desc' }
      ],
      take: keepCount,
      select: { id: true }
    });
    
    const keepIds = recordsToKeep.map(record => record.id);
    
    // Delete records not in the keep list
    const deleteResult = await prisma.metalPrice.deleteMany({
      where: {
        metal,
        id: { notIn: keepIds }
      }
    });
    
    console.log(`Deleted ${deleteResult.count} old ${metal} price records`);
  } catch (error) {
    console.error('Error during cleanup process:', error);
  }
}

// Function to deduplicate records - more aggressive approach
async function removeDuplicateRecords(metal: string) {
  try {
    // Get all timestamps for this metal
    const records = await prisma.metalPrice.findMany({
      where: { metal },
      select: {
        id: true,
        lastUpdated: true,
        spotPrice: true,
        change: true,
        changePercent: true,
        createdAt: true
      },
      orderBy: [
        { lastUpdated: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    
    // Track timestamps and values we've seen
    const seen = new Map();
    const duplicateIds = [];
    
    for (const record of records) {
      // Create a composite key of timestamp and price
      const timestamp = record.lastUpdated.toISOString();
      const key = `${timestamp}_${record.spotPrice}`;
      
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        duplicateIds.push(record.id);
      } else {
        // First time seeing this timestamp+price combination
        seen.set(key, true);
      }
    }
    
    if (duplicateIds.length > 0) {
      // Delete all duplicates
      const deleteResult = await prisma.metalPrice.deleteMany({
        where: {
          id: { in: duplicateIds }
        }
      });
      
      console.log(`Deleted ${deleteResult.count} duplicate ${metal} price records`);
    }
  } catch (error) {
    console.error('Error removing duplicate records:', error);
  }
}

// Function to save cash settlement data to LME_West_Metal_Price table
async function saveLmeWestMetalPrice(price: number, dateTime: string): Promise<boolean> {
  try {
    // Format the date string properly
    const date = new Date(dateTime).toISOString();
    
    // Save to LME_West_Metal_Price table using upsert to avoid duplicates
    await prisma.lME_West_Metal_Price.upsert({
      where: {
        date: date
      },
      update: {
        Price: price
      },
      create: {
        date: date,
        Price: price
      }
    });
    
    console.log(`Saved cash settlement data: ${price} at ${dateTime}`);
    
    // Trigger LME cash settlement calculation
    try {
      const calculationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/lmecashcal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'lme_west_update'
        })
      });
      
      if (calculationResponse.ok) {
        console.log('LME cash settlement calculation triggered successfully');
      } else {
        console.warn('LME cash settlement calculation trigger failed:', 
          await calculationResponse.text());
      }
    } catch (error) {
      console.error('Error triggering LME cash settlement calculation:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving cash settlement data:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set cache control headers to prevent browser caching
  res.setHeader('Cache-Control', noCacheHeaders['Cache-Control']);
  res.setHeader('Pragma', noCacheHeaders['Pragma']);
  res.setHeader('Expires', noCacheHeaders['Expires']);
  
  // Check if this is a cleanup request
  if (req.query.forcecleanup === 'true') {
    try {
      const metal = req.query.metal as string || 'aluminum';
      await removeDuplicateRecords(metal);
      await cleanupOldRecords(metal, 100);
      return res.status(200).json({ success: true, message: 'Cleanup completed' });
    } catch (error) {
      console.error('Forced cleanup error:', error);
      return res.status(500).json({ error: 'Cleanup failed' });
    } finally {
      await prisma.$disconnect();
      return;
    }
  }
  
  // Check if this is a history request
  const { history, metal = 'aluminum', limit = 30 } = req.query;
  
  if (history === 'true') {
    // Handle history request
    try {
      // Get historical price data for the specified metal
      const priceHistory = await prisma.metalPrice.findMany({
        where: {
          metal: metal as string
        },
        orderBy: [
          { lastUpdated: 'desc' },
          { createdAt: 'desc' }
        ],
        take: Number(limit)
      });
      
      // Transform decimal values to numbers for JSON response
      const formattedHistory = priceHistory.map(record => ({
        id: record.id,
        metal: record.metal,
        spotPrice: Number(record.spotPrice),
        change: Number(record.change),
        changePercent: Number(record.changePercent),
        lastUpdated: record.lastUpdated.toISOString(),
        createdAt: record.createdAt.toISOString()
      }));
      
      res.status(200).json(formattedHistory);
    } catch (error) {
      console.error('Error retrieving price history:', error);
      res.status(500).json({ 
        error: "Internal server error", 
        message: "Failed to retrieve price history" 
      });
    } finally {
      await prisma.$disconnect();
      return;
    }
  }
  
  // Handle current price request
  try {
    // Use the backend server URL
    const backendUrl = process.env.BACKEND_URL || 'http://148.135.138.22:3232';
    const response = await fetch(`${backendUrl}/api/price-data`, {
      // Add cache-busting parameter to prevent server-side caching
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch price data from backend: ${response.status} ${response.statusText}`);
    }
    
    const rawData = await response.json();
    
    // Check which format the response is in
    if ('is_cash_settlement' in rawData) {
      // New data format with is_cash_settlement flag
      if (rawData.is_cash_settlement === true && rawData.cash_settlement !== null) {
        // Handle cash settlement data
        await saveLmeWestMetalPrice(rawData.cash_settlement, rawData.last_updated);
        
        return res.status(200).json({
          type: 'cashSettlement',
          cashSettlement: rawData.cash_settlement,
          dateTime: rawData.last_updated
        });
      } else if (rawData.spot_price !== null) {
        // Handle spot price data when available
        const lastUpdatedDate = new Date(rawData.last_updated);
        
        // Check if we already have a record with this timestamp AND price
        const existingRecord = await prisma.metalPrice.findFirst({
          where: {
            metal: 'aluminum',
            lastUpdated: lastUpdatedDate,
            ...(rawData.spot_price !== null && { spotPrice: rawData.spot_price })
          }
        });
        
        let isNewRecord = false;
        
        // Only create a new record if one doesn't exist with this timestamp and price
        if (!existingRecord && rawData.spot_price !== null) {
          await prisma.metalPrice.create({
            data: {
              metal: 'aluminum',
              spotPrice: rawData.spot_price,
              change: rawData.price_change || 0,
              changePercent: rawData.change_percentage || 0,
              lastUpdated: lastUpdatedDate
            }
          });
          console.log(`New price record created: ${rawData.spot_price} at ${rawData.last_updated}`);
          isNewRecord = true;
        } else {
          console.log(`Skipped duplicate or null record at ${rawData.last_updated}`);
        }
        
        // Run cleanup process as before
        if (isNewRecord && (Math.random() < 0.1 || req.query.cleanup === 'true')) {
          Promise.all([
            removeDuplicateRecords('aluminum'),
            cleanupOldRecords('aluminum', 100)
          ]).catch(err => console.error('Background cleanup failed:', err));
        }
        
        return res.status(200).json({
          type: 'spotPrice',
          spotPrice: rawData.spot_price,
          change: rawData.price_change || 0,
          changePercent: rawData.change_percentage || 0,
          lastUpdated: rawData.last_updated
        });
      } else {
        // Handle case when both spot_price and cash_settlement are null
        console.log('Received data with null values:', JSON.stringify(rawData));
        
        // Try to get the latest price data from the database
        const latestPrice = await prisma.metalPrice.findFirst({
          where: { metal: 'aluminum' },
          orderBy: [
            { lastUpdated: 'desc' },
            { createdAt: 'desc' }
          ]
        });
        
        if (latestPrice) {
          return res.status(200).json({
            type: 'spotPrice',
            spotPrice: Number(latestPrice.spotPrice),
            change: Number(latestPrice.change),
            changePercent: Number(latestPrice.changePercent),
            lastUpdated: latestPrice.lastUpdated.toISOString()
          });
        } else {
          return res.status(200).json({
            type: 'noData',
            message: 'No price data available'
          });
        }
      }
    } else if ('cashSettlement' in rawData && 'dateTime' in rawData) {
      // Handle original cash settlement format
      const cashData = rawData as CashSettlementData;
      
      // Save to LME_West_Metal_Price table
      await saveLmeWestMetalPrice(cashData.cashSettlement, cashData.dateTime);
      
      // Return the data immediately to the frontend
      return res.status(200).json({
        type: 'cashSettlement',
        cashSettlement: cashData.cashSettlement,
        dateTime: cashData.dateTime
      });
    } else if ('spot_price' in rawData && 'price_change' in rawData) {
      // Handle regular price data format
      const data = rawData as PriceData;
      const lastUpdatedDate = new Date(data.last_updated);
      
      // Adjust spotPrice calculation: spotPrice = spotPrice - (-change)
      // Only apply this calculation if change is negative
      const adjustedSpotPrice = data.price_change < 0 ? 
        data.spot_price - (-data.price_change) : 
        data.spot_price;
      
      // Check if we already have a record with this timestamp AND price
      const existingRecord = await prisma.metalPrice.findFirst({
        where: {
          metal: 'aluminum',
          lastUpdated: lastUpdatedDate,
          ...(adjustedSpotPrice !== null && { spotPrice: adjustedSpotPrice })
        }
      });
      
      let isNewRecord = false;
      
      // Only create a new record if one doesn't exist with this timestamp and price
      if (!existingRecord) {
        // Skip creation if spotPrice is null
        if (adjustedSpotPrice !== null) {
          await prisma.metalPrice.create({
            data: {
              metal: 'aluminum',
              spotPrice: adjustedSpotPrice,
              change: data.price_change,
              changePercent: data.change_percentage,
              lastUpdated: lastUpdatedDate
            }
          });
          console.log(`New price record created: ${adjustedSpotPrice} at ${data.last_updated}`);
          isNewRecord = true;
        } else {
          console.log(`Skipped record creation due to null spotPrice at ${data.last_updated}`);
        }
      } else {
        console.log(`Skipped duplicate record: ${adjustedSpotPrice} at ${data.last_updated}`);
      }
      
      // If we created a new record, run cleanup process periodically
      // Randomly decide to run cleanup (1 in 10 chance) or if forced by query param
      if (isNewRecord && (Math.random() < 0.1 || req.query.cleanup === 'true')) {
        // Run the cleanup process but don't await it since the user doesn't need to wait for it
        Promise.all([
          removeDuplicateRecords('aluminum'),
          cleanupOldRecords('aluminum', 100)
        ]).catch(err => console.error('Background cleanup failed:', err));
      }
      
      // Transform the data to match the frontend's expected format
      const transformedData = {
        type: 'spotPrice',
        spotPrice: adjustedSpotPrice,
        change: data.price_change,
        changePercent: data.change_percentage,
        lastUpdated: data.last_updated
      };
      
      return res.status(200).json(transformedData);
    } else {
      // Unknown format
      throw new Error(`Unknown data format received from backend: ${JSON.stringify(rawData)}`);
    }
  } catch (error) {
    console.error('Error fetching or storing price data:', error);
    
    // Try to get the latest price data from the database
    try {
      const latestPrice = await prisma.metalPrice.findFirst({
        where: { metal: 'aluminum' },
        orderBy: [
          { lastUpdated: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      if (latestPrice) {
        const dbData = {
          type: 'spotPrice',
          spotPrice: Number(latestPrice.spotPrice),
          change: Number(latestPrice.change),
          changePercent: Number(latestPrice.changePercent),
          lastUpdated: latestPrice.lastUpdated.toISOString()
        };
        
        return res.status(200).json(dbData);
      }
    } catch (dbError) {
      console.error('Error retrieving data from database:', dbError);
    }
    
    // If no database data is available, return an error status
    res.status(503).json({ 
      error: "Service temporarily unavailable", 
      message: "No price data available at this time" 
    });
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
} 
