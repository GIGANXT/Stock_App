import React from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface LiveSpotPriceCardProps {
  priceName?: string;
  basePrice: number;
  spread: number;
  prevDayPrice?: number;
  exchangeRate?: number;
  prevExchangeRate?: number;
  lastUpdated?: Date;
}

export default function LiveSpotPriceCard({
  basePrice = 2650,
  spread = 40,
  prevDayPrice,
  exchangeRate = 83.5,
  prevExchangeRate,
  lastUpdated
}: LiveSpotPriceCardProps) {
  const displayedDate = lastUpdated || new Date();
  const today = new Date();
  const dayDifference = Math.abs(differenceInDays(displayedDate, today));
  
  const totalPrice = basePrice + spread;
  const percentageChange = ((spread / basePrice) * 100).toFixed(2);
  const isIncrease = spread >= 0;
  const trendColor = isIncrease ? "text-green-600" : "text-red-600";
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;
  
  // Calculate the INR change
  // Formula: (spot price end of the day * rbi reference rate) - ((spot price end of the day - 1)*rbi reference rate)
  let inrChange = 0;
  
  if (prevDayPrice && exchangeRate) {
    // Current day value in INR
    const currentValueINR = basePrice * exchangeRate;
    
    // Previous day value in INR
    // If we have prevExchangeRate, use it for more accurate calculation
    const rateToUse = prevExchangeRate || exchangeRate;
    const prevValueINR = prevDayPrice * rateToUse;
    
    // Calculate the change
    inrChange = currentValueINR - prevValueINR;
  } else {
    // Fallback calculation if previous data is not available
    inrChange = spread * (exchangeRate || 0);
  }
  
  const spreadINR = Math.abs(inrChange).toFixed(2);

  // Format date as "31. May 2023" style
  const formattedDate = format(displayedDate, 'dd. MMMM yyyy');

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 
      shadow-md hover:shadow-lg transition-all duration-200 w-full 
      max-w-xs sm:max-w-sm
      relative overflow-hidden
      will-change-transform group min-h-[162px]" // Optimizes for performance
    >
      {/* Background effect - separated from text layer */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
        ${isIncrease ? 'bg-green-500' : 'bg-red-500'}
        -z-10`} // Ensures it stays behind text
      ></div>
      
      {/* Text container with forced GPU layer */}
      <div className="relative transform-gpu flex flex-col gap-2"> {/* Forces GPU rendering */}
        {/* Date with day indicator */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 font-medium antialiased subpixel-antialiased flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
          {dayDifference > 0 && (
            <div className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {dayDifference === 1 ? 'Yesterday' : `${dayDifference} days ago`}
            </div>
          )}
        </div>

        {/* Price Display */}
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-bold text-indigo-600
            leading-tight tracking-tight antialiased subpixel-antialiased"> {/* Improved text rendering */}
            ${totalPrice.toFixed(2)}
          </span>
        </div>

        {/* Change Indicators */}
        <div className={`flex items-center gap-1.5 text-sm ${trendColor} font-medium antialiased subpixel-antialiased`}>
          <TrendIcon className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {isIncrease ? '+' : '-'}${Math.abs(spread).toFixed(2)} ({percentageChange}%)
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${trendColor} font-medium antialiased subpixel-antialiased`}>
          <TrendIcon className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {inrChange >= 0 ? '+' : '-'}₹{spreadINR}
          </span>
        </div>
      </div>
    </div>
  );
}