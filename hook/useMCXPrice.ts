import { useState, useEffect } from 'react';

interface PriceData {
  price: number;
  site_rate_change: string;
}

interface AluminiumData {
  date: string;
  time: string;
  timestamp: string;
  prices: {
    [key: string]: PriceData;
  };
}

interface MCXPriceData {
  currentPrice: number;
  lastUpdated: string;
  change: number;
  changePercent: number;
}

export function useMCXPrice() {
  const [priceData, setPriceData] = useState<MCXPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds
    const UPDATE_INTERVAL = 30000; // 30 seconds

    const fetchData = async () => {
      if (!mounted) return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/mcx-aluminium');
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const fetchedData: AluminiumData = await response.json();
        
        // Extract the current month's price (first in the list)
        const monthNames = Object.keys(fetchedData.prices);
        if (monthNames.length > 0) {
          const currentMonth = monthNames[0];
          const priceInfo = fetchedData.prices[currentMonth];
          
          // Parse the rate change string to extract change and changePercent
          const changeMatch = priceInfo.site_rate_change.match(/^([-+]?\d+\.?\d*)\s*\(([-+]?\d+\.?\d*)%\)$/);
          const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
          const changePercent = changeMatch ? parseFloat(changeMatch[2]) : 0;
          
          setPriceData({
            currentPrice: priceInfo.price,
            lastUpdated: fetchedData.timestamp,
            change,
            changePercent
          });
        }
        
        setError(null);
        retryCount = 0; // Reset retry count on successful fetch
      } catch (err) {
        console.error('Error fetching MCX Aluminium data:', err);
        setError('Failed to load data. Please try again later.');
        
        // Implement retry logic
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          retryTimeout = setTimeout(fetchData, RETRY_DELAY);
          return;
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const updateInterval = setInterval(fetchData, UPDATE_INTERVAL);
    
    return () => {
      mounted = false;
      clearInterval(updateInterval);
      clearTimeout(retryTimeout);
    };
  }, []);

  return { priceData, loading, error };
} 