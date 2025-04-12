// hooks/useAluminiumStream.ts
import { useEffect, useState } from "react";
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import https from 'https';
import { EventSource } from 'eventsource';

export interface PriceData {
  date: string;
  time: string;
  timestamp: string;
  prices: {
    [month: string]: {
      price: number | string;
      site_rate_change: string;
    };
  };
}

export const useAluminiumStream = () => {
  const [data, setData] = useState<PriceData | null>(null);
//
  useEffect(() => {
    const eventSource = new EventSource("http://148.135.138.22/mcx-aluminium/stream");

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close(); // optional, you can try to reconnect if needed
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return data;
};

interface SSEData {
  prices: {
    [key: string]: {
      price: number;
      site_rate_change: string;
    };
  };
  date: string;
  time: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Create EventSource connection
    const eventSource = new EventSource('http://148.135.138.22/mcx-aluminium/stream');

    let hasReceivedData = false;
    let connectionTimeout: NodeJS.Timeout;

    // Handle connection open
    eventSource.onopen = () => {
      console.log('SSE Connection opened');
      hasReceivedData = false;
      
      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        if (!hasReceivedData) {
          console.error('No data received within timeout period');
          eventSource.close();
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: 'Data stream timeout - retrying' })}\n\n`);
          }
        }
      }, 20000); // 20 seconds timeout
    };

    // Handle incoming messages
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SSEData;
        if (data && data.prices && Object.keys(data.prices).length > 0) {
          hasReceivedData = true;
          clearTimeout(connectionTimeout);
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: 'Invalid data format' })}\n\n`);
        }
      }
    };

    // Handle errors
    eventSource.onerror = (event: Event) => {
      const error = event as ErrorEvent;
      console.error('SSE Error:', error);
      clearTimeout(connectionTimeout);
      eventSource.close();
      
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          error: 'Stream connection error - retrying', 
          details: error.message || 'Connection failed'
        })}\n\n`);
      }
    };

    // Handle client disconnect
    req.on('close', () => {
      clearTimeout(connectionTimeout);
      eventSource.close();
      if (!res.writableEnded) {
        res.end();
      }
    });

  } catch (error: any) {
    console.error('Server error:', error);
    if (!res.writableEnded) {
      res.status(500).json({
        error: 'Failed to establish connection',
        details: error.message
      });
    }
  }
}
