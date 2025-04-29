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
    averagePrice?: number; // Added to support average price data
}

export default function LiveSpotCard({
    lastUpdated,
    spotPrice = 2700.00,
    change = 13.00,
    changePercent = 0.48,
    unit = '/MT',
    apiUrl = '/api/metal-price?forceMetalPrice=true',
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
                setError(null); // Reset error state at start of fetch
                
                // Add timeout to prevent hanging requests
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                try {
                    const response = await fetch(apiUrl, { 
                        signal: controller.signal,
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                        }
                    });
                    
                    clearTimeout(timeoutId); // Clear timeout on successful response
                    
                    if (!response.ok) {
                        if (response.status === 404) {
                            setError('No price data available in database');
                        } else {
                            setError(`Failed to fetch price data: ${response.status}`);
                        }
                        setLoading(false);
                        return;
                    }
                    
                    const data = await response.json();
                    
                    if (data.type === 'noData') {
                        setError(data.message || 'No price data available');
                        setLoading(false);
                        return;
                    }
                    
                    setPriceData(data);
                    
                    // Store the data points count if available
                    if (data.type === 'averagePrice' && data.dataPointsCount) {
                        setDataPointsCount(data.dataPointsCount);
                    }
                    
                    setError(null);
                } catch (fetchErr) {
                    clearTimeout(timeoutId);
                    if (fetchErr.name === 'AbortError') {
                        setError('Request timed out. Please try again later.');
                    } else {
                        setError('Network error. Please check your connection.');
                        console.error('Fetch error:', fetchErr);
                    }
                }
            } catch (err) {
                console.error('Error in fetchPriceData:', err);
                setError('An unexpected error occurred');
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
    const displayTime = React.useMemo(() => {
        try {
            return priceData?.lastUpdated
                ? parseISO(priceData.lastUpdated) 
                : (lastUpdated || new Date());
        } catch (err) {
            console.error('Error parsing date:', err);
            return new Date(); // Fallback to current date on parse error
        }
    }, [priceData?.lastUpdated, lastUpdated]);
    
    // Prioritize average price when available (for averagePrice type)
    const currentSpotPrice = React.useMemo(() => {
        try {
            return priceData?.type === 'averagePrice' && priceData?.averagePrice !== undefined
                ? priceData.averagePrice
                : priceData?.spotPrice !== undefined
                    ? priceData.spotPrice 
                    : spotPrice;
        } catch (err) {
            console.error('Error calculating spot price:', err);
            return spotPrice; // Fallback to props on error
        }
    }, [priceData, spotPrice]);
        
    const currentChange = React.useMemo(() => {
        try {
            return priceData?.change !== undefined ? priceData.change : change;
        } catch (err) {
            console.error('Error calculating change:', err);
            return change; // Fallback to props on error
        }
    }, [priceData?.change, change]);
        
    const currentChangePercent = React.useMemo(() => {
        try {
            return priceData?.changePercent !== undefined ? priceData.changePercent : changePercent;
        } catch (err) {
            console.error('Error calculating change percent:', err);
            return changePercent; // Fallback to props on error
        }
    }, [priceData?.changePercent, changePercent]);
    
    const isIncrease = currentChange >= 0;
    const trendColor = isIncrease ? "text-green-600" : "text-red-600";
    const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

    // Determine if we're showing average price
    const isAveragePrice = priceData?.type === 'averagePrice';

    // Safe formatting functions
    const formatPrice = (price: number) => {
        try {
            return price.toFixed(2);
        } catch (err) {
            console.error('Error formatting price:', err);
            return '0.00';
        }
    };

    const formatPercent = (percent: number) => {
        try {
            return percent.toFixed(2);
        } catch (err) {
            console.error('Error formatting percent:', err);
            return '0.00';
        }
    };

    const formatDate = (date: Date) => {
        try {
            return format(date, 'dd. MMMM yyyy');
        } catch (err) {
            console.error('Error formatting date:', err);
            return 'Unknown date';
        }
    };

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
                                    ${formatPrice(currentSpotPrice)}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {isAveragePrice ? 'Average' : ''}{unit}
                                </span>
                            </div>

                            <div className={`flex items-center gap-1.5 text-sm ${trendColor} mt-1.5 md:mt-2 font-medium`}>
                                <TrendIcon className="w-4 h-4 flex-shrink-0 crisp-text" />
                                <span className="whitespace-nowrap crisp-text">
                                    {isIncrease ? '+' : ''}{formatPercent(currentChangePercent)}%
                                </span>
                                {isAveragePrice && (
                                    <span className="text-xs text-gray-500 ml-1">(first to latest)</span>
                                )}
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
                            {formatDate(displayTime)}
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