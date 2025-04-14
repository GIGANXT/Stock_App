import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API proxy for MCX Aluminium data
 * This can be used as a proxy to avoid CORS issues when deployed to Netlify
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the backend URL from environment variables
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://148.135.138.22";
  
  try {
    // Forward the request to the actual backend
    const endpoint = req.query.endpoint || 'scrape';
    const response = await fetch(`${API_BASE_URL}/mcx-aluminium/${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch data from backend' });
  }
} 