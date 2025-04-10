import React from 'react';
import { Wifi, Clock, TrendingUp, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface LiveSpotPriceCardProps {
    lastUpdated?: Date;
}

export default function LiveSpotPriceCard({ lastUpdated }: LiveSpotPriceCardProps) {
    const SPOT_PRICE = 2650;
    const SPREAD = 40;
    const TOTAL_PRICE = SPOT_PRICE + SPREAD;
    const displayedTime = lastUpdated || new Date();
    const isIncrease = true; // Assuming increase for this example

    return (
        <div className="price-card bg-white rounded-xl p-4 sm:p-6 border border-indigo-100/50 shadow-sm hover:shadow-md transition-all
          w-full max-w-md mx-auto gpu-render group">
            
            {/* Background effect - properly layered */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
              ${isIncrease ? 'bg-green-500' : 'bg-red-500'} 
              -z-10`}></div>
            
            {/* Header with Live Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Wifi className="w-5 h-5 text-green-600 crisp-text" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full">
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                          bg-clip-text text-transparent gradient-text crisp-text">
                            Live Market Price
                        </h2>
                        <p className="text-sm text-gray-600 crisp-text">SPOT + Spread</p>
                    </div>
                </div>

                <div className="relative group self-start sm:self-auto">
                    <HelpCircle className="w-5 h-5 text-gray-400 cursor-help crisp-text" />
                    <div className="absolute right-0 sm:left-0 top-full mt-2 w-64 bg-white p-3 rounded-lg shadow-lg border border-gray-200 
                      invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                        <p className="text-sm text-gray-600 crisp-text">
                            Price is calculated from current SPOT price plus applicable spread
                        </p>
                    </div>
                </div>
            </div>

            {/* Price Display */}
            <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                      bg-clip-text text-transparent gradient-text crisp-text">
                        ${TOTAL_PRICE.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-600 crisp-text">/MT</span>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 crisp-text">SPOT Price</span>
                        <span className="font-medium crisp-text">${SPOT_PRICE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 crisp-text">Spread</span>
                        <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="w-4 h-4 crisp-text" />
                            <span className="font-medium crisp-text">+${SPREAD.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-4 h-4 crisp-text" />
                    <span className="crisp-text">Updated: {format(displayedTime, 'HH:mm:ss')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium crisp-text">
                        Live Feed
                    </span>
                </div>
            </div>
        </div>
    );
}