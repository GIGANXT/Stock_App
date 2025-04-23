'use client';

import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Maximize2, Wifi, LineChart, RefreshCw, BarChart2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useExpandedComponents } from "../../context/ExpandedComponentsContext";
import ExpandedModalWrapper from "./ExpandedModalWrapper";

interface PriceData {
    spotPrice: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
}

interface LMEAluminiumProps {
  expanded?: boolean;
}

export default function LMEAluminium({ expanded = false }: LMEAluminiumProps) {
  const [showAddOptions, setShowAddOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addExpandedComponent } = useExpandedComponents();

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

  const fetchPriceData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/metal-price');
      
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
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceData();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchPriceData, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Use API data if available, otherwise use default values
  const spotPrice = priceData?.spotPrice || 2650;
  const spotChange = priceData?.change || 0;
  const spotChangePercent = priceData?.changePercent || 0;
  const displayedTime = priceData?.lastUpdated 
    ? parseISO(priceData.lastUpdated) 
    : new Date();
  const isIncrease = spotChange >= 0;

  // Handle add component selection
  const handleAddComponent = (componentType: 'MCXAluminium' | 'MonthPrice' | 'RatesDisplay') => {
    addExpandedComponent(componentType);
    setShowAddOptions(false);
  };

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
                  onClick={() => handleAddComponent('MCXAluminium')}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  MCX Aluminium
                </button>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                  onClick={() => handleAddComponent('MonthPrice')}
                >
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  3-Month LME
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
            onClick={fetchPriceData}
            disabled={isRefreshing}
            className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading price data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <p className="text-sm text-red-500">{error}</p>
          <p className="text-xs text-gray-500">Using default values</p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Current Spot Price</span>
              <div className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                <span>Last Updated: {format(displayedTime, 'HH:mm:ss')}</span>
              </div>
            </div>
            
            <div className="flex items-baseline gap-1 mb-3">
              <span className="font-mono font-bold text-3xl text-blue-600">
                ${spotPrice.toFixed(2)}
              </span>
              <span className="text-gray-500">/MT</span>
            </div>

            <div className={`flex items-center gap-2 ${isIncrease ? "text-green-600" : "text-red-600"} bg-white p-2 rounded-lg border ${isIncrease ? "border-green-100" : "border-red-100"}`}>
              <div className={`p-1 rounded-full ${isIncrease ? "bg-green-100" : "bg-red-100"}`}>
                {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-sm font-medium">
                  {isIncrease ? "+" : ""}
                  {spotChange.toFixed(2)} ({isIncrease ? "+" : ""}
                  {spotChangePercent.toFixed(2)}%)
                </span>
                <p className="text-xs text-gray-500">From previous close</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center gap-1.5 text-blue-700 mb-2">
              <LineChart className="w-3.5 h-3.5" />
              <h3 className="text-sm font-medium">Market Insight</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                The current spot price reflects immediate market conditions for aluminium delivery. Today&apos;s {isIncrease ? "increase" : "decrease"} indicates {isIncrease ? "strengthening" : "weakening"} demand in the physical market.
              </p>
              
              <p className="text-xs text-gray-600">
                LME spot prices are a benchmark for the global aluminium market, representing the cost of physically delivered aluminium. Price changes can be influenced by supply and demand dynamics, energy costs, and global economic conditions.
              </p>
              
              <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  <span>Updated: {format(displayedTime, 'HH:mm:ss, dd MMM yyyy')}</span>
                </div>
                <span>LME London</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  // If expanded prop is true, render just the expanded content
  if (expanded) {
    return (
      <ExpandedModalWrapper
        title="LME Aluminium"
        subtitle="Spot Price"
        componentType="LMEAluminium"
      >
        {renderExpandedContent()}
      </ExpandedModalWrapper>
    );
  }

  return (
    <>
      {/* Regular Card View */}
      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-200 min-h-[148px] relative">
        {/* Glow effect on hover - desktop only, without blur */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none bg-gradient-to-br from-blue-50/30 via-indigo-50/30 to-purple-50/30 hidden sm:block"></div>
        
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping" />
              </div>
            </div>
            <h2 className="text-base font-bold text-blue-600">Spot Price</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchPriceData}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => addExpandedComponent('LMEAluminium')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              aria-label="Expand view"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="relative z-10">
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded mb-2"></div>
            <div className="h-6 w-36 bg-gray-200 animate-pulse rounded"></div>
          </div>
        ) : error ? (
          <div className="relative z-10">
            <p className="text-sm text-red-500 mb-1">{error}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-blue-600">
                ${spotPrice.toFixed(2)}
              </span>
              <span className="text-gray-500">/MT</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Using default values</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="font-mono font-bold text-3xl text-blue-600">
                ${spotPrice.toFixed(2)}
              </span>
              <span className="text-gray-500">/MT</span>
            </div>

            <div className={`flex items-center gap-2 mt-2 ${isIncrease ? "text-green-600" : "text-red-600"} relative z-10`}>
              <div className={`p-1 rounded-full ${isIncrease ? "bg-green-100" : "bg-red-100"}`}>
                {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <span className="font-medium">
                {isIncrease ? "+" : ""}
                {spotChange.toFixed(2)} ({isIncrease ? "+" : ""}
                {spotChangePercent.toFixed(2)}%)
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

