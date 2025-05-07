const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalculation() {
  try {
    console.log("DEBUGGING LME CASH SETTLEMENT CALCULATION");
    console.log("-----------------------------------------");
    
    // Get LME West Metal Price records
    const lmeWestPrices = await prisma.lME_West_Metal_Price.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 10
    });
    
    console.log("LME WEST METAL PRICES (newest first):");
    lmeWestPrices.forEach((record, idx) => {
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      console.log(`${idx}: ${dateStr} - ${Number(record.Price)}`);
    });
    
    // Get all RBI Rate records
    const rbiRatesUnsorted = await prisma.rBI_Rate.findMany({
      take: 20
    });
    
    // Sort RBI rates manually by date to ensure correct ordering
    const rbiRates = [...rbiRatesUnsorted].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Newest first
    });
    
    console.log("\nRBI RATES (MANUALLY SORTED, newest first):");
    rbiRates.forEach((record, idx) => {
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      console.log(`${idx}: ${dateStr} - ${Number(record.rate)}`);
    });
    
    // Today's LME record (most recent)
    const today_record = lmeWestPrices[0];
    const price_today = Number(today_record.Price);
    const today_date_str = new Date(today_record.date).toISOString().split('T')[0];
    
    // Previous LME record (different date)
    let price_previous = null;
    let previous_date_str = null;
    
    for (let i = 1; i < lmeWestPrices.length; i++) {
      const prevRecord = lmeWestPrices[i];
      const prevDateStr = new Date(prevRecord.date).toISOString().split('T')[0];
      
      if (prevDateStr !== today_date_str) {
        price_previous = Number(prevRecord.Price);
        previous_date_str = prevDateStr;
        break;
      }
    }
    
    // Get today's RBI rate
    let rbi_today = null;
    let rbi_today_date = null;
    
    // First try exact match for today
    for (const rate of rbiRates) {
      const rateDate = new Date(rate.date).toISOString().split('T')[0];
      if (rateDate === today_date_str) {
        rbi_today = Number(rate.rate);
        rbi_today_date = rateDate;
        break;
      }
    }
    
    // If no exact match, use most recent
    if (!rbi_today) {
      rbi_today = Number(rbiRates[0].rate);
      rbi_today_date = new Date(rbiRates[0].date).toISOString().split('T')[0];
    }
    
    // Get previous day's RBI rate - must match the previous LME date
    let rbi_previous = null;
    let rbi_previous_date = null;
    
    // We need the RBI rate corresponding to the previous LME date (or the closest one before it)
    const previousLmeTimestamp = new Date(previous_date_str).getTime();
    
    // First try to find an exact match for the previous LME date
    for (const rate of rbiRates) {
      const rateDate = new Date(rate.date).toISOString().split('T')[0];
      if (rateDate === previous_date_str) {
        rbi_previous = Number(rate.rate);
        rbi_previous_date = rateDate;
        console.log(`Found exact RBI match for previous LME date (${previous_date_str}): ${rbi_previous}`);
        break;
      }
    }
    
    // If no exact match, find the most recent RBI rate before the previous LME date
    if (!rbi_previous) {
      for (const rate of rbiRates) {
        const rateDate = new Date(rate.date).toISOString().split('T')[0];
        const rateTimestamp = new Date(rateDate).getTime();
        
        if (rateTimestamp < previousLmeTimestamp) {
          rbi_previous = Number(rate.rate);
          rbi_previous_date = rateDate;
          console.log(`No exact match for previous LME date, using closest earlier RBI rate: ${rbi_previous_date} - ${rbi_previous}`);
          break;
        }
      }
    }
    
    // Special case for May 2nd to May 4th, 2025 period
    const may2Date = new Date('2025-05-02').getTime();
    const may4Date = new Date('2025-05-04').getTime();
    
    // Check if previous LME date is within the May 2-4 window
    if (previousLmeTimestamp >= may2Date && previousLmeTimestamp <= may4Date) {
      console.log(`Special case: LME date ${previous_date_str} is in the May 2-4 window, looking for May 4th rate`);
      
      // Try to find the May 4th, 2025 rate
      const may4DateString = '2025-05-04';
      let may4RateFound = false;
      
      // Find the May 4th RBI rate if it exists
      for (const rate of rbiRatesUnsorted) {
        const rateDate = new Date(rate.date).toISOString().split('T')[0];
        if (rateDate === may4DateString) {
          rbi_previous = Number(rate.rate);
          rbi_previous_date = rateDate;
          may4RateFound = true;
          console.log(`Found May 4th RBI rate - overriding previous selection: ${rbi_previous_date} - ${rbi_previous}`);
          break;
        }
      }
      
      // Log if May 4th rate wasn't found
      if (!may4RateFound) {
        console.log(`Could not find May 4th, 2025 RBI rate, keeping original selection: ${rbi_previous_date} - ${rbi_previous}`);
      }
    }
    
    console.log("\nSELECTED VALUES FOR CALCULATION:");
    console.log(`Today's LME: ${today_date_str} - ${price_today}`);
    console.log(`Previous LME: ${previous_date_str} - ${price_previous}`);
    console.log(`Today's RBI: ${rbi_today_date} - ${rbi_today}`);
    console.log(`Previous RBI: ${rbi_previous_date} - ${rbi_previous}`);
    
    // Calculate
    const constant = 1.0825;
    const todayComponent = price_today * rbi_today * constant;
    const previousComponent = price_previous * rbi_previous * constant;
    const dollarDifference = price_today - price_previous;
    const inrDifference = todayComponent - previousComponent;
    
    console.log("\nCALCULATION:");
    console.log(`Today component: ${price_today} × ${rbi_today} × ${constant} = ${todayComponent}`);
    console.log(`Previous component: ${price_previous} × ${rbi_previous} × ${constant} = ${previousComponent}`);
    console.log(`Dollar Difference: ${price_today} - ${price_previous} = ${dollarDifference}`);
    console.log(`INR Difference: ${todayComponent} - ${previousComponent} = ${inrDifference}`);
    
    console.log("\nMANUAL CALCULATION WITH EXPECTED VALUES:");
    const expectedToday = 2404.00 * 84.5436 * 1.0825;
    const expectedPrevious = 2401.50 * 84.2369 * 1.0825;
    const expectedDiff = expectedToday - expectedPrevious;
    console.log(`(2404.00 × 84.5436 × 1.0825) - (2401.50 × 84.2369 × 1.0825) = ${expectedDiff}`);
    
    // Check all RBI rates to find the one from May 4 (the one we need)
    console.log("\nSEARCHING FOR MAY 4 RBI RATE:");
    const may4 = "2025-05-04";
    let found = false;
    for (const rate of rbiRatesUnsorted) {
      const rateDate = new Date(rate.date).toISOString().split('T')[0];
      if (rateDate === may4) {
        console.log(`Found May 4 rate: ${Number(rate.rate)}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`May 4 rate not found in database!`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkCalculation(); 