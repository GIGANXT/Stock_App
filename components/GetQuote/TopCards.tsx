"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import LiveSpotCard from '../Dashboard/LiveSpotCard';

// Declare the type for the global window object to include sharedMCXPrice
declare global {
  interface Window {
    sharedMCXPrice: {
      currentPrice: number | null;
      lastUpdated: string | null;
      change: number | null;
      changePercent: number | null;
      source: string | null;
    } | null;
  }
}

const MCXClock = dynamic(() => import('../Dashboard/MCXClock'), { 
  ssr: false,
  loading: () => <span className="text-sm text-gray-600">--:--:--</span>
});

interface MCXMonthCardProps {
  month: string;
  price: number;
  change: number;
  changeValue: number;
  isLoading?: boolean;
}

// Structure that matches the database data
interface MCXData {
  month1Label: string;
  month1Price: number;
  month1RateVal: number;
  month1RatePct: number;
  month2Label: string;
  month2Price: number;
  month2RateVal: number;
  month2RatePct: number;
  month3Label: string;
  month3Price: number;
  month3RateVal: number;
  month3RatePct: number;
  timestamp?: string;
}

// Loading placeholder for LiveSpotCard that maintains the same dimensions
const LiveSpotCardLoading = () => (
  <div className="price-card bg-white rounded-xl p-4 border border-gray-200 
    shadow-md transition-all duration-200 w-full
    relative overflow-hidden h-[148px]">
    <div className="h-full flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="text-sm text-gray-500 mt-2">Loading price data...</p>
    </div>
  </div>
);

const MCXMonthCard = ({ month, price, change, changeValue, isLoading = false }: MCXMonthCardProps) => {
  const isIncrease = change >= 0;
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;
  const trendColor = isIncrease ? "text-green-600" : "text-red-600";
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 
        shadow-md hover:shadow-lg transition-all duration-200 w-full 
        relative overflow-hidden h-[148px]">
        <div className="h-full flex flex-col justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading price data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 
      shadow-md hover:shadow-lg transition-all duration-200 w-full 
      relative overflow-hidden h-[148px]
      will-change-transform group">
      
      {/* Background effect - separated from text layer */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
        ${isIncrease ? 'bg-green-500' : 'bg-red-500'}
        -z-10`} // Ensures it stays behind text
      ></div>
      
      {/* Text container with forced GPU layer */}
      <div className="relative flex flex-col h-full gap-1.5 transform-gpu">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-800">{month}</span>
          </div>
          <span className="text-xs text-gray-500">(MCX)</span>
        </div>

        {/* Price Display */}
        <div className="flex items-baseline mt-1 pl-1">
          <span className="font-mono text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 
            bg-clip-text text-transparent leading-tight tracking-tight">
            ₹{price.toFixed(2)}
          </span>
          <span className="text-sm text-gray-600 ml-2">/kg</span>
        </div>

        {/* Change Indicators */}
        <div className={`flex items-center gap-1.5 text-sm ${trendColor} mt-2 font-medium pl-1`}>
          <TrendIcon className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {isIncrease ? '+' : '-'}₹{Math.abs(changeValue).toFixed(2)} ({Math.abs(change).toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

const TopCards = () => {
  // State to store the MCX data
  const [mcxData, setMcxData] = useState<MCXData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchMCXData = async () => {
      try {
        setIsLoading(true);
        
        // Step 1: Check if MCX data is available from the Dashboard component
        const sharedMCXPrice = typeof window !== 'undefined' ? window.sharedMCXPrice : null;
        
        if (sharedMCXPrice && 
            sharedMCXPrice.currentPrice !== null && 
            typeof sharedMCXPrice.currentPrice === 'number') {
          
          // We have the first month data, now get all 3 months from the API
          const res = await fetch('/api/3_month_mcx?action=view&limit=1');
          
          if (res.ok) {
            const result = await res.json();
            
            if (result.success && result.data?.length > 0) {
              const rawData = result.data[0];
              const processedData: MCXData = {
                month1Label: rawData.month1Label,
                month1Price: parseFloat(rawData.month1Price),
                month1RateVal: parseFloat(rawData.month1RateVal),
                month1RatePct: parseFloat(rawData.month1RatePct),
                month2Label: rawData.month2Label,
                month2Price: parseFloat(rawData.month2Price),
                month2RateVal: parseFloat(rawData.month2RateVal),
                month2RatePct: parseFloat(rawData.month2RatePct),
                month3Label: rawData.month3Label,
                month3Price: parseFloat(rawData.month3Price),
                month3RateVal: parseFloat(rawData.month3RateVal),
                month3RatePct: parseFloat(rawData.month3RatePct),
                timestamp: rawData.timestamp
              };
              
              setMcxData(processedData);
            }
          }
        } else {
          // If data is not available from dashboard, fetch from the database
          const res = await fetch('/api/3_month_mcx?action=view&limit=1');
          
          if (!res.ok) {
            throw new Error('Failed to fetch MCX data');
          }
          
          const result = await res.json();
          
          if (result.success && result.data?.length > 0) {
            const rawData = result.data[0];
            const processedData: MCXData = {
              month1Label: rawData.month1Label,
              month1Price: parseFloat(rawData.month1Price),
              month1RateVal: parseFloat(rawData.month1RateVal),
              month1RatePct: parseFloat(rawData.month1RatePct),
              month2Label: rawData.month2Label,
              month2Price: parseFloat(rawData.month2Price),
              month2RateVal: parseFloat(rawData.month2RateVal),
              month2RatePct: parseFloat(rawData.month2RatePct),
              month3Label: rawData.month3Label,
              month3Price: parseFloat(rawData.month3Price),
              month3RateVal: parseFloat(rawData.month3RateVal),
              month3RatePct: parseFloat(rawData.month3RatePct),
              timestamp: rawData.timestamp
            };
            
            setMcxData(processedData);
          } else {
            throw new Error('No MCX data available');
          }
        }
      } catch (err) {
        console.error('Error fetching MCX data:', err);
        
        // Fallback to default values if there's an error
        setMcxData({
          month1Label: 'March',
          month1Price: 201.85,
          month1RateVal: 0.85,
          month1RatePct: 0.42,
          month2Label: 'April',
          month2Price: 203.15,
          month2RateVal: 0.77,
          month2RatePct: 0.38,
          month3Label: 'May',
          month3Price: 204.75,
          month3RateVal: 0.92,
          month3RatePct: 0.45
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMCXData();
    
    // Set up a refresh interval (every 60 seconds)
    const interval = setInterval(fetchMCXData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // If still loading and no data yet
  if (isLoading && !mcxData) {
    return (
      <div className="max-w-[1366px] mx-auto px-4 pt-4">
        <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-6 
          border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 
              bg-clip-text text-transparent">
              Top Cards
            </h2>
            <div className="flex items-center gap-2">
              <MCXClock />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="w-full h-full px-2">
              <LiveSpotCardLoading />
            </div>
            <div className="w-full h-full px-2">
              <MCXMonthCard 
                month="Loading..." 
                price={0} 
                change={0}
                changeValue={0}
                isLoading={true} 
              />
            </div>
            <div className="w-full h-full px-2">
              <MCXMonthCard 
                month="Loading..." 
                price={0} 
                change={0}
                changeValue={0}
                isLoading={true} 
              />
            </div>
            <div className="w-full h-full px-2">
              <MCXMonthCard 
                month="Loading..." 
                price={0} 
                change={0}
                changeValue={0}
                isLoading={true} 
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Fallback to default data if mcxData is somehow still null
  const displayData = mcxData || {
    month1Label: 'March',
    month1Price: 201.85,
    month1RateVal: 0.85,
    month1RatePct: 0.42,
    month2Label: 'April',
    month2Price: 203.15,
    month2RateVal: 0.77,
    month2RatePct: 0.38,
    month3Label: 'May',
    month3Price: 204.75,
    month3RateVal: 0.92,
    month3RatePct: 0.45
  };

  return (
    <div className="max-w-[1366px] mx-auto px-4 pt-4">
      <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-6 
        border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)] 
        transition-all duration-300 overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.05)_0%,transparent_50%)]" />

        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 
            bg-clip-text text-transparent">
            Top Cards
          </h2>
          <div className="flex items-center gap-2">
            <MCXClock />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="w-full h-full px-2">
            <LiveSpotCard />
          </div>
          <div className="w-full h-full px-2">
            <MCXMonthCard 
              month={displayData.month1Label}
              price={displayData.month1Price}
              change={displayData.month1RatePct}
              changeValue={displayData.month1RateVal}
            />
          </div>
          <div className="w-full h-full px-2">
            <MCXMonthCard 
              month={displayData.month2Label}
              price={displayData.month2Price} 
              change={displayData.month2RatePct}
              changeValue={displayData.month2RateVal}
            />
          </div>
          <div className="w-full h-full px-2">
            <MCXMonthCard 
              month={displayData.month3Label}
              price={displayData.month3Price}
              change={displayData.month3RatePct}
              changeValue={displayData.month3RateVal}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default TopCards;