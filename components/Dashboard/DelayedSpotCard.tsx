'use client';

import React from 'react';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface DelayedSpotCardProps {
    lastUpdated?: Date;
    spotPrice?: number;
    change?: number;
    changePercent?: number;
    unit?: string;
    isDerived?: boolean;
    isLMECashSettlement?: boolean;
}

export default function DelayedSpotCard({
    lastUpdated,
    spotPrice = 2414.00,
    changePercent = -1.39,
    unit = '/MT',
    isLMECashSettlement = false
}: DelayedSpotCardProps) {
    const currentSpotPrice = spotPrice;
    const currentChangePercent = changePercent;
    
    const isIncrease = currentChangePercent >= 0;
    const trendColor = isIncrease ? "text-green-600" : "text-red-600";
    const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

    // Format the date and time
    const formattedDate = lastUpdated 
        ? lastUpdated.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : '24. April 2025';
    
    const formattedTime = lastUpdated
        ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        : '22:38:04';

    return (
        <div className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
          shadow-sm hover:shadow-md transition-all duration-300 ease-in-out w-full
          relative overflow-hidden gpu-render group min-h-[130px] md:min-h-[162px]">
            
            <div className="relative flex flex-col h-full gap-1 md:gap-1.5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">
                            {isLMECashSettlement ? "LME Cash Settlement" : "30 mins delay"}
                        </span>
                    </div>
                    <div>
                        <span className="text-sm text-gray-700">{formattedTime}</span>
                    </div>
                </div>

                {/* Price Content */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 md:mb-1.5">
                        <div className="text-sm text-gray-600">
                            {formattedDate}
                        </div>
                        {!isLMECashSettlement && (
                            <div className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                Delayed
                            </div>
                        )}
                        {isLMECashSettlement && (
                            <div className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                Settlement
                            </div>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-0.5 md:mt-0">
                        <span className="font-mono text-2xl font-bold text-indigo-600">
                            ${currentSpotPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">{unit}</span>
                    </div>

                    {!isLMECashSettlement && (
                        <div className={`flex items-center gap-1.5 text-sm ${trendColor} mt-1.5 md:mt-2 font-medium`}>
                            <TrendIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                                {isIncrease ? '+' : ''}{currentChangePercent.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}