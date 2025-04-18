import { NextApiRequest, NextApiResponse } from 'next';

interface PriceData {
  price: number;
  timestamp: number;
}

// Cache the last successful response
let cachedData: PriceData | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return res.status(200).json(cachedData);
    }

    // Fetch new data from the external API
    const response = await fetch('http://148.135.138.22:5003/data', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Validate the data structure
    if (!data.success || !data.data) {
      throw new Error('Invalid data format from external API');
    }

    // Process the data
    const processedData = {
      price: parseFloat(data.data.Value.replace(/,/g, '')),
      change: parseFloat(data.data['Rate of Change'].split(' ')[0]),
      changePercent: parseFloat(data.data['Rate of Change'].match(/\(([-+]?\d*\.?\d+)%\)/)?.[1] || '0'),
      timestamp: data.data.Timestamp,
      timeSpan: data.data['Time span']
    };

    // Update cache
    cachedData = processedData;
    lastFetchTime = now;

    // Return the processed data
    return res.status(200).json(processedData);
  } catch (error) {
    console.error('Error fetching price data:', error);
    
    // If we have cached data, return it even if there's an error
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        isCached: true,
        error: 'Using cached data due to API error'
      });
    }

    // If no cached data, return error
    return res.status(500).json({
      error: 'Failed to fetch price data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 