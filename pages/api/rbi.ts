import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

// Create a singleton Prisma client instance
const prisma = new PrismaClient();

type ExchangeRate = {
  date: string;
  rate: string;
};

type ApiResponse = {
  success?: boolean;
  data?: ExchangeRate[];
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Check if this is a background refresh request from a scheduler/cron job
    const isBackgroundUpdate = req.query.backgroundUpdate === 'true';
    
    // If it's a background update, fetch from the external API and store in DB
    if (isBackgroundUpdate) {
      await fetchAndStoreExternalData();
      return res.status(200).json({ 
        success: true,
        message: "Background update completed"
      });
    }
    
    // For frontend requests, only retrieve from database
    const latestRates = await prisma.rBI_Rate.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 10 // Get the latest 10 records
    });
    
    if (latestRates && latestRates.length > 0) {
      const data = latestRates.map(rate => ({
        date: rate.date,
        rate: rate.rate.toString()
      }));
      
      return res.status(200).json({ success: true, data });
    } else {
      // If no data in database, return an appropriate message
      return res.status(404).json({ 
        success: false,
        error: "No RBI rate data available in database"
      });
    }
  } catch (error: unknown) {
    console.error("Error in RBI API:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    await prisma.$disconnect();
  }
}

// Separate function to fetch and store data from external API
async function fetchAndStoreExternalData() {
  try {
    console.log("Fetching from external RBI API");
    const response = await fetch("http://148.135.138.22:5000/scrape");
    const apiResponse = await response.json();

    if (!response.ok) {
      throw new Error(apiResponse.error || "Failed to fetch data from external API");
    }
    
    const data = apiResponse.data;
    
    // Store the data in the database
    if (data && data.length > 0) {
      console.log("Storing RBI rates in database");
      
      // Process each entry and add to database
      for (const entry of data) {
        const rate = parseFloat(entry.rate);
        
        // Check if record already exists for this date
        const existingRecord = await prisma.rBI_Rate.findUnique({
          where: {
            date: entry.date
          }
        });
        
        if (existingRecord) {
          // Update the existing record if needed
          await prisma.rBI_Rate.update({
            where: {
              date: entry.date
            },
            data: {
              rate: rate
            }
          });
          console.log(`Updated RBI rate for ${entry.date}`);
        } else {
          // Create a new record
          await prisma.rBI_Rate.create({
            data: {
              date: entry.date,
              rate: rate
            }
          });
          console.log(`Added new RBI rate for ${entry.date}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error fetching/storing external data:", error);
    return false;
  }
}
