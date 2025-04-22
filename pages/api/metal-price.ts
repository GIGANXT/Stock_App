import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PriceData {
  spot_price: number;
  price_change: number;
  change_percentage: number;
  last_updated: string;
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
    
    const data: PriceData = await response.json();
    const lastUpdatedDate = new Date(data.last_updated);
    
    // Check if we already have a record with this timestamp AND price
    const existingRecord = await prisma.metalPrice.findFirst({
      where: {
        metal: 'aluminum',
        lastUpdated: lastUpdatedDate,
        spotPrice: data.spot_price
      }
    });
    
    let isNewRecord = false;
    
    // Only create a new record if one doesn't exist with this timestamp and price
    if (!existingRecord) {
      await prisma.metalPrice.create({
        data: {
          metal: 'aluminum',
          spotPrice: data.spot_price,
          change: data.price_change,
          changePercent: data.change_percentage,
          lastUpdated: lastUpdatedDate
        }
      });
      console.log(`New price record created: ${data.spot_price} at ${data.last_updated}`);
      isNewRecord = true;
    } else {
      console.log(`Skipped duplicate record: ${data.spot_price} at ${data.last_updated}`);
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
      spotPrice: data.spot_price,
      change: data.price_change,
      changePercent: data.change_percentage,
      lastUpdated: data.last_updated
    };
    
    res.status(200).json(transformedData);
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
