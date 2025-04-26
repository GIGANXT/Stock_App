'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LiveSpotCardProps {
    lastUpdated?: Date;
    spotPrice?: number;
    change?: number;
    changePercent?: number;
    unit?: string;
    isDerived?: boolean;
    apiUrl?: string;
    title?: string;
}

// Updated interface to match the API response structure
interface ApiResponse {
    type: 'spotPrice' | 'cashSettlement' | 'noData' | 'averagePrice';
    spotPrice?: number;
    change?: number;
    changePercent?: number;
    lastUpdated?: string;
    cashSettlement?: number;
    dateTime?: string;
    message?: string;
    dataPointsCount?: number;
}

export default function LiveSpotCard({
    lastUpdated,
    spotPrice = 2700.00,
    change = 13.00,
    changePercent = 0.48,
    unit = '/MT',
    apiUrl = '/api/metal-price?returnAverage=true',
    title = ""
}: LiveSpotCardProps) {
    const [priceData, setPriceData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dataPointsCount, setDataPointsCount] = useState<number>(0);

    useEffect(() => {
        const fetchPriceData = async () => {
            try {
                setLoading(true);
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        // Specifically handle case when no data exists in database
                        throw new Error('No price data available in database');
                    } else {
                        throw new Error(`Failed to fetch price data: ${response.status}`);
                    }
                }
                
                const data = await response.json();
                
                if (data.type === 'noData') {
                    // API returned success but with noData type
                    throw new Error(data.message || 'No price data available');
                }
                
                setPriceData(data);
                
                // Store the data points count if available
                if (data.type === 'averagePrice' && data.dataPointsCount) {
                    setDataPointsCount(data.dataPointsCount);
                }
                
                setError(null);
            } catch (err) {
                console.error('Error fetching price data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load price data');
            } finally {
                setLoading(false);
            }
        };

        // Fetch data immediately
        fetchPriceData();
        
        // Set up polling every 2 minutes for average price
        // Average price doesn't need to be updated as frequently
        const intervalId = setInterval(fetchPriceData, 2 * 60 * 1000);
        
        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, [apiUrl]);

    // Use API data if available, otherwise use props
    const displayTime = priceData?.lastUpdated
        ? parseISO(priceData.lastUpdated) 
        : (lastUpdated || new Date());
    
    const currentSpotPrice = priceData?.spotPrice !== undefined
        ? priceData.spotPrice 
        : spotPrice;
        
    const currentChange = priceData?.change !== undefined
        ? priceData.change 
        : change;
        
    const currentChangePercent = priceData?.changePercent !== undefined
        ? priceData.changePercent 
        : changePercent;
    
    const isIncrease = currentChange >= 0;
    const trendColor = isIncrease ? "text-green-600" : "text-red-600";
    const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

    // Determine if we're showing average price
    const isAveragePrice = priceData?.type === 'averagePrice';

    return (
        <div className="price-card bg-white rounded-xl p-3 md:p-4 border border-gray-200 
          shadow-sm hover:shadow-md transition-all duration-200 w-full
          relative overflow-hidden gpu-render group h-[162px]">
            
            {/* Background effect - properly layered */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity 
              ${isIncrease ? 'bg-green-500' : 'bg-red-500'} 
              -z-10`}></div>

            <div className="relative flex flex-col h-full gap-1 md:gap-2 justify-between">
                {/* Header with indicator badge */}
                <div>
                    {isAveragePrice ? (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1.5 mb-2">
                            <BarChart3 className="w-3.5 h-3.5 crisp-text" />
                            <span>Estimated Average CSP</span>
                        </div>
                    ) : (
                        <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1.5 mb-2">
                            <Clock className="w-3.5 h-3.5 crisp-text" />
                            <span>30 mins delay</span>
                        </div>
                    )}
                </div>

                {/* Price Content */}
                <div className="flex-1">
                    {loading ? (
                        <div className="py-1 md:py-2 h-[65px] flex flex-col justify-center">
                            <div className="h-6 w-28 md:w-32 bg-gray-200 animate-pulse mb-2 rounded"></div>
                            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                        </div>
                    ) : error ? (
                        <div className="h-[65px] flex flex-col justify-center">
                            <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-md p-3 mb-2">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                                Please check if data is available in the database
                            </div>
                        </div>
                    ) : (
                        <div className="h-[65px] flex flex-col justify-center">
                            <div className="flex items-baseline gap-2">
                                <span className="font-mono text-xl md:text-2xl font-bold text-indigo-600">
                                    ${currentSpotPrice.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500">{unit}</span>
                            </div>

                            <div className={`flex items-center gap-1.5 text-sm ${trendColor} mt-1.5 md:mt-2 font-medium`}>
                                <TrendIcon className="w-4 h-4 flex-shrink-0 crisp-text" />
                                <span className="whitespace-nowrap crisp-text">
                                    {isIncrease ? '+' : ''}{currentChangePercent.toFixed(2)}%
                                </span>
                            </div>
                            
                            {priceData?.message && (
                                <div className="text-xs text-gray-500 mt-1">
                                    {priceData.message}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with date and datapoints */}
                <div className="flex items-center justify-between mt-auto pt-2 text-xs text-gray-500">
                    <div className="font-medium antialiased subpixel-antialiased flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 crisp-text group-hover:text-indigo-600 transition-colors duration-300" />
                        <span className="crisp-text group-hover:text-indigo-800 transition-colors duration-300 font-bold">
                            {format(displayTime, 'dd. MMMM yyyy')}
                        </span>
                    </div>
                    {isAveragePrice && dataPointsCount > 0 && (
                        <div className="text-indigo-600 font-medium">
                            {dataPointsCount} datapoints
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}