// hooks/useAluminiumStream.ts
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:5002/stream");

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
