import { NextApiRequest, NextApiResponse } from 'next';

interface PriceData {
  spot_price: number;
  price_change: number;
  change_percentage: number;
  last_updated: string;
}

// Store only the last successful response with a timestamp
let lastSuccessfulData: {
  spotPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  timestamp: number; // Unix timestamp in milliseconds
} | null = null;

// Cache control headers to prevent browser caching
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set cache control headers to prevent browser caching
  res.setHeader('Cache-Control', noCacheHeaders['Cache-Control']);
  res.setHeader('Pragma', noCacheHeaders['Pragma']);
  res.setHeader('Expires', noCacheHeaders['Expires']);
  
  try {
    // Use the backend server URL
    const backendUrl = process.env.BACKEND_URL || 'http://148.135.138.22:3232';
    // console.log(`Fetching from backend: ${backendUrl}/api/price-data`);
    
    const response = await fetch(`${backendUrl}/api/price-data`, {
      // Add cache-busting parameter to prevent server-side caching
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch price data from backend: ${response.status} ${response.statusText}`);
    }
    
    const data: PriceData = await response.json();
    // console.log("Metal Price API Response:", data);
    
    // Transform the data to match the frontend's expected format
    const transformedData = {
      spotPrice: data.spot_price,
      change: data.price_change,
      changePercent: data.change_percentage,
      lastUpdated: data.last_updated,
      timestamp: Date.now() // Add current timestamp
    };
    
    // Store the latest successful data
    lastSuccessfulData = transformedData;
    
    // console.log("Transformed Metal Price Data:", transformedData);
    res.status(200).json(transformedData);
  } catch (error) {
    console.error('Error fetching price data:', error);
    
    // If we have previous data, return it instead of an error
    if (lastSuccessfulData) {
      console.log("Returning last successful data due to error:", lastSuccessfulData);
      return res.status(200).json(lastSuccessfulData);
    }
    
    // If no previous data, return an error status
    console.log("No previous data available, returning error status");
    res.status(503).json({ 
      error: "Service temporarily unavailable", 
      message: "No price data available at this time" 
    });
  }
} 
