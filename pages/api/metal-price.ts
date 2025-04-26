import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define interfaces for different response formats
interface PriceData {
  spot_price: number;
  price_change: number;
  change_percentage: number;
  last_updated: string;
}

// New interface for average price data
interface AveragePriceData {
  averagePrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  dataPointsCount: number;
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

// Function to calculate daily average price for today
async function calculateDailyAverage(metal: string): Promise<AveragePriceData | null> {
  try {
    // Get today's date at start of day in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find all records for today
    const todayRecords = await prisma.metalPrice.findMany({
      where: {
        metal,
        lastUpdated: {
          gte: today
        }
      },
      orderBy: {
        lastUpdated: 'asc'
      }
    });

    // If no records found for today, return null
    if (todayRecords.length === 0) {
      console.log('No records found for average calculation, returning null');
      return null;
    }

    // Calculate average price from database records
    const totalPrice = todayRecords.reduce((sum, record) => sum + Number(record.spotPrice), 0);
    const averagePrice = totalPrice / todayRecords.length;

    // Get the first and most recent price to calculate change
    const firstPrice = Number(todayRecords[0].spotPrice);
    const latestRecord = todayRecords[todayRecords.length - 1];
    const latestPrice = Number(latestRecord.spotPrice);
    
    // Calculate change and change percent from first price of the day
    const change = latestPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;

    return {
      averagePrice,
      change,
      changePercent,
      lastUpdated: latestRecord.lastUpdated.toISOString(),
      dataPointsCount: todayRecords.length
    };
  } catch (error) {
    console.error('Error calculating daily average:', error);
    return null;
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
  const { history, metal = 'aluminum', limit = 30, forceMetalPrice = false, returnAverage = false } = req.query;
  
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
      
      // Return error if no history data
      if (priceHistory.length === 0) {
        return res.status(404).json({
          type: 'noData',
          error: 'No price history available in database',
          message: 'No price history data found'
        });
      }
      
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

  // If forceMetalPrice is true, directly return data from the MetalPrice table
  if (forceMetalPrice === 'true') {
    try {
      console.log(`Handling forceMetalPrice=true request for ${metal}`);
      
      // Check if we should bypass the database cache
      const bypassCache = req.query._t !== undefined;
      
      if (!bypassCache) {
        // Try to get from the database only
        const latestPrice = await prisma.metalPrice.findFirst({
          where: { metal: metal as string },
          orderBy: [
            { lastUpdated: 'desc' },
            { createdAt: 'desc' }
          ]
        });
        
        if (latestPrice) {
          console.log(`Returning existing data from database: id=${latestPrice.id}, price=${latestPrice.spotPrice}, time=${latestPrice.lastUpdated}`);
          return res.status(200).json({
            type: 'spotPrice',
            spotPrice: Number(latestPrice.spotPrice),
            change: Number(latestPrice.change),
            changePercent: Number(latestPrice.changePercent),
            lastUpdated: latestPrice.lastUpdated.toISOString()
          });
        }
      }
      
      // If we're bypassing the cache or there's no data in the database, try to fetch from the external API
      try {
        // Attempt to fetch fresh data from external source
        const backendUrl = process.env.BACKEND_URL || 'http://148.135.138.22:3232';
        const externalResponse = await fetch(`${backendUrl}/api/price-data`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (externalResponse.ok) {
          const externalData = await externalResponse.json();
          
          // Check for different response formats and handle accordingly
          let spotPrice, change, changePercent, lastUpdated;
          let isCashSettlement = false;
          
          if (externalData.spot_price !== null) {
            // Format from spot price data
            spotPrice = externalData.spot_price;
            change = externalData.price_change || 0;
            changePercent = externalData.change_percentage || 0;
            lastUpdated = externalData.last_updated;
            isCashSettlement = false;
          } else if (externalData.cash_settlement !== null || externalData.is_cash_settlement === true) {
            // Format from cash settlement data
            spotPrice = externalData.cash_settlement;
            change = 0;  // No change data in cash settlement response
            changePercent = 0;
            lastUpdated = externalData.last_updated;
            isCashSettlement = true;
          } else {
            // No usable data
            throw new Error('No valid price data in response');
          }
          
          // Only save to Metal_Price table if it's not cash settlement data
          if (!isCashSettlement) {
            // Save the fresh data to the database
            await prisma.metalPrice.create({
              data: {
                metal: metal as string,
                spotPrice: spotPrice,
                change: change,
                changePercent: changePercent,
                lastUpdated: new Date(lastUpdated || new Date())
              }
            });
          }
          
          // Return the fresh data
          return res.status(200).json({
            type: 'spotPrice',
            spotPrice: Number(spotPrice),
            change: Number(change),
            changePercent: Number(changePercent),
            lastUpdated: lastUpdated || new Date().toISOString(),
            fresh: true,
            isCashSettlement: isCashSettlement
          });
        }
      } catch (externalError) {
        console.error('Error fetching from external API:', externalError);
      }
      
      // No data in database, return error
      console.log('No data available for spot price');
      return res.status(404).json({
        type: 'noData',
        error: 'No data available',
        message: 'No price data found'
      });
    } catch (error) {
      console.error('Error fetching metal price data:', error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve metal price data"
      });
    } finally {
      await prisma.$disconnect();
      return;
    }
  }
  
  // If returnAverage is true, calculate and return the daily average
  if (returnAverage === 'true') {
    try {
      const averageData = await calculateDailyAverage(metal as string);
      
      if (averageData) {
        return res.status(200).json({
          type: 'averagePrice',
          spotPrice: averageData.averagePrice,
          change: averageData.change,
          changePercent: averageData.changePercent,
          lastUpdated: averageData.lastUpdated,
          dataPointsCount: averageData.dataPointsCount
        });
      } else {
        // No average data available, return error
        console.log('No average data available in database');
        return res.status(404).json({
          type: 'noData',
          error: 'No average data available in database',
          message: 'No daily price records found to calculate average'
        });
      }
    } catch (error) {
      console.error('Error fetching average price data:', error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to calculate average price"
      });
    } finally {
      await prisma.$disconnect();
      return;
    }
  }
  
  // For regular spot price request, get only from database
  try {
    console.log('Fetching spot price data from database only');
    
    // Get the latest price data from the database
    const latestPrice = await prisma.metalPrice.findFirst({
      where: { metal: 'aluminum' },
      orderBy: [
        { lastUpdated: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    if (latestPrice) {
      console.log(`Using existing data from database: ${latestPrice.spotPrice} at ${latestPrice.lastUpdated}`);
      return res.status(200).json({
        type: 'spotPrice',
        spotPrice: Number(latestPrice.spotPrice),
        change: Number(latestPrice.change),
        changePercent: Number(latestPrice.changePercent),
        lastUpdated: latestPrice.lastUpdated.toISOString()
      });
    } else {
      // No data in database, return error
      console.log('No price data available in database');
      return res.status(404).json({
        type: 'noData',
        error: 'No data available in database',
        message: 'No price data found in database'
      });
    }
  } catch (error) {
    console.error('Error fetching price data from database:', error);
    
    // Return an error status
    res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to retrieve price data from database" 
    });
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
} 
