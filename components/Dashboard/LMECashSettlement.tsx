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
    <div className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
      shadow-sm hover:shadow-md transition-all duration-300 ease-in-out w-full 
      relative overflow-hidden gpu-render group min-h-[130px] md:min-h-[162px]
      transform hover:-translate-y-0.5"
    >
      {/* Background effect with enhanced hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-all duration-300 ease-in-out
        ${isIncrease ? 'bg-green-500' : 'bg-red-500'} 
        -z-10`}></div>
      
      {/* Text container with forced GPU layer */}
      <div className="relative transform-gpu flex flex-col h-full gap-1 md:gap-1.5"> 
        {/* Date with day indicator */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 font-medium antialiased subpixel-antialiased flex items-center gap-1.5">
            <Calendar className="w-4 h-4 crisp-text group-hover:text-indigo-600 transition-colors duration-300" />
            <span className="crisp-text group-hover:text-indigo-800 transition-colors duration-300">{formattedDate}</span>
          </div>
        </div>

        {/* Price Display */}
        <div className="flex-1 mt-0.5 md:mt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-indigo-600">
              ${totalPrice.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">/MT</span>
          </div>

          {/* Change Indicators */}
          <div className={`flex items-center gap-1.5 text-sm ${trendColor} font-medium mt-1.5 md:mt-2`}>
            <TrendIcon className="w-4 h-4 flex-shrink-0 crisp-text" />
            <span className="whitespace-nowrap crisp-text">
              {isIncrease ? '+' : '-'}${Math.abs(spread).toFixed(2)}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 text-sm ${trendColor} font-medium`}>
            <TrendIcon className="w-4 h-4 flex-shrink-0 crisp-text" />
            <span className="whitespace-nowrap crisp-text">
              {isIncrease ? '+' : '-'}₹{spreadINR}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}