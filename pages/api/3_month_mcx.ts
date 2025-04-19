import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client';
import { EventSourcePolyfill, MessageEvent } from 'event-source-polyfill';

const prisma = new PrismaClient();

// Define the data structure based on the API response
interface PriceData {
  price: number;
  site_rate_change: string;
}

interface ApiResponse {
  date: string;
  time: string;
  timestamp: string;
  prices: {
    [contractMonth: string]: PriceData;
  };
}

// Helper function to parse rate change string
function parseRateChange(rateChangeStr: string): { rateChange: number; rateChangePercent: number } {
  // Format: "-0.4 (-0.17%)"
  const match = rateChangeStr.match(/^([-+]?\d+\.?\d*)\s*\(([-+]?\d+\.?\d*)%\)$/);
  
  if (!match) {
    return { rateChange: 0, rateChangePercent: 0 };
  }
  
  const rateChange = parseFloat(match[1]);
  const rateChangePercent = parseFloat(match[2]);
  
  return { rateChange, rateChangePercent };
}

// Helper function to store data in the database
async function storeData(data: ApiResponse) {
  const date = new Date(data.date);
  const timestamp = new Date(data.timestamp);
  const results = [];

  for (const [contractMonth, priceInfo] of Object.entries(data.prices)) {
    const { rateChange, rateChangePercent } = parseRateChange(priceInfo.site_rate_change);
    
    try {
      const result = await prisma.futuresPrice.upsert({
        where: {
          date_contractMonth: {
            date,
            contractMonth,
          },
        },
        update: {
          timestamp,
          price: priceInfo.price,
          rateChange,
          rateChangePercent,
        },
        create: {
          date,
          timestamp,
          contractMonth,
          price: priceInfo.price,
          rateChange,
          rateChangePercent,
        },
      });
      
      results.push(result);
    } catch (error) {
      console.error(`Error storing data for ${contractMonth}:`, error);
    }
  }

  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Check if this is a data retrieval request
    if (req.query.action === 'view') {
      try {
        const { 
          startDate, 
          endDate, 
          contractMonth, 
          limit = '100',
          page = '1'
        } = req.query;
        
        const where: Prisma.FuturesPriceWhereInput = {};
        
        if (startDate || endDate) {
          where.date = {};
          if (startDate) where.date.gte = new Date(startDate as string);
          if (endDate) where.date.lte = new Date(endDate as string);
        }
        
        if (contractMonth) {
          where.contractMonth = contractMonth as string;
        }
        
        const limitNum = parseInt(limit as string);
        const pageNum = parseInt(page as string);
        const skip = (pageNum - 1) * limitNum;
        
        const totalCount = await prisma.futuresPrice.count({ where });
        
        const data = await prisma.futuresPrice.findMany({
          where,
          orderBy: [
            { date: 'desc' },
            { contractMonth: 'asc' }
          ],
          skip,
          take: limitNum,
        });
        
        return res.status(200).json({
          success: true,
          data,
          pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum)
          }
        });
      } catch (error) {
        console.error('Error retrieving data:', error);
        return res.status(500).json({
          success: false,
          message: 'Error retrieving data',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      // If not a view request, fetch and store new data
      try {
        // Set up SSE connection
        const eventSource = new EventSourcePolyfill('http://148.135.138.22:5002/stream', {
          headers: {
            'Accept': 'text/event-stream'
          }
        });

        // Wait for the first message
        const data: ApiResponse = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            eventSource.close();
            reject(new Error('Timeout waiting for data'));
          }, 5000); // 5 second timeout

          eventSource.onmessage = (event: MessageEvent) => {
            clearTimeout(timeout);
            eventSource.close();
            resolve(JSON.parse(event.data));
          };

          eventSource.onerror = () => {
            clearTimeout(timeout);
            eventSource.close();
            reject(new Error('Error connecting to data stream'));
          };
        });

        // Store the received data
        const results = await storeData(data);

        return res.status(200).json({
          success: true,
          message: 'Data successfully stored in the database',
          count: results.length,
          results
        });
      } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching or storing data',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
