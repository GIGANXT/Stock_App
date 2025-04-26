import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Set cache control headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Route handler based on method and action parameter
    if (req.method === 'GET') {
      // Check if this is a scheduler request
      if (req.query.action === 'scheduler') {
        return await handleSchedulerRequest(req, res);
      }
      
      // Check if we have a cache-busting parameter
      if (req.query._t !== undefined) {
        // If we have a cache-busting parameter, recalculate the data
        await calculateAndStoreLMECashSettlement();
      }
      
      // Standard GET request - retrieve LME cash settlements
      const lmeCashData = await (prisma as any).lMECashSettlement.findMany({
        orderBy: {
          date: 'desc'
        }
      });
      
      return res.status(200).json({
        success: true,
        data: lmeCashData
      });
    } else if (req.method === 'POST') {
      // Check if this is a specific data update
      if (req.query.action === 'update-lme-west') {
        return await handleLmeWestUpdate(req, res);
      } else if (req.query.action === 'update-rbi-rate') {
        return await handleRbiRateUpdate(req, res);
      }
      
      // Check if this is a data update notification
      if (req.body?.source === 'rbi_update' || req.body?.source === 'lme_west_update') {
        // Process the new data
        await processNewData(req.body.source);
        
        return res.status(200).json({
          success: true,
          message: `Processed new ${req.body.source} data and updated LME cash settlement if applicable`
        });
      } else {
        // Standard manual calculation
        await calculateAndStoreLMECashSettlement();
        
        return res.status(200).json({
          success: true,
          message: 'LME cash settlement calculated and stored successfully'
        });
      }
    } else if (req.method === 'PUT' && req.query.action === 'check-and-update') {
      // Check for new data in both tables and process if available
      const result = await checkForNewDataAndProcess();
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.processed ? { processed: true } : { processed: false }
      });
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Handle LME West Metal Price updates
 */
async function handleLmeWestUpdate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Extract data from request body
  const { date, price } = req.body;
  
  if (!date || !price) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: date, price'
    });
  }
  
  // Validate price
  const priceValue = parseFloat(price);
  if (isNaN(priceValue)) {
    return res.status(400).json({
      success: false,
      error: 'Price must be a valid number'
    });
  }
  
  // Create or update LME West Metal Price record
  const lmeWestRecord = await (prisma as any).lME_West_Metal_Price.upsert({
    where: {
      date: date
    },
    update: {
      Price: priceValue
    },
    create: {
      date: date,
      Price: priceValue
    }
  });
  
  // Process the update immediately
  await processNewData('lme_west_update');
  
  return res.status(200).json({
    success: true,
    message: 'LME West Metal Price updated successfully and calculation triggered',
    data: {
      lmeWestRecord
    }
  });
}

/**
 * Handle RBI Rate updates
 */
async function handleRbiRateUpdate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Extract data from request body
  const { date, rate } = req.body;
  
  if (!date || !rate) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: date, rate'
    });
  }
  
  // Validate rate
  const rateValue = parseFloat(rate);
  if (isNaN(rateValue)) {
    return res.status(400).json({
      success: false,
      error: 'Rate must be a valid number'
    });
  }
  
  // Create or update RBI Rate record
  const rbiRateRecord = await (prisma as any).rBI_Rate.upsert({
    where: {
      date: date
    },
    update: {
      rate: rateValue
    },
    create: {
      date: date,
      rate: rateValue
    }
  });
  
  // Process the update immediately
  await processNewData('rbi_update');
  
  return res.status(200).json({
    success: true,
    message: 'RBI Rate updated successfully and calculation triggered',
    data: {
      rbiRateRecord
    }
  });
}

/**
 * Handle scheduler requests
 */
async function handleSchedulerRequest(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Security check - verify API key
  const correctKey = process.env.SCHEDULER_KEY || 'scheduler-secret-key';
  const apiKey = req.headers['x-api-key'] || req.query.key;
  
  if (!apiKey || apiKey !== correctKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key'
    });
  }
  
  // Check for new data and process if available
  const result = await checkForNewDataAndProcess();
  
  return res.status(200).json({
    success: true,
    message: result.message || 'Scheduler check completed',
    data: result.processed ? { processed: true } : { processed: false }
  });
}

/**
 * Processes new data that has been added to one of the source tables
 */
async function processNewData(source: string) {
  // Get the latest data from both tables
  const latestLmeWest = await (prisma as any).lME_West_Metal_Price.findFirst({
    orderBy: {
      date: 'desc'
    }
  });
  
  const latestRbi = await (prisma as any).rBI_Rate.findFirst({
    orderBy: {
      date: 'desc'
    }
  });
  
  if (!latestLmeWest || !latestRbi) {
    console.log('Missing latest data from one of the tables, calculation skipped');
    return;
  }
  
  // Extract date part only from the LME West date (ignoring time)
  const lmeWestDateOnly = latestLmeWest.date.split('T')[0];
  
  // Check if we have already processed this combination of data
  const existingCalculation = await (prisma as any).lMECashSettlement.findFirst({
    where: {
      date: {
        startsWith: lmeWestDateOnly
      }
    }
  });
  
  if (existingCalculation) {
    console.log('Calculation for the latest data already exists, no update needed');
    return;
  }
  
  // We have new data in both tables that hasn't been processed yet, calculate
  await calculateAndStoreLMECashSettlement();
}

/**
 * Checks for new data in both source tables and processes it if available
 */
async function checkForNewDataAndProcess() {
  // Get the latest processed date from LMECashSettlement
  const latestProcessed = await (prisma as any).lMECashSettlement.findFirst({
    orderBy: {
      date: 'desc'
    },
    select: {
      date: true
    }
  });
  
  // Get the latest available LME West Metal Price
  const latestLmeWest = await (prisma as any).lME_West_Metal_Price.findFirst({
    orderBy: {
      date: 'desc'
    },
    select: {
      date: true
    }
  });
  
  if (!latestLmeWest) {
    return { processed: false, message: 'No LME West Metal Price data available' };
  }
  
  // Compare dates to see if we have new data to process - use only the date part
  const processedDateOnly = latestProcessed ? latestProcessed.date.split('T')[0] : null;
  const lmeWestDateOnly = latestLmeWest.date.split('T')[0];
  
  if (!latestProcessed || processedDateOnly !== lmeWestDateOnly) {
    // We have new data that hasn't been processed yet
    await calculateAndStoreLMECashSettlement();
    return { processed: true, message: 'New data detected and processed' };
  }
  
  return { processed: false, message: 'No new data to process' };
}

async function calculateAndStoreLMECashSettlement() {
  // Get all LME West Metal Price records ordered by date
  const lmeWestPrices = await (prisma as any).lME_West_Metal_Price.findMany({
    orderBy: {
      date: 'desc'
    }
  });

  if (lmeWestPrices.length < 2) {
    throw new Error('Insufficient data: Need at least two LME West Metal Price records');
  }

  // Get all RBI rate records ordered by date
  const rbiRates = await (prisma as any).rBI_Rate.findMany({
    orderBy: {
      date: 'desc'
    }
  });

  if (rbiRates.length < 2) {
    throw new Error('Insufficient data: Need at least two RBI Rate records');
  }

  // Latest data (today) - based on date only
  const price_today = lmeWestPrices[0].Price;
  const today_date_full = lmeWestPrices[0].date;
  const today_date_only = today_date_full.split('T')[0];
  
  // Find the latest RBI rate by date match (ignoring time)
  const rbi_today_record = rbiRates.find((rate: any) => 
    rate.date.startsWith(today_date_only)
  ) || rbiRates[0]; // fallback to newest if exact match not found
  
  const rbi_today = rbi_today_record.rate;

  // Previous data (yesterday) - find the previous date record
  const yesterday_lme_record = lmeWestPrices.find((_: any, index: number) => index === 1);
  const price_yesterday = yesterday_lme_record.Price;
  const yesterday_date_only = yesterday_lme_record.date.split('T')[0];
  
  // Find the RBI rate for yesterday by date match
  const rbi_yesterday_record = rbiRates.find((rate: any) => 
    rate.date.startsWith(yesterday_date_only)
  ) || rbiRates[1]; // fallback to second newest if exact match not found
  
  const rbi_yesterday = rbi_yesterday_record.rate;

  // Calculate differences
  // Dollar Difference = price_today - price_yesterday
  const dollarDifference = price_today - price_yesterday;

  // INR Difference = (price_today × RBI_today × 1.0825) - (price_yesterday × RBI_yesterday × 1.0825)
  const inrDifference = (price_today * rbi_today * 1.0825) - (price_yesterday * rbi_yesterday * 1.0825);

  // Check if record for this date already exists (using date part only)
  const existingRecord = await (prisma as any).lMECashSettlement.findFirst({
    where: {
      date: {
        startsWith: today_date_only
      }
    }
  });

  if (existingRecord) {
    // Update existing record
    return await (prisma as any).lMECashSettlement.update({
      where: {
        id: existingRecord.id
      },
      data: {
        price: price_today,
        Dollar_Difference: dollarDifference,
        INR_Difference: inrDifference
      }
    });
  } else {
    // Create new record
    return await (prisma as any).lMECashSettlement.create({
      data: {
        date: today_date_full, // Keep the original date format
        price: price_today,
        Dollar_Difference: dollarDifference,
        INR_Difference: inrDifference
      }
    });
  }
}
