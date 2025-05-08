'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  TooltipProps,
} from 'recharts';

interface DataPoint {
  time: string;
  value: number;
  displayTime: string;
}

interface ApiResponse {
  success: boolean;
  data: DataPoint[];
  stats: {
    count: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    startPrice: number;
    endPrice: number;
    totalChange: number;
    totalChangePercent: number;
  };
  lastUpdated: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length > 0) {
    // Get the date and time from the ISO string
    const date = new Date(label);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Get the value directly from payload
    const price = payload[0]?.value !== undefined ? payload[0].value : 0;
    
    return (
      <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-lg">
        <p className="text-xs font-medium text-gray-500">{formattedDate} • {formattedTime}</p>
        <div className="flex items-center mt-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 mr-2"></div>
          <p className="text-lg font-bold text-gray-800">${price.toFixed(2)}</p>
        </div>
      </div>
    );
  }
  return null;
};

const TimeRangeSelector = ({ activeRange, setActiveRange }: { activeRange: string, setActiveRange: (range: string) => void }) => {
  const ranges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];
  
  return (
    <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg">
      {ranges.map(range => (
        <button
          key={range}
          onClick={() => setActiveRange(range)}
          className={`px-3 py-1 text-sm rounded-md transition-all ${
            activeRange === range
              ? 'bg-white shadow-sm text-emerald-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
};

const DateRangeSlider = ({ 
  data, 
  visibleStartIndex, 
  setVisibleStartIndex, 
  visibleDataPoints 
}: { 
  data: any[], 
  visibleStartIndex: number, 
  setVisibleStartIndex: (index: number) => void, 
  visibleDataPoints: number 
}) => {
  // Calculate max index (total data points minus visible window size)
  const maxIndex = Math.max(0, data.length - visibleDataPoints);
  
  // Format date for display
  const formatDate = (index: number) => {
    if (!data[index]) return '';
    const date = new Date(data[index].time);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Calculate visible days
  const visibleDays = () => {
    if (data.length === 0) return 0;
    const startDate = new Date(data[visibleStartIndex].time);
    const endIndex = Math.min(visibleStartIndex + visibleDataPoints - 1, data.length - 1);
    const endDate = new Date(data[endIndex].time);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  };
  
  // Calculate total days in the dataset
  const calculateTotalDays = () => {
    if (data.length === 0) return 0;
    const startDate = new Date(data[0].time);
    const endDate = new Date(data[data.length - 1].time);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  };
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Data Range Slider</span>
        <span className="text-xs text-gray-500">
          Showing {visibleDays()} of {calculateTotalDays()} days
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{formatDate(visibleStartIndex)}</span>
        <span>{formatDate(Math.min(visibleStartIndex + visibleDataPoints - 1, data.length - 1))}</span>
      </div>
      <input
        type="range"
        min="0"
        max={maxIndex}
        value={visibleStartIndex}
        onChange={(e) => setVisibleStartIndex(parseInt(e.target.value))}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:bg-gray-300 transition-colors"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Earliest Data ({formatDate(0)})</span>
        <span>Latest Data ({formatDate(data.length - 1)})</span>
      </div>
    </div>
  );
};

// Replace the arrow icons with simple SVG components
const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
  </svg>
);

const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.22 5.222a.75.75 0 011.06 0L7 9.94l3.172-3.172a.75.75 0 011.06 0l2.124 2.123a.75.75 0 010 1.06L8.53 14.78a.75.75 0 01-1.06 0L1.22 8.53a.75.75 0 010-1.06l.952-.952a.75.75 0 010-1.06L1.22 5.222z" clipRule="evenodd" />
  </svg>
);

export default function TrendsChart() {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<DataPoint[]>([]);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for visible data window
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleDataPoints, setVisibleDataPoints] = useState(50); // Default number of visible points

  // Transform date to display format for time axis
  const formatTimeForAxis = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Convert ISO string time to numeric value for the chart (minutes since midnight)
  const timeToMinutes = (timeString: string): number => {
    const date = new Date(timeString);
    return date.getHours() * 60 + date.getMinutes();
  };

  // Transform API data to include numeric time values for the chart
  const transformedData = trendData.map(point => ({
    ...point,
    timeValue: timeToMinutes(point.time)
  }));

  // Format chart data
  const formattedData = trendData.map((point, index) => ({
    ...point,
    // Create sequential index for easier x-axis management
    index
  }));
  
  // Get visible data window based on slider position
  const visibleData = useMemo(() => {
    if (formattedData.length === 0) return [];
    
    // Create normalized date objects for comparison (strip time component)
    const normalizedStartDate = new Date();
    normalizedStartDate.setDate(normalizedStartDate.getDate() - 30); // Default to last 30 days
    normalizedStartDate.setHours(0, 0, 0, 0); // Start of day
    
    const normalizedNow = new Date();
    normalizedNow.setHours(23, 59, 59, 999); // End of day
    
    // Log the normalized date range
    console.log(`Normalized date range: ${normalizedStartDate.toISOString()} to ${normalizedNow.toISOString()}`);
    
    // Log all May data points in the dataset
    const allMayPoints = formattedData.filter(point => {
      if (!point.displayDate) return false;
      return point.displayDate.includes('May');
    });
    
    console.log(`Total May points in dataset: ${allMayPoints.length}`);
    
    // Check each May data point against the normalized date range
    allMayPoints.forEach(point => {
      const pointDate = new Date(point.time);
      const pointDateOnly = new Date(pointDate);
      pointDateOnly.setHours(0, 0, 0, 0);
      
      const isAfterStart = pointDateOnly >= normalizedStartDate;
      const isBeforeNow = pointDateOnly <= normalizedNow;
      const isInRange = isAfterStart && isBeforeNow;
      
      // Log all May data points for debugging
      if (point.displayDate.includes('May')) {
        console.log(
          `May point check: ${point.displayDate}, ` +
          `Date only: ${pointDateOnly.toISOString()}, ` +
          `In range: ${isInRange}`
        );
      }
    });
    
    // Log the visible data range based on slider position
    if (formattedData.length > 0 && visibleStartIndex < formattedData.length) {
      const startPoint = formattedData[visibleStartIndex];
      const endIndex = Math.min(visibleStartIndex + visibleDataPoints - 1, formattedData.length - 1);
      const endPoint = formattedData[endIndex];
      
      if (startPoint && endPoint) {
        console.log(`Visible data range: ${startPoint.displayDate} to ${endPoint.displayDate}`);
      }
    }
    
    return formattedData.slice(
      visibleStartIndex, 
      Math.min(visibleStartIndex + visibleDataPoints, formattedData.length)
    );
  }, [formattedData, visibleStartIndex, visibleDataPoints]);

  // Generate time ticks based on the available data
  const generateTimeTicks = () => {
    if (transformedData.length === 0) return [];
    
    // Get min and max time values
    const timeValues = transformedData.map(d => d.timeValue);
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    
    // Generate ticks at regular intervals
    const ticks = [];
    const interval = 60; // Every hour
    
    for (let time = Math.floor(minTime / interval) * interval; time <= maxTime; time += interval) {
      ticks.push(time);
    }
    
    return ticks;
  };

  // Fetch data from the API
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching trend data');
        // Add a cache-busting parameter to prevent caching
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/trends_lme?cacheBust=${cacheBuster}`);
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        console.log('API response:', data);
        
        if (!data.success) {
          throw new Error('API reported failure');
        }
        
        if (!data.data || data.data.length === 0) {
          console.log('No data returned from API');
          setError('No trend data available');
          setTrendData([]);
          setStats(null);
          return;
        }
        
        console.log(`Retrieved ${data.data.length} data points`);
        
        // Add date normalization for more reliable comparisons
        const normalizedData = data.data.map(point => {
          // Extract date part for easier debugging
          const date = new Date(point.time);
          const displayDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
          });
          
          return {
            ...point,
            displayDate
          };
        });
        
        // Log date range information
        if (normalizedData.length > 0) {
          const dates = normalizedData.map(point => new Date(point.time));
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
          
          console.log(`Data date range: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
          
          // Count data points by date
          const dateCounts = {};
          normalizedData.forEach(point => {
            const dateKey = point.displayDate;
            dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
          });
          
          console.log('Data points by date:', dateCounts);
          
          // Log all May data points
          const mayDataPoints = normalizedData.filter(point => 
            point.displayDate.includes('May')
          );
          
          console.log(`Found ${mayDataPoints.length} data points for May`);
          
          // Extra logging for May 5-8 data points
          const may5to8Points = normalizedData.filter(point => 
            point.displayDate.includes('May 5') || 
            point.displayDate.includes('May 6') || 
            point.displayDate.includes('May 7') || 
            point.displayDate.includes('May 8')
          );
          
          console.log(`Found ${may5to8Points.length} data points for May 5-8`);
          may5to8Points.forEach(point => {
            const pointDate = new Date(point.time);
            console.log(`May 5-8 point: ${point.displayDate}, ISO time: ${point.time}, value: ${point.value}`);
          });
        }
        
        // Apply date filtering with normalized dates to ensure all data points are included
        const filteredData = normalizedData;
        
        setTrendData(filteredData);
        setStats(data.stats);
        
        // Reset the slider to show the most recent data when data changes
        if (filteredData.length > visibleDataPoints) {
          const newStartIndex = Math.max(0, filteredData.length - visibleDataPoints);
          console.log(`Setting visible start index to ${newStartIndex} to show most recent data`);
          setVisibleStartIndex(newStartIndex);
        } else {
          setVisibleStartIndex(0);
        }
      } catch (error) {
        console.error('Error fetching trend data:', error);
        setError('Failed to load trend data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendData();
    
    // Refresh data periodically (every 2 minutes)
    const intervalId = setInterval(fetchTrendData, 2 * 60 * 1000);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []); // Empty dependency array since we don't depend on timeRange anymore

  // Calculate chart range and stats
  const min = stats?.minPrice 
    ? Math.floor(stats.minPrice * 0.995) // 0.5% below min
    : transformedData.length > 0 
      ? Math.min(...transformedData.map(d => d.value)) * 0.995 
      : 0;
      
  const max = stats?.maxPrice 
    ? Math.ceil(stats.maxPrice * 1.005) // 0.5% above max
    : transformedData.length > 0 
      ? Math.max(...transformedData.map(d => d.value)) * 1.005 
      : 100;
      
  const avg = stats?.avgPrice || 0;

  // For display in the UI
  const timeTicks = generateTimeTicks();
  const currentValue = hoveredValue !== null 
    ? hoveredValue 
    : transformedData.length > 0 
      ? transformedData[transformedData.length - 1].value 
      : 0;
      
  const currentTime = hoveredTime !== null 
    ? hoveredTime 
    : transformedData.length > 0 
      ? formatTimeForAxis(transformedData[transformedData.length - 1].time)
      : '';
      
  const change = stats?.totalChange || 0;
  const changePercentage = stats?.totalChangePercent || 0;
  const isPositiveChange = change >= 0;

  return (
    <div className="w-full p-6 bg-gray-50 rounded-2xl">
      <div className="flex flex-col space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-800">LME CSP Price Trends</h2>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="h-[500px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-16 w-16 bg-emerald-200 rounded-full"></div>
                <div className="mt-4 h-4 w-36 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-500 font-medium mb-2">{error}</p>
                <p className="text-gray-500 text-sm">Please check your connection</p>
              </div>
            </div>
          ) : transformedData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 font-medium mb-2">No data available</p>
                <p className="text-gray-400 text-sm">Please check back later</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={visibleData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                onMouseMove={(e) => {
                  if (e.activePayload && e.activePayload.length > 0) {
                    setHoveredValue(e.activePayload[0].payload.value);
                    setHoveredTime(e.activePayload[0].payload.displayTime);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredValue(null);
                  setHoveredTime(null);
                }}
              >
                <defs>
                  <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  
                  {/* Vertical gradient for area fill */}
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop offset="30%" stopColor="#34D399" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#D1FAE5" stopOpacity={0.2} />
                  </linearGradient>
                  
                  {/* Animated gradient for enhanced visual effect */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feColorMatrix
                      in="blur"
                      mode="matrix"
                      values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 18 -7
                      "
                      result="glow"
                    />
                    <feBlend in="SourceGraphic" in2="glow" mode="normal" />
                  </filter>
                </defs>

                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="#E5E7EB" 
                />
                
                <XAxis 
                  dataKey="index"
                  type="number"
                  tickFormatter={(value) => {
                    // Get the original data point at this index
                    const point = formattedData[value];
                    if (!point) return '';
                    
                    // Format the time 
                    const date = new Date(point.time);
                    return date.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    });
                  }}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  padding={{ left: 0, right: 0 }}
                  interval={Math.ceil(formattedData.length / 10)} // Show approximately 10 ticks
                />
                
                <YAxis
                  domain={[min, max]}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                
                <Tooltip 
                  content={(props) => {
                    if (props.active && props.payload && props.payload.length > 0) {
                      const dataPoint = props.payload[0].payload;
                      const date = new Date(dataPoint.time);
                      
                      return (
                        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-lg">
                          <p className="text-xs font-medium text-gray-500">
                            {date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit'
                            })} • {
                            date.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <div className="flex items-center mt-1">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 mr-2"></div>
                            <p className="text-lg font-bold text-gray-800">${dataPoint.value.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{
                    stroke: '#10B981',
                    strokeWidth: 1,
                    strokeDasharray: '5 5',
                  }}
                />
                
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
                  stroke="url(#trendLineGradient)"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                  fillOpacity={1}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  dot={false}
                  activeDot={{
                    r: 6,
                    strokeWidth: 2,
                    fill: '#fff',
                    stroke: '#10B981',
                    filter: "url(#glow)"
                  }}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          </div>
          
          {/* Date Range Slider - only show when data is loaded */}
          {!loading && !error && trendData.length > visibleDataPoints && (
            <DateRangeSlider
              data={formattedData}
              visibleStartIndex={visibleStartIndex}
              setVisibleStartIndex={setVisibleStartIndex}
              visibleDataPoints={visibleDataPoints}
            />
          )}
        </div>
      </div>
    </div>
  );
}
