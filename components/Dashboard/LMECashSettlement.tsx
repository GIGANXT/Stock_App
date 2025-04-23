import React from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface LiveSpotPriceCardProps {
  priceName?: string;
  basePrice?: number;
  spread?: number;
  spreadINR?: string;
  isIncrease?: boolean;
  formattedDate?: string;
}

export default function LiveSpotPriceCard({
  basePrice = 2650,
  spread = 40,
  spreadINR = '3350.00',
  isIncrease = true,
  formattedDate = '30. May 2023'
}: LiveSpotPriceCardProps) {
  const totalPrice = basePrice;
  const trendColor = isIncrease ? "text-green-600" : "text-red-600";
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 
      shadow-md hover:shadow-lg transition-all duration-200 w-full 
      max-w-xs sm:max-w-sm
      relative overflow-hidden
      will-change-transform group" // Optimizes for performance
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
            {isIncrease ? '+' : '-'}${Math.abs(spread).toFixed(2)}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${trendColor} font-medium antialiased subpixel-antialiased`}>
          <TrendIcon className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {isIncrease ? '+' : '-'}₹{spreadINR}
          </span>
        </div>
      </div>
    </div>
  );
}