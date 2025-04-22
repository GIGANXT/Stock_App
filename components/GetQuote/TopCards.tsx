"use client";

import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import LiveSpotCard from '../Dashboard/LiveSpotCard';

const MCXClock = dynamic(() => import('../Dashboard/MCXClock'), { 
  ssr: false,
  loading: () => <span className="text-sm text-gray-600">--:--:--</span>
});

interface MCXMonthCardProps {
  month: string;
  price: number;
  change: number;
}

const MCXMonthCard = ({ month, price, change }: MCXMonthCardProps) => {
  const isIncrease = change >= 0;
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;
  const trendColor = isIncrease ? "text-green-600" : "text-red-600";
  
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
            {isIncrease ? '+' : '-'}{Math.abs(change)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const TopCards = () => {
  // MCX data
  const mcxData = {
    march: { price: 201.85, change: 0.42 },
    april: { price: 203.15, change: 0.38 },
    may: { price: 204.75, change: 0.45 }
  };

  return (
    <div className="max-w-[1366px] mx-auto px-4 pt-4">
      <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-6 
        border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)] 
        transition-all duration-300 overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.05)_0%,transparent_50%)]" />

        <div className="relative">
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
              <MCXMonthCard month="March" price={mcxData.march.price} change={mcxData.march.change} />
            </div>
            <div className="w-full h-full px-2">
              <MCXMonthCard month="April" price={mcxData.april.price} change={mcxData.april.change} />
            </div>
            <div className="w-full h-full px-2">
              <MCXMonthCard month="May" price={mcxData.may.price} change={mcxData.may.change} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TopCards;