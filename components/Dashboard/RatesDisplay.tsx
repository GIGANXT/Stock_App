import React, { useState, useEffect, useRef } from "react";
import { Maximize2, RefreshCw, ArrowUpRight, Banknote } from "lucide-react";
import { format } from "date-fns";
import { useExpandedComponents } from "../../context/ExpandedComponentsContext";
import ExpandedModalWrapper from "./ExpandedModalWrapper";

interface RatesDisplayProps {
  className?: string;
  expanded?: boolean;
}

export default function RatesDisplay({ className = "", expanded = false }: RatesDisplayProps) {
  const [showAddOptions, setShowAddOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [rbiRate, setRbiRate] = useState<number | null>(null);
  const [sbiRate, setSbiRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Fetch RBI rate from Next.js API
  const fetchRbiRate = async () => {
    try {
      const response = await fetch("/api/rbi"); // Calls your Next.js API
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch data");
      }

      if (result.data && result.data.length > 0) {
        setRbiRate(parseFloat(result.data[0].rate)); // Convert string to number
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching RBI rate:", error);
      setError("Failed to fetch RBI rate");
    }
  };

  // Fetch SBI TT rate from Next.js API
  const fetchSbiRate = async () => {
    try {
      const response = await fetch("/api/sbitt"); // Calls your Next.js API
      
      if (!response.ok) {
        throw new Error("Failed to fetch SBI data");
      }
      
      const result = await response.json();
      
      console.log("🔍 Response from Next.js API:", result);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch SBI data");
      }
      
      if (result.data && result.data.length > 0) {
        setSbiRate(parseFloat(result.data[0].sbi_tt_sell)); // Convert string to number
        
        // If data is from database, show a message
        if (result.source === "database") {
          console.log("⚠️ Using cached data from database");
          setError("Using cached SBI rate due to API unavailability");
        } else {
          console.log("✅ Using live data from API");
          setError(null);
        }
      }
    } catch (error) {
      console.error("🚨 Error fetching SBI rate:", error);
      setError("Failed to fetch SBI rate");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchRbiRate(), fetchSbiRate()]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData(); // Fetch data on mount
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError(null);
    Promise.all([fetchRbiRate(), fetchSbiRate()]).finally(() =>
      setIsRefreshing(false)
    );
  };

  // Handle add component selection
  const handleAddComponent = (componentType: 'LMEAluminium' | 'MonthPrice' | 'MCXAluminium') => {
    addExpandedComponent(componentType);
    setShowAddOptions(false);
  };

  const RateSection = ({ isRBI = true, expanded = false }) => {
    const rate = isRBI ? rbiRate : sbiRate;
    const label = isRBI ? "RBI Rate" : "SBI Rate";

    return (
      <div className={expanded ? "space-y-4" : "space-y-3"}>
        <div className="flex items-center justify-between">
          <span
            className={`font-medium text-gray-700 ${
              expanded ? "text-lg" : "text-sm"
            }`}
          >
            {label}
          </span>
          {expanded && (
            <a
              href={isRBI ? "https://www.rbi.org.in" : "https://www.sbi.co.in"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              Source <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <span
            className={`font-mono font-bold bg-gradient-to-r ${
              isRBI
                ? "from-blue-600 to-purple-600"
                : "from-purple-600 to-pink-600"
            } bg-clip-text text-transparent ${
              expanded ? "text-5xl" : "text-3xl"
            }`}
          >
            ₹{rate !== null ? rate.toFixed(4) : "Loading..."}
          </span>
          <span className={`text-gray-500 ${expanded ? "text-sm" : "text-xs"}`}>
            /USD
          </span>
        </div>

        {isRBI && <div className="h-[24px]"></div>}
      </div>
    );
  };

  // Expanded content
  const renderExpandedContent = () => (
    <>
      {isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Refreshing rates...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">RBI Reference Rate</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono font-bold text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ₹{rbiRate !== null ? rbiRate.toFixed(4) : "Loading..."}
                </span>
                <span className="text-gray-500 text-sm">/USD</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Updated daily by Reserve Bank of India
              </div>
            </div>

            <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">SBI TT Selling Rate</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono font-bold text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ₹{sbiRate !== null ? sbiRate.toFixed(4) : "Loading..."}
                </span>
                <span className="text-gray-500 text-sm">/USD</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {error && error.includes("cached") ? (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <span>⚠️ Using cached data</span>
                  </div>
                ) : (
                  "Real-time TT selling rate from SBI"
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Last updated: {format(lastUpdated, "HH:mm:ss, dd MMM")}</span>
              </div>
              <button
                onClick={handleRefresh}
                className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  // Display loading state when no data is available
  if (isLoading && !expanded) {
    return (
      <div className={`relative bg-white rounded-xl p-4 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] min-h-[260px] flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <span className="text-gray-600">Loading rates...</span>
          {error && <span className="text-red-500 text-sm mt-2">{error}</span>}
        </div>
      </div>
    );
  }

  // If expanded prop is true, render just the expanded content
  if (expanded) {
    return (
      <ExpandedModalWrapper
        title="Exchange Rates"
        subtitle="Live Currency Rates"
        componentType="RatesDisplay"
      >
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
                    onClick={() => handleAddComponent('MonthPrice')}
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    3-Month LME
                  </button>
                  <button 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
                    onClick={() => handleAddComponent('MCXAluminium')}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    MCX Aluminium
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {renderExpandedContent()}
      </ExpandedModalWrapper>
    );
  }

  return (
    <>
      <div
        className={`relative bg-white rounded-xl p-4 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-200 min-h-[260px] group ${className}`}
      >
        {/* Glow effect on hover - desktop only */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 hidden sm:block"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              Exchange Rates
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Refresh rates"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
            <button
              onClick={() => addExpandedComponent('RatesDisplay')}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              aria-label="Expand view"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-4rem)] relative z-10">
          <div className="flex-1 flex flex-col justify-evenly">
            <RateSection isRBI={true} />
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2" />
            <RateSection isRBI={false} />
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Updated: {format(lastUpdated, "MMM d, HH:mm")}</span>
              </div>
              {error && (
                <div className="text-xs text-yellow-600 flex items-center gap-1">
                  {error.includes("cached") ? "⚠️ Using cached data" : error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
