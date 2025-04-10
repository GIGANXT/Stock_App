import { useState } from 'react';

interface MCXPriceData {
  march: {
    price: number;
    change: number;
  };
  april: {
    price: number;
    change: number;
  };
  may: {
    price: number;
    change: number;
  };
  lastUpdated: string;
  volume: number;
  dayHigh: number;
  dayLow: number;
  currentPrice: number;
}

export function useMCXPrice() {
  const [priceData, setPriceData] = useState<MCXPriceData>({
    march: {
      price: 246.30,
      change: 0.50
    },
    april: {
      price: 248.15,
      change: 0.65
    },
    may: {
      price: 248.15,
      change: 0.65
    },
    currentPrice: 246.30,
    lastUpdated: new Date().toISOString(),
    volume: 1580,
    dayHigh: 247.30,
    dayLow: 245.80
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return { priceData, error, loading };
}