import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ApiResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

// Define database record types for better type safety
interface LMEWestMetalPrice {
  id: number;
  date: string;
  Price: number;
}

interface RBIRate {
  id: number;
  date: string;
  rate: number;
}

interface LMECashSettlement {
  id: number;
  date: string;
  price: number;
  Dollar_Difference: number;
  INR_Difference: number;
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
      const lmeCashData = await prisma.$queryRaw<LMECashSettlement[]>`
        SELECT * FROM "LMECashSettlement"
        ORDER BY date DESC
      `;
      
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
  const lmeWestRecord = await prisma.$queryRaw<LMEWestMetalPrice[]>`
    INSERT INTO "LME_West_Metal_Price" ("date", "Price")
    VALUES (${date}, ${priceValue})
    ON CONFLICT ("date") DO UPDATE
    SET "Price" = ${priceValue}
    RETURNING *
  `;
  
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
  const rbiRateRecord = await prisma.$queryRaw<RBIRate[]>`
    INSERT INTO "RBI_Rate" ("date", "rate")
    VALUES (${date}, ${rateValue})
    ON CONFLICT ("date") DO UPDATE
    SET "rate" = ${rateValue}
    RETURNING *
  `;
  
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
  const latestLmeWest = await prisma.$queryRaw<LMEWestMetalPrice[]>`
    SELECT * FROM "LME_West_Metal_Price"
    ORDER BY date DESC
    LIMIT 1
  `;
  
  const latestRbi = await prisma.$queryRaw<RBIRate[]>`
    SELECT * FROM "RBI_Rate"
    ORDER BY date DESC
    LIMIT 1
  `;
  
  if (!latestLmeWest[0] || !latestRbi[0]) {
    console.log('Missing latest data from one of the tables, calculation skipped');
    return;
  }
  
  // Extract date part only from the LME West date (ignoring time)
  const lmeWestDateOnly = latestLmeWest[0].date.split('T')[0];
  
  // Check if we have already processed this combination of data
  const existingCalculation = await prisma.$queryRaw<LMECashSettlement[]>`
    SELECT * FROM "LMECashSettlement"
    WHERE date::text LIKE ${lmeWestDateOnly + '%'}
    LIMIT 1
  `;
  
  if (existingCalculation[0]) {
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
  const latestProcessed = await prisma.$queryRaw<{date: string}[]>`
    SELECT date FROM "LMECashSettlement"
    ORDER BY date DESC
    LIMIT 1
  `;
  
  // Get the latest available LME West Metal Price
  const latestLmeWest = await prisma.$queryRaw<{date: string}[]>`
    SELECT date FROM "LME_West_Metal_Price"
    ORDER BY date DESC
    LIMIT 1
  `;
  
  if (!latestLmeWest[0]) {
    return { processed: false, message: 'No LME West Metal Price data available' };
  }
  
  // Compare dates to see if we have new data to process - use only the date part
  const processedDateOnly = latestProcessed[0] ? latestProcessed[0].date.split('T')[0] : null;
  const lmeWestDateOnly = latestLmeWest[0].date.split('T')[0];
  
  if (!latestProcessed[0] || processedDateOnly !== lmeWestDateOnly) {
    // We have new data that hasn't been processed yet
    await calculateAndStoreLMECashSettlement();
    return { processed: true, message: 'New data detected and processed' };
  }
  
  return { processed: false, message: 'No new data to process' };
}

async function calculateAndStoreLMECashSettlement() {
  // Get all LME West Metal Price records ordered by date
  const lmeWestPrices = await prisma.$queryRaw<LMEWestMetalPrice[]>`
    SELECT * FROM "LME_West_Metal_Price"
    ORDER BY date DESC
  `;

  if (lmeWestPrices.length < 2) {
    throw new Error('Insufficient data: Need at least two LME West Metal Price records');
  }

  // Get all RBI rate records ordered by date
  const rbiRates = await prisma.$queryRaw<RBIRate[]>`
    SELECT * FROM "RBI_Rate"
    ORDER BY date DESC
  `;

  if (rbiRates.length < 2) {
    throw new Error('Insufficient data: Need at least two RBI Rate records');
  }

  // Latest data (today) - based on date only
  const today_record = lmeWestPrices[0];
  const price_today = today_record.Price;
  const today_date_full = today_record.date;
  const today_date_only = today_date_full.split('T')[0];
  
  // Find the latest RBI rate by date match (ignoring time)
  // If exact match not found, use the most recent available rate
  const rbi_today_record = rbiRates.find((rate) => 
    rate.date.startsWith(today_date_only)
  ) || rbiRates[0]; // fallback to newest if exact match not found
  
  const rbi_today = rbi_today_record.rate;

  // Find the most recent previous LME record (not today)
  // Skip the first record (today's) and find the first previous record
  let previous_lme_record = null;
  
  // Convert today's date to a Date object for comparison
  const todayDate = new Date(today_date_only);
  
  // Find the most recent record that's before today
  for (let i = 1; i < lmeWestPrices.length; i++) {
    const recordDate = new Date(lmeWestPrices[i].date.split('T')[0]);
    if (recordDate < todayDate) {
      previous_lme_record = lmeWestPrices[i];
      break;
    }
  }
  
  if (!previous_lme_record) {
    throw new Error('Could not find a previous LME West Metal Price record');
  }
  
  const price_previous = previous_lme_record.Price;
  const previous_date_only = previous_lme_record.date.split('T')[0];
  
  console.log(`Using previous LME record from ${previous_date_only} as comparison to ${today_date_only}`);
  
  // Find the RBI rate for the previous LME date (exact match)
  let rbi_previous_record = rbiRates.find((rate) => 
    rate.date.startsWith(previous_date_only)
  );
  
  // If no exact match for previous date, find the most recent RBI rate before or on that date
  if (!rbi_previous_record) {
    // Convert previous LME date to a Date object for comparison
    const previousLmeDate = new Date(previous_date_only);
    
    // Sort RBI rates by date (newest to oldest)
    const sortedRbiRates = [...rbiRates].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Find the most recent RBI rate that's on or before the previous LME date
    for (const rate of sortedRbiRates) {
      const rbiDate = new Date(rate.date.split('T')[0]);
      if (rbiDate <= previousLmeDate) {
        rbi_previous_record = rate;
        console.log(`Using nearest previous RBI rate from ${rate.date.split('T')[0]} for LME date ${previous_date_only}`);
        break;
      }
    }
  }
  
  if (!rbi_previous_record) {
    throw new Error('Could not find a suitable previous RBI rate');
  }
  
  const rbi_previous = rbi_previous_record.rate;

  // Calculate differences
  // Dollar Difference = price_today - price_previous
  const dollarDifference = price_today - price_previous;

  // INR Difference = (price_today × RBI_today × 1.0825) - (price_previous × rbi_previous × 1.0825)
  const inrDifference = (price_today * rbi_today * 1.0825) - (price_previous * rbi_previous * 1.0825);

  // Check if record for this date already exists (using date part only)
  const existingRecord = await prisma.$queryRaw<LMECashSettlement[]>`
    SELECT * FROM "LMECashSettlement"
    WHERE date::text LIKE ${today_date_only + '%'}
    LIMIT 1
  `;

  if (existingRecord[0]) {
    // Update existing record
    return await prisma.$queryRaw<LMECashSettlement[]>`
      UPDATE "LMECashSettlement"
      SET 
        "price" = ${price_today},
        "Dollar_Difference" = ${dollarDifference},
        "INR_Difference" = ${inrDifference}
      WHERE id = ${existingRecord[0].id}
      RETURNING *
    `;
  } else {
    // Create new record
    return await prisma.$queryRaw<LMECashSettlement[]>`
      INSERT INTO "LMECashSettlement" ("date", "price", "Dollar_Difference", "INR_Difference")
      VALUES (${today_date_full}, ${price_today}, ${dollarDifference}, ${inrDifference})
      RETURNING *
    `;
  }
}
