'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

type IndexType = 'LME_CSP' | 'LME_3M' | 'MCX_MAR' | 'MCX_APR' | 'MCX_MAY' | 'MCX_ALL';
type ViewType = 'line' | 'candle';

interface OhlcData {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MetalPriceData {
  time: string;
  value: number;
  change: number;
  lastUpdated: string;
  createdAt: string;
}

interface ChartData {
  time: string;
  lmeCsp: number;
  lme3m?: number;
  mcxMar?: number;
  mcxApr?: number;
  mcxMay?: number;
  lmeCspOhlc?: OhlcData;
  lme3mOhlc?: OhlcData;
  mcxMarOhlc?: OhlcData;
  mcxAprOhlc?: OhlcData;
  mcxMayOhlc?: OhlcData;
}

interface CandleStickProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: ChartData;
  dataKey: string;
  yAxis?: {
    scale: (value: number) => number;
  };
}

interface TooltipPayload {
  name?: string;
  dataKey: string;
  value: number;
  color: string;
  payload: ChartData;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface BarShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: ChartData;
  dataKey: string;
  yAxis: {
    scale: (value: number) => number;
  };
}

const CandleStick = (props: CandleStickProps) => {
  const { x, width, payload, dataKey, yAxis } = props;
  
  // Get the OHLC data based on dataKey
  const ohlcKey = `${dataKey}Ohlc` as keyof ChartData;
  const ohlc = payload[ohlcKey] as OhlcData;
  
  if (!ohlc || !yAxis?.scale) return null;

  const { open, high, low, close } = ohlc;
  const isUp = close >= open;
  const color = isUp ? '#10B981' : '#EF4444'; // Green for up, red for down
  const candleWidth = width * 0.8; // Wider candles for better visibility
  const candleX = x + (width - candleWidth) / 2;

  // Use the yAxis scale to convert values to coordinates
  const scale = yAxis.scale;

  // Calculate coordinates for each part of the candle
  const highY = scale(high);
  const lowY = scale(low);
  const openY = scale(open);
  const closeY = scale(close);

  // Determine the top and bottom of the candle body
  const bodyTop = isUp ? closeY : openY;
  const bodyBottom = isUp ? openY : closeY;
  const bodyHeight = Math.max(2, bodyBottom - bodyTop); // Minimum height of 2px for visibility

  return (
    <g>
      {/* Wick (high to low) */}
      <line
        x1={x + width / 2}
        y1={highY}
        x2={x + width / 2}
        y2={lowY}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Candle body */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={isUp ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'} // Semi-transparent fill
        stroke={color}
        strokeWidth={1.5}
        rx={1}
        ry={1}
      />
    </g>
  );
};

export default function TrendsPage() {
  const [viewType, setViewType] = useState<ViewType>('line');
  const [selectedIndices, setSelectedIndices] = useState<IndexType[]>(['LME_CSP']);
  const [metalPrices, setMetalPrices] = useState<MetalPriceData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('all'); // 'all', 'day', 'week', 'month'
  const [showChartStats, setShowChartStats] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching data...");
      
      const response = await fetch('/api/metal-trends');
      
      if (!response.ok) {
        throw new Error('Failed to fetch metal price data');
      }
      
      const result = await response.json();
      console.log("API response:", result);
      
      if (result.success) {
        console.log("API Data received:", result.data.length, "records");
        setMetalPrices(result.data);
        processChartData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch metal price data');
      }
    } catch (err) {
      console.error('Error fetching metal price data:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const seedTestData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/seed-metal-prices', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to seed test data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log("Seeded data:", result);
        fetchData(); // Fetch the newly seeded data
      } else {
        throw new Error(result.error || 'Failed to seed test data');
      }
    } catch (err) {
      console.error('Error seeding test data:', err);
      setError((err as Error).message);
      setLoading(false);
    }
  };

  // Process data to create chart data with 30 minute intervals
  const processChartData = (data: MetalPriceData[]) => {
    if (!data || data.length === 0) {
      console.log("No data to process");
      return;
    }

    console.log("Processing", data.length, "data points");

    // Group data by 30-minute intervals
    const groupedData: Record<string, MetalPriceData[]> = {};
    
    data.forEach(item => {
      try {
        const date = new Date(item.lastUpdated);
        // Create 30-minute interval key (e.g., "14:00", "14:30")
        const hour = date.getHours();
        const minute = date.getMinutes() < 30 ? 0 : 30;
        const intervalKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        if (!groupedData[intervalKey]) {
          groupedData[intervalKey] = [];
        }
        
        groupedData[intervalKey].push(item);
      } catch (err) {
        console.error("Error processing data point:", item, err);
      }
    });

    console.log("Grouped data keys:", Object.keys(groupedData));

    // Convert grouped data to chart format
    const formattedData: ChartData[] = Object.keys(groupedData)
      .sort()
      .map(intervalKey => {
        const prices = groupedData[intervalKey];
        
        if (prices.length === 0) return null;

        // For OHLC data, we need to calculate open, high, low, close from the group
        // Sort by timestamp to ensure correct calculation
        const sortedPrices = [...prices].sort((a, b) => 
          new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
        );
        
        // First price in the interval is the open price
        const open = sortedPrices[0]?.value || 0;
        
        // Last price in the interval is the close price
        const close = sortedPrices[sortedPrices.length - 1]?.value || 0;
        
        // Highest price in the interval
        const high = Math.max(...sortedPrices.map(p => p.value));
        
        // Lowest price in the interval
        const low = Math.min(...sortedPrices.map(p => p.value));
        
        return {
          time: intervalKey,
          lmeCsp: close,
          lmeCspOhlc: {
            open,
            high,
            low,
            close
          }
        };
      })
      .filter(Boolean) as ChartData[]; // Filter out null values
    
    console.log("Formatted chart data:", formattedData);
    setChartData(formattedData);
  };

  const handleIndexChange = (index: IndexType) => {
    if (index === 'MCX_ALL') {
      if (selectedIndices.some(i => i === 'LME_CSP' || i === 'LME_3M')) {
        alert("You can't select all MCX months with LME indices");
        return;
      }
      setSelectedIndices(['MCX_ALL']);
      return;
    }

    let newIndices = [...selectedIndices];
    if (newIndices.includes(index)) {
      newIndices = newIndices.filter(i => i !== index);
    } else {
      if ((index === 'LME_CSP' || index === 'LME_3M') && newIndices.includes('MCX_ALL')) {
        alert("You can't select LME indices with all MCX months");
        return;
      }
      if (newIndices.includes('MCX_ALL')) {
        newIndices = [index];
      } else {
        newIndices.push(index);
      }
    }
    setSelectedIndices(newIndices);
  };

  const getLineColor = (index: string) => {
    switch (index) {
      case 'lmeCsp': return '#3B82F6';
      case 'lme3m': return '#8B5CF6';
      case 'mcxMar': return '#10B981';
      case 'mcxApr': return '#F59E0B';
      case 'mcxMay': return '#EC4899';
      default: return '#3B82F6';
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          {payload.map((entry) => {
            const name = entry.name || entry.dataKey;
            const isLme = name.startsWith('lme');
            const prefix = isLme ? '$' : '₹';

            if (viewType === 'candle') {
              const ohlcKey = `${entry.dataKey}Ohlc` as keyof ChartData;
              const ohlc = entry.payload[ohlcKey] as OhlcData;
              if (!ohlc) return null;
              
              // Calculate the price change and color based on whether price went up or down
              const priceChange = ohlc.close - ohlc.open;
              const changePercent = ((priceChange / ohlc.open) * 100).toFixed(2);
              const changeColor = priceChange >= 0 ? '#10B981' : '#EF4444';
              const changeSymbol = priceChange >= 0 ? '▲' : '▼';
              
              return (
                <div key={name} className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-medium" style={{ color: entry.color }}>
                      {name === 'lmeCsp' ? 'LME CSP' :
                       name === 'lme3m' ? 'LME 3M' :
                       name === 'mcxMar' ? 'MCX Mar' :
                       name === 'mcxApr' ? 'MCX Apr' : 'MCX May'}
                    </span>
                  </div>
                  
                  {/* OHLC Data with better formatting */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4 mt-1">
                    <div>Open: <span className="font-medium">{prefix}{ohlc.open.toFixed(2)}</span></div>
                    <div>Close: <span className="font-medium">{prefix}{ohlc.close.toFixed(2)}</span></div>
                    <div>High: <span className="font-medium">{prefix}{ohlc.high.toFixed(2)}</span></div>
                    <div>Low: <span className="font-medium">{prefix}{ohlc.low.toFixed(2)}</span></div>
                  </div>
                  
                  {/* Price change summary */}
                  <div className="mt-1 pl-4 font-medium" style={{ color: changeColor }}>
                    {changeSymbol} {prefix}{Math.abs(priceChange).toFixed(2)} ({changePercent}%)
                  </div>
                </div>
              );
            }

            return (
              <div key={name} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium" style={{ color: entry.color }}>
                  {name === 'lmeCsp' ? 'LME CSP' :
                   name === 'lme3m' ? 'LME 3M' :
                   name === 'mcxMar' ? 'MCX Mar' :
                   name === 'mcxApr' ? 'MCX Apr' : 'MCX May'}:
                </span>
                <span className="text-gray-600">
                  {prefix}{entry.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Filter data based on selected time range
  const getFilteredChartData = () => {
    if (!chartData || chartData.length === 0) return [];
    
    if (timeRange === 'all') return chartData;
    
    const now = new Date();
    let filterDate = new Date();
    
    switch (timeRange) {
      case 'day':
        filterDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      default:
        return chartData;
    }
    
    return chartData.filter(item => {
      const itemDate = new Date(`${new Date().toDateString()} ${item.time}`);
      return itemDate >= filterDate;
    });
  };

  // Calculate chart statistics
  const getChartStats = () => {
    if (!chartData || chartData.length === 0) return null;
    
    const filteredData = getFilteredChartData();
    if (filteredData.length === 0) return null;
    
    const firstPrice = filteredData[0]?.lmeCsp || 0;
    const lastPrice = filteredData[filteredData.length - 1]?.lmeCsp || 0;
    const priceChange = lastPrice - firstPrice;
    const percentChange = ((priceChange / firstPrice) * 100);
    
    const prices = filteredData.map(item => item.lmeCsp);
    const highPrice = Math.max(...prices);
    const lowPrice = Math.min(...prices);
    
    return {
      open: firstPrice,
      close: lastPrice,
      high: highPrice,
      low: lowPrice,
      change: priceChange,
      changePercent: percentChange
    };
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      );
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-gray-500 mb-4">No data available in the database</div>
          <p className="text-sm text-gray-400 mb-4">You need to add metal price data to the database to see trends</p>
          <div className="flex gap-2">
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Refresh Data
            </button>
            <button 
              onClick={seedTestData}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Add Test Data
            </button>
          </div>
        </div>
      );
    }

    const filteredData = getFilteredChartData();
    
    if (filteredData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-gray-500 mb-2">No data available for selected time range</div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setTimeRange('all')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
            >
              Show All Data
            </button>
            <button 
              onClick={seedTestData}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
            >
              Add Test Data
            </button>
          </div>
        </div>
      );
    }

    if (viewType === 'line') {
      return (
        <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="time"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="lme"
            orientation="left"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            stroke="#3B82F6"
            tick={{ fill: '#3B82F6', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {selectedIndices.includes('LME_CSP') && (
            <Line
              yAxisId="lme"
              type="monotone"
              dataKey="lmeCsp"
              name="LME CSP"
              stroke={getLineColor('lmeCsp')}
              strokeWidth={2}
              dot={true}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      );
    } else {
      return (
        <ComposedChart
          data={filteredData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="time"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="lme"
            orientation="left"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            stroke="#3B82F6"
            tick={{ fill: '#3B82F6', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
            padding={{ top: 20, bottom: 20 }}
          />
          <Tooltip content={<CustomTooltip />} />

          {selectedIndices.includes('LME_CSP') && (
            <Bar
              yAxisId="lme"
              dataKey="lmeCspOhlc"
              name="LME CSP"
              shape={CandleStick}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      );
    }
  };

  // Get chart stats for displaying summary
  const stats = getChartStats();
  const isPositiveChange = stats ? stats.change >= 0 : false;

  return (
    <div className="max-w-[1366px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Metal Price Trends</h1>

      {/* Chart statistics summary - shown when data is available */}
      {showChartStats && !loading && stats && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">LME CSP</div>
              <div className="text-2xl font-bold">${stats.close.toFixed(2)}</div>
              <div className="flex items-center">
                <span className={`${isPositiveChange ? 'text-green-500' : 'text-red-500'} font-medium flex items-center`}>
                  {isPositiveChange ? '▲' : '▼'} ${Math.abs(stats.change).toFixed(2)} ({stats.changePercent.toFixed(2)}%)
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {timeRange === 'all' ? 'All time' : 
                   timeRange === 'day' ? 'Last 24 hours' : 
                   timeRange === 'week' ? 'Last week' : 'Last month'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <div className="text-xs text-gray-500">Open</div>
                <div className="font-medium">${stats.open.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Close</div>
                <div className="font-medium">${stats.close.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">High</div>
                <div className="font-medium">${stats.high.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Low</div>
                <div className="font-medium">${stats.low.toFixed(2)}</div>
              </div>
            </div>
            <button 
              onClick={() => setShowChartStats(false)} 
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close stats"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Chart controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Time range selector */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 text-sm font-medium ${
                timeRange === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTimeRange('day')}
              className={`px-3 py-1.5 text-sm font-medium ${
                timeRange === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1.5 text-sm font-medium ${
                timeRange === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 text-sm font-medium ${
                timeRange === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
          </div>

          {/* Chart type selector */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setViewType('line')}
              className={`px-4 py-2 text-sm font-medium ${
                viewType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Line View
            </button>
            <button
              onClick={() => setViewType('candle')}
              className={`px-4 py-2 text-sm font-medium ${
                viewType === 'candle'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Candle View
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleIndexChange('LME_CSP')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('LME_CSP')
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              LME CSP
            </button>
          </div>
          
          <div className="ml-auto">
            <button 
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      
      {!loading && chartData.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
          <div>
            Showing {getFilteredChartData().length} of {chartData.length} data points with 30-minute intervals
          </div>
          {!showChartStats && stats && (
            <button 
              onClick={() => setShowChartStats(true)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Show Price Summary
            </button>
          )}
        </div>
      )}
    </div>
  );
}