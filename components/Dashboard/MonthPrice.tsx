import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Maximize2, LineChart, Info } from "lucide-react";
import { useExpandedComponents } from "../../context/ExpandedComponentsContext";
import ExpandedModalWrapper from "./ExpandedModalWrapper";

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  timestamp?: string;
  timeSpan?: string;
  isCached?: boolean;
  error?: string;
}

interface MonthPriceProps {
  expanded?: boolean;
}

export default function MonthPrice({ expanded = false }: MonthPriceProps) {
  const [showAddOptions, setShowAddOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [priceData, setPriceData] = useState<PriceData>({
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { addExpandedComponent } = useExpandedComponents();

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/price');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      
      console.log('Received data from API:', data);
      
      if (data.error) {
        setError(data.error);
      } else {
        setPriceData(data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Add click-away listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle add component selection
  const handleAddComponent = (componentType: 'LMEAluminium' | 'MCXAluminium' | 'RatesDisplay') => {
    addExpandedComponent(componentType);
    setShowAddOptions(false);
  };

  const { price, change, changePercent, timestamp, isCached } = priceData;
  const isIncrease = change >= 0;
  
  // Render expanded content
  const renderExpandedContent = () => (
    <>
      <div className="flex items-end justify-between w-full mb-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAddOptions(prev => !prev)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Add
          </button>
          {showAddOptions && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 py-1 border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50">
                Add to Dashboard
              </div>
              <div className="py-1">
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                  onClick={() => handleAddComponent('LMEAluminium')}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  LME Spot Price
                </button>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                  onClick={() => handleAddComponent('MCXAluminium')}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  MCX Aluminium
                </button>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                  onClick={() => handleAddComponent('RatesDisplay')}
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Exchange Rates
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Forward Price</span>
          {!isLoading && timestamp && (
            <div className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
              <span>Last Updated: {new Date(timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-baseline gap-1 mb-3">
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <span className="font-mono font-bold text-3xl text-purple-600">
                ${price.toFixed(2)}
              </span>
              <span className="text-gray-500">/MT</span>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="h-10 bg-gray-200 animate-pulse rounded-lg"></div>
        ) : error ? (
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-xs text-gray-500">Using default values</p>
          </div>
        ) : (
          <div className={`flex items-center gap-2 ${isIncrease ? "text-green-600" : "text-red-600"} bg-white p-2 rounded-lg border ${isIncrease ? "border-green-100" : "border-red-100"}`}>
            <div className={`p-1 rounded-full ${isIncrease ? "bg-green-100" : "bg-red-100"}`}>
              {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-sm font-medium">
                {isIncrease ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
              </span>
              <p className="text-xs text-gray-500">From previous close</p>
            </div>
          </div>
        )}
        
        {!isLoading && isCached && (
          <div className="mt-2 flex items-center gap-1 text-yellow-600 bg-yellow-50 p-1.5 rounded text-xs border border-yellow-100">
            <Info className="w-3.5 h-3.5" />
            <span>Showing cached data</span>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center gap-1.5 text-purple-700 mb-2">
          <LineChart className="w-3.5 h-3.5" />
          <h3 className="text-sm font-medium">Market Insight</h3>
        </div>
        
        <div className="space-y-3">
          {isLoading ? (
            <>
              <div className="h-3 bg-gray-200 animate-pulse rounded w-full"></div>
              <div className="h-3 bg-gray-200 animate-pulse rounded w-11/12"></div>
              <div className="h-3 bg-gray-200 animate-pulse rounded w-10/12"></div>
              <div className="h-3 bg-gray-200 animate-pulse rounded w-full"></div>
              <div className="h-3 bg-gray-200 animate-pulse rounded w-9/12"></div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-600">
                The 3-month futures price indicates market expectations for future aluminium delivery. The current {isIncrease ? "increase" : "decrease"} suggests {isIncrease ? "positive" : "negative"} market sentiment.
              </p>
              
              <p className="text-xs text-gray-600">
                Forward prices show where the market expects aluminium to trade in three months&apos; time, reflecting anticipated changes in supply and demand over that period.
              </p>
              
              <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Updated: {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</span>
                </div>
                <span>LME London</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
  
  // If expanded prop is true, render just the expanded content
  if (expanded) {
    return (
      <ExpandedModalWrapper
        title="3-Month Futures"
        subtitle="LME Aluminium Forward Price"
        componentType="MonthPrice"
      >
        {renderExpandedContent()}
      </ExpandedModalWrapper>
    );
  }

  return (
    <>
      {/* Regular Card View */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200">
        {/* Glow effect on hover - desktop only, without blur */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none bg-gradient-to-br from-purple-50/30 via-indigo-50/30 to-violet-50/30 hidden sm:block"></div>
        
        <div className="flex items-center justify-between mb-3 relative z-10">
          <h2 className="text-base font-bold text-purple-600">3-Month LME</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => addExpandedComponent('MonthPrice')}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-2 relative z-10">{error}</p>}
        {!isLoading && isCached && <p className="text-xs text-yellow-500 mb-2 relative z-10">Showing cached data</p>}

        <div className="flex items-baseline gap-1 relative z-10">
          {isLoading ? (
            <div className="h-7 w-20 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <span className="font-mono font-bold text-2xl text-purple-600">
                ${price.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">/MT</span>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="h-6 w-24 bg-gray-200 animate-pulse rounded mt-1.5"></div>
        ) : (
          <div className={`flex items-center gap-1.5 mt-1.5 ${isIncrease ? "text-green-600" : "text-red-600"} relative z-10`}>
            <div className={`p-0.5 rounded-full ${isIncrease ? "bg-green-100" : "bg-red-100"}`}>
              {isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
            <span className="text-sm font-medium">
              {isIncrease ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </span>
          </div>
        )}

        {!isLoading && timestamp && (
          <div className="text-xs text-gray-500 mt-2 relative z-10">
            Last updated: {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </>
  );
} 

