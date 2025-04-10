import React, { useState, useEffect } from "react";
import { Maximize2, RefreshCw, ArrowUpRight, Banknote, X } from "lucide-react";
import { format } from "date-fns";

interface RatesDisplayProps {
  className?: string;
}

export default function RatesDisplay({ className = "" }: RatesDisplayProps) {
  const [showExpanded, setShowExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [rbiRate, setRbiRate] = useState<number | null>(null);
  const [sbiRate, setSbiRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const text = await response.text(); // Read raw response

      console.log("🔍 Raw response from Next.js API:", text); // Debugging output

      const result = JSON.parse(text); // Convert text to JSON

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch SBI data");
      }

      if (result.data && result.data.length > 0) {
        setSbiRate(parseFloat(result.data[0].sbi_tt_sell)); // Convert string to number
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
              expanded ? "text-5xl" : "text-4xl"
            }`}
          >
            ₹{rate !== null ? rate.toFixed(4) : "Loading..."}
          </span>
          <span className={`text-gray-500 ${expanded ? "text-sm" : "text-xs"}`}>
            /USD
          </span>

          <span
            className={`ml-auto px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-100 text-green-800`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Live
          </span>
        </div>

        {isRBI && <div className="h-[24px]"></div>}
      </div>
    );
  };

  // Display loading state when no data is available
  if (isLoading) {
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
              onClick={() => setShowExpanded(true)}
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
              {error && <div className="text-xs text-red-500">{error}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Modal View */}
      {showExpanded && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto border border-gray-200">
            <div className="flex items-center justify-between w-full mb-6 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Exchange Rates
                </h2>
              </div>
              <button
                onClick={() => setShowExpanded(false)}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition text-gray-700"
                aria-label="Close expanded view"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {isRefreshing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-500">Refreshing rates...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-8">
                  {/* RBI Rate Box */}
                  <div className="flex-1 bg-blue-50/50 p-4 sm:p-6 rounded-xl border border-blue-100">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Banknote className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          RBI Reference Rate
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-mono font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          ₹{rbiRate !== null ? rbiRate.toFixed(4) : "Loading..."}
                        </span>
                        <span className="text-gray-500 text-sm">/USD</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-4 sm:mb-6">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Daily reference rate</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Live</span>
                      </div>
                      <div className="mt-auto">
                        <a
                          href="https://www.rbi.org.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                          Source <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider - Desktop only */}
                  <div className="hidden sm:block w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent my-4" />

                  {/* SBI Rate Box */}
                  <div className="flex-1 bg-purple-50/50 p-4 sm:p-6 rounded-xl border border-purple-100">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Banknote className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">
                          SBI TT Selling Rate
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-mono font-bold text-3xl sm:text-4xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          ₹{sbiRate !== null ? sbiRate.toFixed(4) : "Loading..."}
                        </span>
                        <span className="text-gray-500 text-sm">/USD</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-4 sm:mb-6">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Real-time data</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Live</span>
                      </div>
                      <div className="mt-auto">
                        <a
                          href="https://www.sbi.co.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                          Source <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                  <div className="bg-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                      RBI Reference Rate
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700">
                      The Reserve Bank of India (RBI) publishes a daily reference rate for the USD/INR exchange rate. 
                      This rate is used as a benchmark for various financial transactions and is updated once per day.
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 sm:p-4 rounded-lg border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-800 mb-2">
                      SBI TT Selling Rate
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700">
                      The State Bank of India (SBI) TT Selling rate is the rate at which SBI sells US dollars for telegraphic transfers. 
                      This rate is updated in real-time and is often used as a reference for international transactions.
                    </p>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">
                        Last updated: {format(lastUpdated, "MMM d, yyyy HH:mm:ss")}
                      </span>
                    </div>
                    <button
                      onClick={handleRefresh}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      Refresh Data
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
