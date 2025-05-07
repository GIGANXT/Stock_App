import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ApiResponse {
  success: boolean;
  data?: unknown;
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
      
      // Standard GET request - retrieve LME cash settlements using Prisma client
      const lmeCashData = await prisma.lMECashSettlement.findMany({
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
        await processNewData();
        
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
  const lmeWestRecord = await prisma.lME_West_Metal_Price.upsert({
    where: {
      date: date
    },
    update: {
      Price: priceValue
    },
    create: {
      date: date,
      Price: priceValue
    },
    select: {
      id: true,
      date: true,
      Price: true
    }
  });
  
  // Process the update immediately
  await processNewData();
  
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
  const rbiRateRecord = await prisma.rBI_Rate.upsert({
    where: {
      date: date
    },
    update: {
      rate: rateValue
    },
    create: {
      date: date,
      rate: rateValue
    },
    select: {
      id: true,
      date: true,
      rate: true
    }
  });
  
  // Process the update immediately
  await processNewData();
  
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
async function processNewData() {
  // Get the latest data from both tables
  const latestLmeWest = await prisma.lME_West_Metal_Price.findFirst({
    orderBy: {
      date: 'desc'
    }
  });
  
  const latestRbi = await prisma.rBI_Rate.findFirst({
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
  const existingCalculation = await prisma.lMECashSettlement.findFirst({
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
  const latestProcessed = await prisma.lMECashSettlement.findFirst({
    orderBy: {
      date: 'desc'
    },
    select: {
      date: true
    }
  });
  
  // Get the latest available LME West Metal Price
  const latestLmeWest = await prisma.lME_West_Metal_Price.findFirst({
    orderBy: {
      date: 'desc'
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
  try {
  // Get all LME West Metal Price records ordered by date
    const lmeWestPrices = await prisma.lME_West_Metal_Price.findMany({
      orderBy: {
        date: 'desc'
      }
    });

  if (lmeWestPrices.length < 2) {
    throw new Error('Insufficient data: Need at least two LME West Metal Price records');
  }

  // Get all RBI rate records ordered by date
    const rbiRates = await prisma.rBI_Rate.findMany({
      orderBy: {
        date: 'desc'
      }
    });

  if (rbiRates.length < 2) {
    throw new Error('Insufficient data: Need at least two RBI Rate records');
  }

    // Latest data (today)
  const today_record = lmeWestPrices[0];
    const price_today = Number(today_record.Price);
  const today_date_full = today_record.date;
    const today_date_only = today_date_full.toString().split('T')[0];
  
  // Find the latest RBI rate by date match (ignoring time)
    // If exact match not found, use the most recent available rate
  const rbi_today_record = rbiRates.find((rate) => 
      rate.date.toString().startsWith(today_date_only)
  ) || rbiRates[0]; // fallback to newest if exact match not found
  
    const rbi_today = Number(rbi_today_record.rate);

    // Find the most recent previous LME record (not today)
    // Skip the first record (today's) and find the first previous record
  let previous_lme_record = null;
    
    // Convert today's date to a Date object for comparison
    const todayDate = new Date(today_date_only);
    
    // Find the most recent record that's before today
  for (let i = 1; i < lmeWestPrices.length; i++) {
      const recordDate = new Date(lmeWestPrices[i].date.toString().split('T')[0]);
      if (recordDate < todayDate) {
    previous_lme_record = lmeWestPrices[i];
        break;
      }
  }
  
  if (!previous_lme_record) {
    throw new Error('Could not find a previous LME West Metal Price record');
  }
  
    const price_previous = Number(previous_lme_record.Price);
    const previous_date_only = previous_lme_record.date.toString().split('T')[0];
    const previousLmeDate = new Date(previous_date_only);
  
  console.log(`Using previous LME record from ${previous_date_only} as comparison to ${today_date_only}`);
  
    // COMPLETELY REVISED LOGIC:
    // 1. Log all available RBI rates for debugging
    console.log("Available RBI rates (date → rate):");
    rbiRates.forEach(rate => {
      const dateStr = rate.date.toString().split('T')[0];
      console.log(`${dateStr} → ${rate.rate}`);
    });
    
    // 2. Format dates consistently and prepare for comparison
    const todayTimestamp = new Date(today_date_only).getTime();
    const prevLmeTimestamp = previousLmeDate.getTime();
    
    // Find the day before today (logical "yesterday")
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayTimestamp = todayTimestamp - oneDayMs;
    const yesterdayDate = new Date(yesterdayTimestamp);
    const yesterdayString = yesterdayDate.toISOString().split('T')[0];
    
    console.log(`Today: ${today_date_only}, Yesterday: ${yesterdayString}, Previous LME date: ${previous_date_only}`);
    
    // 3. First try to find exact match for yesterday
    let rbi_previous_record = null;
    
    // Try to find the RBI rate for yesterday first
    rbi_previous_record = rbiRates.find(rate => {
      const rbiDateStr = rate.date.toString().split('T')[0];
      return rbiDateStr === yesterdayString;
    });
    
    // If we found yesterday's rate, use it
    if (rbi_previous_record) {
      console.log(`Found exact RBI rate for yesterday (${yesterdayString}): ${rbi_previous_record.rate}`);
    } 
    // Otherwise, find the most recent rate before today
    else {
      console.log(`No RBI rate found for yesterday (${yesterdayString}), finding most recent rate before today`);
      
      // Convert all dates to timestamps for consistent comparison
      const sortedRates = [...rbiRates].map(rate => {
        const dateStr = rate.date.toString().split('T')[0];
        return {
          rate: rate,
          timestamp: new Date(dateStr).getTime(),
          dateStr: dateStr
        };
      }).sort((a, b) => b.timestamp - a.timestamp); // Sort newest to oldest
      
      // Find the most recent rate before today
      for (const rateInfo of sortedRates) {
        if (rateInfo.timestamp < todayTimestamp) {
          rbi_previous_record = rateInfo.rate;
          console.log(`Using most recent RBI rate before today: ${rateInfo.dateStr} → ${rbi_previous_record.rate}`);
          break;
        }
      }
    }
    
    if (!rbi_previous_record) {
      throw new Error('Could not find a suitable previous RBI rate');
    }
    
    const rbi_previous = Number(rbi_previous_record.rate);
    console.log(`Today's values: LME price ${price_today}, RBI rate ${rbi_today} (date: ${today_date_only})`);
    console.log(`Previous values: LME price ${price_previous}, RBI rate ${rbi_previous} (date: ${rbi_previous_record.date.toString().split('T')[0]})`);

  // Calculate differences
  // Dollar Difference = price_today - price_previous
  const dollarDifference = price_today - price_previous;

  // INR Difference = (price_today × RBI_today × 1.0825) - (price_previous × rbi_previous × 1.0825)
  const todayComponent = price_today * rbi_today * 1.0825;
  const previousComponent = price_previous * rbi_previous * 1.0825;
  const inrDifference = todayComponent - previousComponent;
  
  console.log(`INR Difference calculation details:
    - Today's component: ${price_today} × ${rbi_today} × 1.0825 = ${todayComponent}
    - Previous component: ${price_previous} × ${rbi_previous} × 1.0825 = ${previousComponent}
    - Difference: ${todayComponent} - ${previousComponent} = ${inrDifference}`);

  // Check if record for this date already exists (using date part only)
    const existingRecord = await prisma.lMECashSettlement.findFirst({
      where: {
        date: {
          startsWith: today_date_only
        }
      }
    });

    if (existingRecord) {
    // Update existing record
      console.log(`Updating existing LME cash settlement record for ${today_date_only}`);
      return await prisma.lMECashSettlement.update({
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
      console.log(`Creating new LME cash settlement record for ${today_date_only}`);
      return await prisma.lMECashSettlement.create({
        data: {
          date: today_date_full.toString(),
          price: price_today,
          Dollar_Difference: dollarDifference,
          INR_Difference: inrDifference
        }
      });
    }
  } catch (error) {
    console.error('Error in calculateAndStoreLMECashSettlement:', error);
    throw error;
  }
}
