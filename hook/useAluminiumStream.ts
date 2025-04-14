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

  // Get the API URL from environment variable or fallback to hardcoded value
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://148.135.138.22";
  const SCRAPE_ENDPOINT = `${API_BASE_URL}/mcx-aluminium/scrape`;
  const STREAM_ENDPOINT = `${API_BASE_URL}/mcx-aluminium/stream`;

  useEffect(() => {
    // Function to fetch data directly via API
    const fetchData = async () => {
      try {
        setIsPolling(true);
        const response = await fetch(SCRAPE_ENDPOINT);
        
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        
        const result = await response.json();
        setData(result);
        setConnectionError(null);
        setIsPolling(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setConnectionError("Failed to connect to server. Will try SSE stream.");
        // Try SSE after API call fails
        connectSSE();
      }
    };

    // Function to connect to SSE stream
    const connectSSE = () => {
      try {
        const eventSource = new EventSource(STREAM_ENDPOINT);
        
        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setData(parsed);
            setConnectionError(null);
            setIsPolling(false);
          } catch (error) {
            console.error("Error parsing SSE data:", error);
            setConnectionError("Error parsing data from server");
            setIsPolling(false);
            eventSource.close();
            // Fallback to polling
            startPolling();
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE error:", err);
          setConnectionError("SSE connection error");
          eventSource.close();
          // Fallback to polling
          startPolling();
        };

        return () => {
          eventSource.close();
        };
      } catch (error) {
        console.error("Error setting up SSE:", error);
        setConnectionError("Error setting up streaming connection");
        // Fallback to polling
        startPolling();
      }
    };

    // Function to start polling at regular intervals when SSE fails
    const startPolling = () => {
      setIsPolling(true);
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(SCRAPE_ENDPOINT);
          
          if (!response.ok) {
            throw new Error("Failed to fetch data");
          }
          
          const result = await response.json();
          setData(result);
          setConnectionError(null);
        } catch (error) {
          console.error("Error polling data:", error);
          setConnectionError("Error polling data");
        }
      }, 15000); // Poll every 15 seconds

      return () => clearInterval(pollInterval);
    };

    // First try direct API call
    fetchData().catch(() => {
      // If direct call fails, try SSE
      connectSSE();
    });

  }, []);

  return { 
    data, 
    connectionError, 
    isPolling 
  };
}; 