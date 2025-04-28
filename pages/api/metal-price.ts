import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Response interface for properly typed API responses
interface ApiResponse {
  type: 'spotPrice' | 'averagePrice' | 'noData';
  spotPrice?: number;
  change?: number;
  changePercent?: number;
  lastUpdated?: string;
  fresh?: boolean;
  source?: string;
  dataPointsCount?: number;
  error?: string;
  message?: string;
}

// New interface for average price data
interface AveragePriceData {
  averagePrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  dataPointsCount: number;
}

// Properly typed cache for API responses
interface CacheData {
  data: (ApiResponse & { metal?: string }) | null;
  timestamp: number;
  ttl: number;
}

// Cache for API responses to reduce database load
let responseCache: CacheData = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes cache TTL
};

// Function to check if data is stale and needs refresh
function isDataStale(lastUpdated: Date): boolean {
  const now = new Date();
  const lastUpdateTime = new Date(lastUpdated);
  
  // Consider data stale if it's more than 6 hours old
  const sixHoursInMs = 6 * 60 * 60 * 1000;
  return now.getTime() - lastUpdateTime.getTime() > sixHoursInMs;
}

// Interface for external API response data
interface ExternalApiData {
  spot_price?: number | null;
  price_change?: number;
  change_percentage?: number;
  last_updated?: string;
  cash_settlement?: number | null;
  is_cash_settlement?: boolean;
}

// Service function to fetch data from external API
async function fetchExternalPriceData(): Promise<ExternalApiData> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://148.135.138.22:3232';
    const response = await fetch(`${backendUrl}/api/price-data`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`External API returned status ${response.status}`);
    }
    
    const data: ExternalApiData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from external API:', error);
    throw error;
  }
}

// Interface for processed API data
interface ProcessedApiData {
  spotPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  isCashSettlement: boolean;
}

// Service function to process external API data into our format
function processExternalData(externalData: ExternalApiData): ProcessedApiData {
  if (externalData.spot_price !== null && externalData.spot_price !== undefined) {
    // Format from spot price data
    return {
      spotPrice: externalData.spot_price,
      change: externalData.price_change || 0,
      changePercent: externalData.change_percentage || 0,
      lastUpdated: externalData.last_updated || new Date().toISOString(),
      isCashSettlement: false
    };
  } else if (
    (externalData.cash_settlement !== null && externalData.cash_settlement !== undefined) || 
    externalData.is_cash_settlement === true
  ) {
    // Format from cash settlement data
    return {
      spotPrice: externalData.cash_settlement || 0,
      change: 0,  // No change data in cash settlement response
      changePercent: 0,
      lastUpdated: externalData.last_updated || new Date().toISOString(),
      isCashSettlement: true
    };
  } else {
    throw new Error('No valid price data in response');
  }
}

// Type definition for database record with support for Prisma Decimal type
interface DbRecord {
  id: string;
  metal: string;
  spotPrice: unknown; // Using unknown instead of any for Prisma Decimal
  change: unknown;    // Using unknown instead of any for Prisma Decimal
  changePercent: unknown; // Using unknown instead of any for Prisma Decimal
  lastUpdated: Date;
  createdAt: Date;
}

// Function to save price data to database with improved error handling
async function savePriceToDatabase(
  metal: string,
  spotPrice: number,
  change: number,
  changePercent: number,
  lastUpdated: Date
): Promise<DbRecord> {
  try {
    // Check if this data already exists in the database
    const existingRecord = await prisma.metalPrice.findFirst({
      where: {
        metal,
        lastUpdated
      }
    });
    
    if (existingRecord) {
      console.log('Record with same timestamp already exists');
      return existingRecord;
    }
    
    // Create new record
    const newRecord = await prisma.metalPrice.create({
      data: {
        metal,
        spotPrice,
        change,
        changePercent,
        lastUpdated
      }
    });
    
    console.log(`Added new price record to database: ${metal}, ${spotPrice}, ${lastUpdated}`);
    return newRecord;
  } catch (error) {
    console.error('Error saving price to database:', error);
    throw error;
  }
}

// Function to get latest price with auto-refresh when stale
async function getLatestPriceWithRefresh(metal: string, forceRefresh: boolean = false): Promise<ApiResponse> {
  try {
    // First get from database
    const latestPrice = await prisma.metalPrice.findFirst({
      where: { metal },
      orderBy: [
        { lastUpdated: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    // If no data in database or data is stale or force refresh requested
    if (!latestPrice || isDataStale(latestPrice.lastUpdated) || forceRefresh) {
      if (!latestPrice) {
        console.log('No data in database, fetching from external API');
      } else if (isDataStale(latestPrice.lastUpdated)) {
        console.log('Data is stale, fetching fresh data from API');
      } else {
        console.log('Force refresh requested, fetching from API');
      }
      
      try {
        // Get fresh data from external API
        const externalData = await fetchExternalPriceData();
        const { spotPrice, change, changePercent, lastUpdated, isCashSettlement } = processExternalData(externalData);
        
        if (!isCashSettlement && process.env.ALLOW_API_TO_DATABASE === 'true') {
          // Save to database if it's not cash settlement data
          const formattedDate = new Date(lastUpdated || new Date());
          
          // Save asynchronously to not block response
          savePriceToDatabase(metal, spotPrice, change, changePercent, formattedDate)
            .then(() => console.log('Successfully saved new price data to database'))
            .catch(err => console.error('Error in async database save:', err));
          
          // Return the fresh data immediately
          return {
            type: 'spotPrice',
            spotPrice: Number(spotPrice),
            change: Number(change),
            changePercent: Number(changePercent),
            lastUpdated: formattedDate.toISOString(),
            fresh: true
          };
        }
      } catch (apiError) {
        console.error('External API error:', apiError);
        // If external API fails, fall back to database
        if (latestPrice) {
          console.log('Falling back to database data after API error');
        } else {
          throw new Error('No data available in database and external API failed');
        }
      }
    }
    
    // If we reach here, return database data
    if (latestPrice) {
      return {
        type: 'spotPrice',
        spotPrice: Number(latestPrice.spotPrice),
        change: Number(latestPrice.change),
        changePercent: Number(latestPrice.changePercent),
        lastUpdated: latestPrice.lastUpdated.toISOString()
      };
    } else {
      throw new Error('No price data available');
    }
  } catch (error) {
    console.error('Error getting price data:', error);
    throw error;
  }
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
  
  // Check if this is a database update request - only allow POST method
  if (req.query.updateDatabase === 'true') {
    // Only allow POST requests for database updates
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', message: 'Only POST requests are allowed for database updates' });
    }
    
    // IMPORTANT: Add authentication here
    // This is a simplified check - implement proper authentication in production
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_UPDATE_KEY) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Valid API key required for database updates' });
    }
    
    try {
      // Get metal from body or query param, with proper type handling
      let metalParam = req.body.metal || 'aluminum';
      if (!metalParam && req.query.metal) {
        metalParam = Array.isArray(req.query.metal) ? req.query.metal[0] : req.query.metal as string;
      }
      
      const { spotPrice, change, changePercent, lastUpdated } = req.body;
      
      if (!spotPrice) {
        return res.status(400).json({ error: 'Bad request', message: 'spotPrice is required' });
      }
      
      // Format date from string or use current date
      const formattedDate = lastUpdated ? new Date(lastUpdated) : new Date();
      
      // Check if this data already exists to prevent duplicates
      const existingRecord = await prisma.metalPrice.findFirst({
        where: {
          metal: metalParam,
          lastUpdated: formattedDate
        }
      });
      
      if (existingRecord) {
        console.log('Record with same timestamp already exists, skipping');
        return res.status(200).json({ 
          success: false, 
          message: 'Duplicate record with same timestamp exists',
          existingRecord: {
            id: existingRecord.id,
            spotPrice: Number(existingRecord.spotPrice),
            lastUpdated: existingRecord.lastUpdated.toISOString()
          }
        });
      }
      
      // Save new record to database
      const newRecord = await prisma.metalPrice.create({
        data: {
          metal: metalParam,
          spotPrice: Number(spotPrice),
          change: Number(change || 0),
          changePercent: Number(changePercent || 0),
          lastUpdated: formattedDate
        }
      });
      
      console.log(`Added new price record: ${metalParam}, ${spotPrice}, ${formattedDate}`);
      
      return res.status(201).json({
        success: true,
        message: 'Price data added to database',
        record: {
          id: newRecord.id,
          metal: newRecord.metal,
          spotPrice: Number(newRecord.spotPrice),
          change: Number(newRecord.change),
          changePercent: Number(newRecord.changePercent),
          lastUpdated: newRecord.lastUpdated.toISOString(),
          createdAt: newRecord.createdAt.toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating database:', error);
      return res.status(500).json({ error: 'Internal server error', message: 'Failed to update database' });
    } finally {
      await prisma.$disconnect();
      return;
    }
  }
  
  // Check if this is a cleanup request
  if (req.query.forcecleanup === 'true') {
    try {
      // Convert metal parameter to string, handling arrays
      const metalParam = req.query.metal ? 
        (Array.isArray(req.query.metal) ? req.query.metal[0] : req.query.metal as string) : 
        'aluminum';
      
      await removeDuplicateRecords(metalParam);
      await cleanupOldRecords(metalParam, 100);
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
      // Convert metal parameter to string, handling arrays
      const metalParam = Array.isArray(metal) ? metal[0] : metal as string;
      
      // Get historical price data for the specified metal
      const priceHistory = await prisma.metalPrice.findMany({
        where: {
          metal: metalParam
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
      // Convert metal parameter to string, handling arrays
      const metalParam = Array.isArray(metal) ? metal[0] : metal as string;
      
      console.log(`Handling forceMetalPrice=true request for ${metalParam}`);
      
      // Check if we should bypass cache entirely
      const bypassCache = req.query._t !== undefined;
      
      // Check in-memory cache first to reduce database load
      const now = Date.now();
      if (!bypassCache && 
          responseCache.data && 
          responseCache.data.metal === metalParam && 
          now - responseCache.timestamp < responseCache.ttl) {
        console.log('Returning cached response');
        return res.status(200).json(responseCache.data);
      }
      
      // Get latest price with automatic refresh when data is stale
      try {
        const priceData = await getLatestPriceWithRefresh(metalParam, bypassCache);
        
        // Update cache
        responseCache = {
          data: { ...priceData, metal: metalParam },
          timestamp: now,
          ttl: responseCache.ttl
        };
        
        return res.status(200).json(priceData);
      } catch (error) {
        console.error('Error getting price data:', error);
        return res.status(404).json({
          type: 'noData',
          error: 'No data available',
          message: 'No price data found'
        });
      }
    } catch (error) {
      console.error('Error handling forceMetalPrice request:', error);
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
      // Convert metal parameter to string, handling arrays
      const metalParam = Array.isArray(metal) ? metal[0] : metal as string;
      
      const averageData = await calculateDailyAverage(metalParam);
      
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
    console.log('Fetching spot price data from database');
    
    // Convert metal parameter to string, handling arrays
    const metalParam = Array.isArray(metal) ? metal[0] : metal as string;
    
    try {
      // Use the same function but don't force refresh
      const priceData = await getLatestPriceWithRefresh(metalParam, false);
      return res.status(200).json(priceData);
    } catch (error) {
      console.error('Error retrieving price data:', error);
      
      // No data in database, return error
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
