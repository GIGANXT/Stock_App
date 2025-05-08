'use client';

import React, { useState, useEffect } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine,
} from 'recharts';

// Static data for MCX months
const mcxData = {
    // May data will be fetched from API
    may: [],
    june: [
        { date: '2023-06-01', value: 2420 },
        { date: '2023-06-02', value: 2430 },
        { date: '2023-06-05', value: 2445 },
        { date: '2023-06-06', value: 2460 },
        { date: '2023-06-07', value: 2455 },
        { date: '2023-06-08', value: 2470 },
        { date: '2023-06-09', value: 2485 },
        { date: '2023-06-12', value: 2490 },
        { date: '2023-06-13', value: 2500 },
        { date: '2023-06-14', value: 2510 },
        { date: '2023-06-15', value: 2525 },
    ],
    july: [
        { date: '2023-07-03', value: 2530 },
        { date: '2023-07-04', value: 2545 },
        { date: '2023-07-05', value: 2560 },
        { date: '2023-07-06', value: 2550 },
        { date: '2023-07-07', value: 2565 },
        { date: '2023-07-10', value: 2580 },
        { date: '2023-07-11', value: 2590 },
        { date: '2023-07-12', value: 2600 },
        { date: '2023-07-13', value: 2615 },
        { date: '2023-07-14', value: 2630 },
        { date: '2023-07-17', value: 2645 },
    ],
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
        // Format the date
        const date = new Date(label);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
        });

        // Get the value directly from payload
        const price = payload[0]?.value !== undefined ? payload[0].value : 0;

        return (
            <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-lg">
                <p className="text-xs font-medium text-gray-500">{formattedDate}</p>
                <div className="flex items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 mr-2"></div>
                    <p className="text-lg font-bold text-gray-800">₹{price.toFixed(2)}</p>
                </div>
            </div>
        );
    }
    return null;
};

interface MCXMonthlyTrendsProps {
    initialMonth?: 'may' | 'june' | 'july';
}

export default function MCXMonthlyTrends({ initialMonth = 'may' }: MCXMonthlyTrendsProps) {
    const [activeMonth, setActiveMonth] = useState<'may' | 'june' | 'july'>(initialMonth);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [mayData, setMayData] = useState<Array<{ date: string, value: number }>>([]);
    const [stats, setStats] = useState<{ min: number, max: number, avg: number }>({ min: 0, max: 0, avg: 0 });

    // Fetch May data from API
    useEffect(() => {
        const fetchMayData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/mcx_current_month');
                if (!response.ok) {
                    throw new Error('Failed to fetch MCX data');
                }
                const data = await response.json();

                if (data.success && data.data) {
                    // Format the data for the chart
                    const formattedData = data.data.map((item: any) => ({
                        date: item.date,
                        value: item.value
                    }));

                    // Update the may data
                    setMayData(formattedData);

                    // Update stats
                    if (data.stats) {
                        setStats({
                            min: data.stats.minPrice * 0.995, // 0.5% below min
                            max: data.stats.maxPrice * 1.005, // 0.5% above max
                            avg: data.stats.avgPrice
                        });
                    }
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch data');
                console.error('Error fetching MCX data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMayData();
    }, []);

    // Get data for the active month
    const currentData = activeMonth === 'may' ? mayData : mcxData[activeMonth];

    // Calculate min, max, and average values
    let min, max, avg;

    if (activeMonth === 'may' && mayData.length > 0) {
        // Use pre-calculated stats for May
        min = stats.min;
        max = stats.max;
        avg = stats.avg;
    } else {
        // Calculate for other months using static data
        const values = currentData.map(item => item.value);
        min = values.length > 0 ? Math.min(...values) * 0.995 : 0; // 0.5% below min
        max = values.length > 0 ? Math.max(...values) * 1.005 : 0; // 0.5% above max
        avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    // Show loading state
    if (loading && activeMonth === 'may') {
        return (
            <div className="w-full p-6 bg-gray-50 rounded-2xl mt-8">
                <div className="flex flex-col space-y-6">
                    {/* Title */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                            <h2 className="text-xl font-bold text-gray-800">MCX Aluminum Price Trends</h2>
                        </div>
                    </div>

                    {/* Loading state */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex items-center justify-center h-[400px]">
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                            <p className="text-gray-500">Loading MCX data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error && activeMonth === 'may') {
        return (
            <div className="w-full p-6 bg-gray-50 rounded-2xl mt-8">
                <div className="flex flex-col space-y-6">
                    {/* Title */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                            <h2 className="text-xl font-bold text-gray-800">MCX Aluminum Price Trends</h2>
                        </div>
                    </div>

                    {/* Error state */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex items-center justify-center h-[400px]">
                        <div className="flex flex-col items-center text-center">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <p className="text-gray-700 font-medium">Failed to load MCX data</p>
                            <p className="text-gray-500 mt-2">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Format data for the chart
    const formattedData = currentData.map((item, index) => ({
        ...item,
        index
    }));

    return (
        <div className="w-full p-6 bg-gray-50 rounded-2xl mt-8">
            <div className="flex flex-col space-y-6">
                {/* Title */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <h2 className="text-xl font-bold text-gray-800">MCX Aluminum Price Trends</h2>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={formattedData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                            >
                                <defs>
                                    <linearGradient id="mcxLineGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#3B82F6" />
                                        <stop offset="100%" stopColor="#60A5FA" />
                                    </linearGradient>

                                    {/* Vertical gradient for area fill */}
                                    <linearGradient id="mcxAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                                        <stop offset="30%" stopColor="#60A5FA" stopOpacity={0.7} />
                                        <stop offset="95%" stopColor="#DBEAFE" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#E5E7EB"
                                />

                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    padding={{ left: 0, right: 0 }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.getDate().toString();
                                    }}
                                />

                                <YAxis
                                    domain={[min, max]}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                                />

                                <Tooltip content={<CustomTooltip />} />

                                <ReferenceLine
                                    y={avg}
                                    stroke="#9CA3AF"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    label={{
                                        value: 'Avg',
                                        position: 'right',
                                        fill: '#6B7280',
                                        fontSize: 10
                                    }}
                                />

                                {/* Main Area with gradient fill */}
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="url(#mcxLineGradient)"
                                    strokeWidth={2.5}
                                    fill="url(#mcxAreaGradient)"
                                    fillOpacity={1}
                                    animationDuration={1500}
                                    animationEasing="ease-in-out"
                                    dot={false}
                                    activeDot={{
                                        r: 6,
                                        strokeWidth: 2,
                                        fill: '#fff',
                                        stroke: '#3B82F6',
                                    }}
                                    isAnimationActive={true}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}