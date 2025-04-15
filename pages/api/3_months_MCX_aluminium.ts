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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsPolling(true);
        const response = await fetch('/api/mcx-aluminium');
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const latestData = await response.json();
        setData(latestData);
        setConnectionError(null);
      } catch (error) {
        console.error("Error fetching data:", error);
        setConnectionError("Failed to fetch data from server");
      } finally {
        setIsPolling(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling every 15 seconds
    const pollInterval = setInterval(fetchData, 15000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  return { data, connectionError, isPolling };
};