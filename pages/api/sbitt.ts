import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

// Create a singleton Prisma client instance
const prisma = new PrismaClient();

// Define response types
type ApiResponse = {
  success: boolean;
  data?: {
    sbi_tt_sell: string;
    sbi_tt_buy: string | null;
    timestamp: string;
  }[];
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
    
    // If it's a background update, fetch from external API and store in DB
    if (isBackgroundUpdate) {
      const success = await fetchAndStoreExternalData();
      return res.status(200).json({ 
        success: success,
        message: success ? "Background update completed" : "Background update failed"
      });
    }
    
    // For frontend requests, only retrieve from database
    const latestRates = await prisma.sBITTRate.findMany({
      orderBy: {
        date: 'desc',
      },
      take: 5 // Get the latest 5 records
    });
    
    if (latestRates && latestRates.length > 0) {
      console.log("SBI TT Rate from DB:", latestRates[0]);
      
      const data = latestRates.map(rate => ({
        sbi_tt_sell: rate.rate.toString(),
        sbi_tt_buy: null,
        timestamp: rate.date.toISOString()
      }));
      
      return res.status(200).json({ 
        success: true, 
        data 
      });
    } else {
      // If no data in database, return an appropriate message
      return res.status(404).json({ 
        success: false,
        error: "No SBI TT rate data available in database"
      });
    }
  } catch (error: unknown) {
    console.error("🚨 Error in SBI TT API:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Separate function to fetch and store data from external API
async function fetchAndStoreExternalData(): Promise<boolean> {
  try {
    console.log("Fetching from external SBI TT API");
    
      // Create an AbortController with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Fetch from Flask API
      const response = await fetch("http://148.135.138.22:5001/scrape-sbi-tt", {
        signal: controller.signal
      });

      // Clear the timeout
      clearTimeout(timeoutId);

    // Read raw response
      const text = await response.text();

    // Debugging log
      console.log("🔍 Raw response from Flask:", text);

    // Try parsing JSON
        const parsedData = JSON.parse(text);
        
    // Check if API response is OK
        if (!response.ok) {
          throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }
        
    const data = parsedData.data;
        
    // Store the data in the database
        if (data && data.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const rate = parseFloat(data[0].sbi_tt_sell);
      
      // Properly handle timestamp from scraped data or fallback to current date
      let timestamp;
      if (data[0].timestamp && isValidDate(data[0].timestamp)) {
        timestamp = new Date(data[0].timestamp);
        console.log("Using timestamp from scraped data:", timestamp);
      } else {
        timestamp = new Date();
        console.log("No valid timestamp in scraped data, using current date:", timestamp);
      }
            
            // Check if we already have data for today
            const todayData = await prisma.sBITTRate.findFirst({
              where: {
                date: {
            gte: new Date(todayStr), 
            lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000), // Next day
                },
              },
            });
            
      if (todayData) {
        // Update the existing record if the rate has changed
        if (todayData.rate !== rate) {
          await prisma.sBITTRate.update({
            where: { id: todayData.id },
            data: { 
              rate: rate,
              date: timestamp  // Update the date with proper timestamp
            }
              });
          console.log("✅ SBI TT rate updated in database");
            } else {
          console.log("⏭️ SBI TT rate unchanged, skipping update");
            }
      } else {
        // Create a new record
        await prisma.sBITTRate.create({
          data: {
            date: timestamp,
            rate: rate,
          },
        });
        console.log("✅ SBI TT rate saved to database (new entry)");
      }
    }
    
    return true;
  } catch (error) {
    console.error("🚨 Error fetching/storing SBI TT external data:", error);
    return false;
  }
}

// Helper function to validate date
const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};
