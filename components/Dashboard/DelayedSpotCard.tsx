'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import dynamic from 'next/dynamic';

interface DelayedSpotCardProps {
    lastUpdated?: Date;
    spotPrice?: number;
    change?: number;
    changePercent?: number;
    unit?: string;
    isDerived?: boolean;
    apiUrl?: string;
}

interface PriceData {
    spotPrice: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
}

const ClockComponent = dynamic(() => import('./Clock'), { 
    ssr: false,
    loading: () => <span className="text-sm text-gray-600">--:--:--</span>
});

export default function DelayedSpotCard({
    lastUpdated,
    spotPrice = 2700.00,
    change = 13.00,
    changePercent = 0.48,
    unit = '/MT',
    apiUrl = '/api/metal-price'
}: DelayedSpotCardProps) {
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPriceData = async () => {
            try {
                setLoading(true);
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch price data');
                }
                
                const data = await response.json();
                setPriceData(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching price data:', err);
                setError('Failed to load price data');
            } finally {
                setLoading(false);
            }
        };

        // Fetch data immediately
        fetchPriceData();
        
        // Set up polling every 30 seconds
        const intervalId = setInterval(fetchPriceData, 30000);
        
        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, [apiUrl]);

    // Use API data if available, otherwise use props
    const displayTime = priceData?.lastUpdated 
        ? parseISO(priceData.lastUpdated) 
        : (lastUpdated || new Date());
    
    const currentSpotPrice = priceData?.spotPrice || spotPrice;
    const currentChange = priceData?.change || change;
    const currentChangePercent = priceData?.changePercent || changePercent;
    
    const isIncrease = currentChange >= 0;
    const trendColor = isIncrease ? "text-green-600" : "text-red-600";
    const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

    return (
        <div className="price-card bg-white rounded-xl p-4 border border-gray-200 
          shadow-md hover:shadow-lg transition-all duration-200 w-full max-w-xs
          relative overflow-hidden gpu-render group min-h-[162px]">
            
            {/* Background effect - properly layered */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
              ${isIncrease ? 'bg-green-500' : 'bg-red-500'} 
              -z-10`}></div>

            <div className="relative flex flex-col h-full gap-2">
                {/* Live Indicator Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Clock className="w-4 h-4 text-amber-600 crisp-text" />
                        </div>
                        <span className="text-sm font-medium text-amber-700 crisp-text">30 mins delay</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-4 h-4 crisp-text" />
                        <ClockComponent />
                    </div>
                </div>

                {/* Price Content */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm text-gray-600 crisp-text">
                            {format(displayTime, 'dd. MMMM yyyy')}
                        </div>
                        <div className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                            Delayed
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-2">
                            <div className="h-6 w-32 bg-gray-200 animate-pulse mb-2 rounded"></div>
                            <div className="h-6 w-36 bg-gray-200 animate-pulse rounded"></div>
                        </div>
                    ) : error ? (
                        <div>
                            <div className="h-8 w-32 mb-2">
                                <p className="text-sm text-red-500">{error}</p>
                                <p className="text-xs text-gray-500">Using default values</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-mono text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 
                                  bg-clip-text text-transparent gradient-text crisp-text">
                                    ${currentSpotPrice.toFixed(2)}
                                </span>
                                <span className="text-sm text-gray-600 crisp-text">{unit}</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                <span className="font-mono text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 
                                  bg-clip-text text-transparent gradient-text crisp-text">
                                    ${currentSpotPrice.toFixed(2)}
                                </span>
                                <span className="text-sm text-gray-600 crisp-text">{unit}</span>
                            </div>

                            <div className={`flex items-center gap-1.5 text-sm ${trendColor} mt-2 font-medium`}>
                                <TrendIcon className="w-4 h-4 flex-shrink-0 crisp-text" />
                                <span className="whitespace-nowrap crisp-text">
                                    {isIncrease ? '+' : '-'}${Math.abs(currentChange).toFixed(2)} ({currentChangePercent.toFixed(2)}%)
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}