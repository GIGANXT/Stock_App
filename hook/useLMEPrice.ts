import { useState, useEffect } from 'react';
// import { useLMEHistory } from './useLMEHistory';

interface LMEPriceData {
  currentPrice: number;
  lastUpdated: string;
  change: number;
  changePercent: number;
}

export function useLMEPrice() {
  const [priceData, setPriceData] = useState<LMEPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let updateInterval: NodeJS.Timeout;

    const updatePrice = () => {
      if (mounted) {
        // Use fixed price of $2,700
        setPriceData({
          currentPrice: 2700.00,
          lastUpdated: new Date().toISOString(),
          change: 0.48,
          changePercent: 0.48
        });
        setLoading(false);
        setError(null);
      }
    };

    updatePrice();
    updateInterval = setInterval(updatePrice, 30000); // Update every 30 seconds

    return () => {
      mounted = false;
      clearInterval(updateInterval);
    };
  }, []);

  return { priceData, loading, error };
}