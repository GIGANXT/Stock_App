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
    console.log("Beginning LME cash settlement calculation...");
    
    // Get all LME West Metal Price records ordered by date (newest first)
    const lmeWestPrices = await prisma.lME_West_Metal_Price.findMany({
      orderBy: {
        date: 'desc'
      }
    });

    if (lmeWestPrices.length < 2) {
      throw new Error('Insufficient data: Need at least two LME West Metal Price records');
    }

    // Get all RBI rate records ordered by date (newest first)
    const rbiRates = await prisma.rBI_Rate.findMany({
      orderBy: {
        date: 'desc'
      }
    });

    if (rbiRates.length < 2) {
      throw new Error('Insufficient data: Need at least two RBI Rate records');
    }
    
    console.log("--------------- AVAILABLE DATA ---------------");
    
    // Debug output of all available data points
    console.log("LME WEST METAL PRICES:");
    lmeWestPrices.forEach((record, idx) => {
      const dateStr = new Date(record.date.toString()).toISOString().split('T')[0];
      console.log(`${idx}: ${dateStr} - ${Number(record.Price)}`);
    });
    
    console.log("\nRBI RATES:");
    rbiRates.forEach((record, idx) => {
      const dateStr = new Date(record.date.toString()).toISOString().split('T')[0];
      console.log(`${idx}: ${dateStr} - ${Number(record.rate)}`);
    });
    
    // Step 1: Get the latest LME West Metal Price (today)
    const today_record = lmeWestPrices[0];
    const price_today = Number(today_record.Price);
    const today_date_full = today_record.date;
    const today_date_str = new Date(today_date_full.toString()).toISOString().split('T')[0];
    
    console.log("\n--------------- TODAY'S DATA ---------------");
    console.log(`Today's LME date: ${today_date_str}`);
    console.log(`Today's LME price: ${price_today}`);

    // Step 2: Get the next most recent LME West Metal Price (previous)
    // Make sure it's actually a different date than today
    let price_previous = null;
    let previous_date_str = null;
    
    for (let i = 1; i < lmeWestPrices.length; i++) {
      const prevRecord = lmeWestPrices[i];
      const prevDateStr = new Date(prevRecord.date.toString()).toISOString().split('T')[0];
      
      if (prevDateStr !== today_date_str) {
        price_previous = Number(prevRecord.Price);
        previous_date_str = prevDateStr;
        console.log(`Previous LME date: ${previous_date_str}`);
        console.log(`Previous LME price: ${price_previous}`);
        break;
      }
    }
    
    if (!price_previous) {
      throw new Error('Could not find a previous LME West Metal Price record with a different date');
    }

    // Step 3: Get the latest RBI rate for today
    let rbi_today = null;
    let rbi_today_date = null;
    
    // First try exact match for today
    for (const rate of rbiRates) {
      const rateDate = new Date(rate.date.toString()).toISOString().split('T')[0];
      if (rateDate === today_date_str) {
        rbi_today = Number(rate.rate);
        rbi_today_date = rateDate;
        console.log(`Found exact RBI match for today (${today_date_str}): ${rbi_today}`);
        break;
      }
    }
    
    // If no exact match, use the most recent available
    if (!rbi_today) {
      rbi_today = Number(rbiRates[0].rate);
      rbi_today_date = new Date(rbiRates[0].date.toString()).toISOString().split('T')[0];
      console.log(`No exact RBI match for today, using most recent: ${rbi_today_date} - ${rbi_today}`);
    }
    
    // Step 4: Get the RBI rate for the previous day
    let rbi_previous = null;
    let rbi_previous_date = null;
    
    // Find the last RBI rate before today's date
    const todayDate = new Date(today_date_str);
    for (const rate of rbiRates) {
      const rateDate = new Date(rate.date.toString()).toISOString().split('T')[0];
      const rateDateObj = new Date(rateDate);
      
      if (rateDateObj < todayDate) {
        rbi_previous = Number(rate.rate);
        rbi_previous_date = rateDate;
        console.log(`Found previous day RBI rate: ${rbi_previous_date} - ${rbi_previous}`);
        break;
      }
    }
    
    if (!rbi_previous) {
      throw new Error('Could not find a previous RBI rate');
    }
    
    console.log("\n--------------- CALCULATION ---------------");
    
    // Dollar Difference = price_today - price_previous
    const dollarDifference = price_today - price_previous;
    console.log(`Dollar Difference: ${price_today} - ${price_previous} = ${dollarDifference}`);

    // INR Difference = (price_today × RBI_today × 1.0825) - (price_previous × rbi_previous × 1.0825)
    const constant = 1.0825;
    const todayComponent = price_today * rbi_today * constant;
    const previousComponent = price_previous * rbi_previous * constant;
    const inrDifference = todayComponent - previousComponent;
    
    console.log(`INR Difference calculation:`);
    console.log(`  Today component: ${price_today} × ${rbi_today} × ${constant} = ${todayComponent}`);
    console.log(`  Previous component: ${price_previous} × ${rbi_previous} × ${constant} = ${previousComponent}`);
    console.log(`  Difference: ${todayComponent} - ${previousComponent} = ${inrDifference}`);

    // For verification purposes, calculate with the exact values you provided
    const manualCalculation = (2404.00 * 84.5436 * 1.0825) - (2401.50 * 84.2369 * 1.0825);
    console.log(`\nExpected calculation using fixed values:`);
    console.log(`  (2404.00 × 84.5436 × 1.0825) - (2401.50 × 84.2369 × 1.0825) = ${manualCalculation}`);
    
    // Check if record for this date already exists
    const existingRecord = await prisma.lMECashSettlement.findFirst({
      where: {
        date: {
          startsWith: today_date_str
        }
      }
    });

    // Prepare the complete calculation details
    const calculationDetails = {
      todayDate: today_date_str,
      previousDate: previous_date_str,
      rbiToday: {
        date: rbi_today_date,
        rate: rbi_today
      },
      rbiPrevious: {
        date: rbi_previous_date,
        rate: rbi_previous
      },
      lmeToday: {
        date: today_date_str,
        price: price_today
      },
      lmePrevious: {
        date: previous_date_str,
        price: price_previous
      },
      calculation: {
        constant: constant,
        todayComponent,
        previousComponent,
        dollarDifference,
        inrDifference
      },
      manualCalculation
    };
    
    console.log("\n--------------- SUMMARY ---------------");
    console.log(JSON.stringify(calculationDetails, null, 2));

    if (existingRecord) {
      // Update existing record
      console.log(`Updating existing LME cash settlement record for ${today_date_str}`);
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
      console.log(`Creating new LME cash settlement record for ${today_date_str}`);
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
