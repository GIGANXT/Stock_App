// hooks/useAluminiumStream.ts
import { useEffect, useState } from "react";
import { NextApiRequest, NextApiResponse } from 'next';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Create a new EventSource connection to the external service
      const eventSource = new EventSource("http://148.135.138.22/mcx-aluminium/stream");

      // Forward messages from the external service to the client
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          res.write(`data: ${JSON.stringify(parsed)}\n\n`);
        } catch (error) {
          console.error("Error parsing SSE data:", error);
          res.write(`data: ${JSON.stringify({ error: "Error parsing data" })}\n\n`);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        res.write(`data: ${JSON.stringify({ error: "Connection error" })}\n\n`);
        eventSource.close();
      };

      // Clean up when the client disconnects
      req.on('close', () => {
        eventSource.close();
        res.end();
      });

    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
