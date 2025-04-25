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
  source?: 'api' | 'database';
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    let data: ApiResponse['data'];
    let fromDatabase = false;

    // Try fetching from the external API first
    try {
      // Create an AbortController with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // ✅ Correct Flask API URL
      const response = await fetch("http://148.135.138.22:5001/scrape-sbi-tt", {
        signal: controller.signal
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      // ✅ Read raw response
      const text = await response.text();

      // 🔍 Debugging log
      console.log("🔍 Raw response from Flask:", text);

      // ✅ Try parsing JSON
      try {
        const parsedData = JSON.parse(text);
        
        // ✅ Check if API response is OK
        if (!response.ok) {
          throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }
        
        data = parsedData.data;
        
        // Store the data in the database for future use
        if (data && data.length > 0) {
          try {
            // Use raw SQL to insert data since TypeScript is having issues with the schema
            await prisma.$executeRaw`
              INSERT INTO "SBITTRate" ("date", "rate") 
              VALUES (${new Date()}, ${parseFloat(data[0].sbi_tt_sell)})
            `;
            console.log("✅ SBI TT rate saved to database");
          } catch (dbError) {
            console.error("❌ Error saving SBI TT rate to database:", dbError);
            // Continue even if database storage fails
          }
        }
      } catch (jsonError) {
        console.error("🚨 Error parsing JSON or invalid data:", jsonError);
        throw jsonError; // Rethrow to trigger fallback
      }
    } catch (apiError) {
      console.error("🚨 External API error, falling back to database:", apiError);
      
      // Fetch the latest rate from the database
      try {
        // Use raw SQL to fetch the latest rate
        const latestRates = await prisma.$queryRaw<Array<{ id: number; date: Date; rate: number; createdAt: Date }>>`
          SELECT * FROM "SBITTRate" 
          ORDER BY "date" DESC 
          LIMIT 1
        `;
        
        const latestRate = latestRates[0];
        
        if (latestRate) {
          console.log("✅ Using SBI TT rate from database");
          data = [{
            sbi_tt_sell: latestRate.rate.toString(),
            sbi_tt_buy: null,
            timestamp: latestRate.date.toISOString()
          }];
          fromDatabase = true;
        } else {
          throw new Error("No data available from external API or database");
        }
      } catch (dbError) {
        console.error("🚨 Database error, no fallback available:", dbError);
        throw new Error("No data available from external API or database");
      }
    }

    res.status(200).json({ 
      success: true, 
      data, 
      source: fromDatabase ? "database" : "api" 
    });
  } catch (error: unknown) {
    console.error("🚨 Final error in SBI TT API:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await prisma.$disconnect();
  }
}
