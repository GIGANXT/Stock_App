import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Maximize2,
  X,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import { format } from "date-fns";
import MCXClock from "./MCXClock";

// Interface for the price data structure
interface PriceData {
  date: string;
  time: string;
  timestamp: string;
  prices: {
    [month: string]: {
      price: number | string;
      site_rate_change: string;
    };
  };
}

export default function MCXAluminium() {
  // State to hold the streaming data
  const [streamData, setStreamData] = useState<PriceData | null>(null);
  const [showExpanded, setShowExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Use a direct connection to your streaming server
  const sseUrl = "http://localhost:5002/stream"; // Your actual SSE stream URL
  
  const sampleData = useMemo<PriceData>(() => ({
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm:ss"),
    timestamp: new Date().toISOString(),
    prices: {
      "April 2025": {
        price: 232.25,
        site_rate_change: "-6.2 (-2.6%)",
      },
      "May 2025": {
        price: 232.8,
        site_rate_change: "-6.2 (-2.59%)",
      },
      "June 2025": {
        price: 234.2,
        site_rate_change: "-6.95 (-2.88%)",
      },
    },
  }), []); // Empty dependency array since the data is static

  // Fetch data using regular HTTP request as fallback
  const fetchDataWithFetch = useCallback(async (useSampleFallback: boolean = false) => {
    try {
      setIsRefreshing(true);

      if (useSampleFallback) {
        // Use sample data if we were told to skip the HTTP request
        console.log("Using sample fallback data");
        setStreamData(sampleData);
        setLastUpdated(new Date());
        setConnectionError("Using demo data - API is unavailable");
        return;
      }

      // Try to fetch from the same URL but with a regular HTTP request
      const response = await fetch(sseUrl);
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        // If HTTP request fails, use sample data as ultimate fallback
        setStreamData(sampleData);
        setLastUpdated(new Date());
        setConnectionError("API is currently unavailable - using demo data");
      } else {
        const data = await response.json();
        setStreamData(data);
        setLastUpdated(new Date());
        setConnectionError(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      // Use sample data if fetch fails completely
      setStreamData(sampleData);
      setLastUpdated(new Date());
      setConnectionError("API is currently unavailable - using demo data");
    } finally {
      setIsRefreshing(false);
    }
  }, [sseUrl, sampleData]);

  // Set up event source for streaming data with fallback to regular polling
  useEffect(() => {
    // First try using Server-Sent Events
    let eventSource: EventSource | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    try {
      // Check if EventSource is supported by the browser
      if (typeof EventSource !== "undefined") {
        // Connect directly to your streaming server
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setStreamData(parsed);
            setLastUpdated(new Date());
            setConnectionError(null);
            setIsPolling(false);
          } catch (error) {
            console.error("Error parsing SSE data:", error);
            setConnectionError("Error parsing data from server");

            // Fall back to HTTP polling with sample data
            fallbackToPolling();
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE error - falling back to polling:", err);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Fall back to polling
          fallbackToPolling();
        };
      } else {
        // EventSource not supported, fallback immediately
        console.log("EventSource not supported in this browser");
        fallbackToPolling();
      }
    } catch (error) {
      console.error("Error setting up EventSource:", error);
      fallbackToPolling();
    }

    // Helper function to set up polling fallback
    function fallbackToPolling() {
      setIsPolling(true);
      // Use sample data directly without trying HTTP
      fetchDataWithFetch(true);

      // Set up polling every 30 seconds if not already
      if (!pollingInterval) {
        pollingInterval = setInterval(() => fetchDataWithFetch(true), 30000);
      }
    }

    return () => {
      // Clean up both SSE and polling when component unmounts
      if (eventSource) {
        eventSource.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fetchDataWithFetch]);

  // Handle refresh button click
  const handleRefresh = () => {
    setIsRefreshing(true);

    // Refresh using sample data in demo mode
    fetchDataWithFetch(isPolling);
  };

  // Show loading if no data is available yet
  if (!streamData) {
    return (
      <div className="bg-white rounded-lg p-2 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] min-h-[160px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
          <p className="text-sm text-gray-600">
            {isPolling
              ? "Loading MCX Aluminium data..."
              : connectionError
              ? connectionError
              : "Connecting to MCX Aluminium stream..."}
          </p>
          {connectionError && (
            <button
              onClick={() => fetchDataWithFetch(true)}
              className="mt-2 px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors"
            >
              Load Demo Data
            </button>
          )}
        </div>
      </div>
    );
  }

  // Get month names from the data
  const monthNames = Object.keys(streamData.prices);

  // Calculate spread between the first two months
  const firstMonth = monthNames[0];
  const secondMonth = monthNames[1];

  // Handle potential string values in price
  const firstPrice =
    typeof streamData.prices[firstMonth].price === "string"
      ? parseFloat(streamData.prices[firstMonth].price as string)
      : (streamData.prices[firstMonth].price as number);

  const secondPrice =
    typeof streamData.prices[secondMonth].price === "string"
      ? parseFloat(streamData.prices[secondMonth].price as string)
      : (streamData.prices[secondMonth].price as number);

  const spread = secondPrice - firstPrice;
  const isContango = spread > 0;

  // Helper function to extract change percentage from site_rate_change string
  const extractChangePercentage = (changeStr: string): number => {
    try {
      // Try to extract percentage from formats like "-6.2 (-2.6%)" or "(-2.6%)"
      const percentMatch = changeStr.match(/([-+]?\d+\.?\d*)%/);
      return percentMatch ? parseFloat(percentMatch[1]) : 0;
    } catch (error) {
      console.error("Error extracting percentage:", error);
      return 0;
    }
  };

  // Get price as a number, regardless of whether it's stored as string or number
  const getPrice = (priceValue: string | number): number => {
    if (typeof priceValue === "string") {
      return parseFloat(priceValue);
    }
    return priceValue;
  };

  interface ContractPriceProps {
    month: string;
    priceData: {
      price: string | number;
      site_rate_change: string;
    };
    gradient: string;
    expanded?: boolean;
    showDivider?: boolean;
  }

  const ContractPrice = ({
    month,
    priceData,
    gradient,
    expanded = false,
    showDivider = true,
  }: ContractPriceProps) => {
    const price = getPrice(priceData.price);
    const changePercentage = extractChangePercentage(
      priceData.site_rate_change
    );

    // Get month name without year for display
    const displayMonth = month.split(" ")[0];

    return (
      <div
        className={`flex-1 flex items-center ${
          expanded ? "justify-center" : ""
        }`}
      >
        <div className="w-full">
          <div
            className={`flex flex-col ${
              expanded ? "items-center" : "items-center"
            }`}
          >
            <div
              className={`${
                expanded ? "text-sm" : "text-xs"
              } text-gray-600 flex items-center justify-center gap-1 mb-0.5 h-4`}
            >
              <Calendar
                className={`w-3 h-3 ${
                  month === monthNames[0]
                    ? "text-blue-600"
                    : month === monthNames[1]
                    ? "text-purple-600"
                    : "text-pink-600"
                }`}
              />
              <span>{displayMonth}</span>
            </div>
            <div className="flex flex-col items-center gap-0">
              <div
                className={`font-mono font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${
                  expanded ? "text-4xl" : "text-xl"
                }`}
              >
                ₹{price.toFixed(2)}
              </div>
              <div
                className={`flex items-center justify-center gap-1 h-4 ${
                  changePercentage >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {changePercentage >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="text-xs">{changePercentage.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
        {showDivider && !expanded && (
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent mx-1" />
        )}
      </div>
    );
  };

  interface ContractPriceBoxProps {
    month: string;
    priceData: {
      price: string | number;
      site_rate_change: string;
    };
    gradient: string;
  }

  const ContractPriceBox = ({
    month,
    priceData,
    gradient,
  }: ContractPriceBoxProps) => {
    const price = getPrice(priceData.price);

    // Display month name with year for the expanded view
    const displayMonthWithYear = month;

    return (
      <div
        className={`flex-1 p-3 rounded-lg border ${
          month === monthNames[0]
            ? "bg-blue-50/50 border-blue-100"
            : month === monthNames[1]
            ? "bg-purple-50/50 border-purple-100"
            : "bg-pink-50/50 border-pink-100"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar
              className={`w-3 h-3 ${
                month === monthNames[0]
                  ? "text-blue-600"
                  : month === monthNames[1]
                  ? "text-purple-600"
                  : "text-pink-600"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                month === monthNames[0]
                  ? "text-blue-800"
                  : month === monthNames[1]
                  ? "text-purple-800"
                  : "text-pink-800"
              }`}
            >
              {displayMonthWithYear} Contract
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span
              className={`font-mono font-bold text-2xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
            >
              ₹{price.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-2xs mb-2">
            <Clock className="w-2.5 h-2.5" />
            <span>Contract price</span>
          </div>
          <div
            className={`flex items-center gap-1 ${
              extractChangePercentage(priceData.site_rate_change) >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {extractChangePercentage(priceData.site_rate_change) >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs">{priceData.site_rate_change}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Compact Card View */}
      <div className="relative bg-white rounded-lg p-2 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-200 min-h-[160px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              MCX Aluminium
            </h2>
            <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center text-gray-500 mr-1">
              <MCXClock />
            </div>
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-gray-100/50 rounded-full transition-colors text-gray-600"
              aria-label="Refresh data"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => setShowExpanded(true)}
              className="p-1 hover:bg-gray-100/50 rounded-full transition-colors text-gray-600"
              aria-label="Expand view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          {/* Mobile: Vertical layout */}
          <div className="sm:hidden flex flex-col justify-between space-y-1.5 mb-1">
            {monthNames.map((month, index) => (
              <ContractPrice
                key={month}
                month={month}
                priceData={streamData.prices[month]}
                gradient={
                  index === 0
                    ? "from-blue-600 to-purple-600"
                    : index === 1
                    ? "from-purple-600 to-pink-600"
                    : "from-pink-600 to-rose-600"
                }
                showDivider={false}
              />
            ))}
          </div>

          {/* Desktop: Horizontal layout */}
          <div className="hidden sm:flex flex-1 items-center my-1">
            <div className="w-full flex">
              {monthNames.map((month, index) => (
                <ContractPrice
                  key={month}
                  month={month}
                  priceData={streamData.prices[month]}
                  gradient={
                    index === 0
                      ? "from-blue-600 to-purple-600"
                      : index === 1
                      ? "from-purple-600 to-pink-600"
                      : "from-pink-600 to-rose-600"
                  }
                  showDivider={index < monthNames.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Contango section */}
          <div
            className={`text-center py-1.5 px-3 rounded-md ${
              isContango
                ? "bg-green-100 border border-green-200 text-green-800"
                : "bg-red-100 border border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-medium">
              <span>{isContango ? "CONTANGO" : "BACKWARDATION"}</span>
              <span>₹{Math.abs(spread).toFixed(2)}</span>
              {isContango ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Modal View */}
      {showExpanded && streamData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto border border-gray-200">
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-purple-600" />
                  MCX Aluminium
                </h2>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <button
                onClick={() => setShowExpanded(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition text-gray-700"
                aria-label="Close expanded view"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-4">
              {monthNames.map((month, index) => (
                <React.Fragment key={month}>
                  <ContractPriceBox
                    month={month}
                    priceData={streamData.prices[month]}
                    gradient={
                      index === 0
                        ? "from-blue-600 to-purple-600"
                        : index === 1
                        ? "from-purple-600 to-pink-600"
                        : "from-pink-600 to-rose-600"
                    }
                  />
                  {index < monthNames.length - 1 && (
                    <div className="hidden sm:block w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent my-3" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div
              className={`mt-3 text-center py-1.5 px-3 rounded-md ${
                isContango
                  ? "bg-green-100 border border-green-200 text-green-800"
                  : "bg-red-100 border border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-xs font-medium">
                <span>{isContango ? "CONTANGO" : "BACKWARDATION"}</span>
                <span>₹{Math.abs(spread).toFixed(2)}</span>
                {isContango ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {monthNames.map((month, index) => (
                  <div
                    key={month}
                    className={`${
                      index === 0
                        ? "bg-blue-100 border-blue-200"
                        : index === 1
                        ? "bg-purple-100 border-purple-200"
                        : "bg-pink-100 border-pink-200"
                    } p-2 rounded-md border`}
                  >
                    <h3
                      className={`text-xs font-medium ${
                        index === 0
                          ? "text-blue-800"
                          : index === 1
                          ? "text-purple-800"
                          : "text-pink-800"
                      } mb-1`}
                    >
                      {month} Contract
                    </h3>
                    <p className="text-2xs text-gray-700">
                      {index === 0
                        ? "Near-month contract price reflecting current market conditions."
                        : index === 1
                        ? "Next-month contract showing short-term market expectations."
                        : "Further-out contract indicating longer-term market trends."}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-2xs">
                    Data Time: {streamData.date} {streamData.time}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-2xs">
                    Last updated: {format(lastUpdated, "MMM d, yyyy HH:mm:ss")}
                    {isPolling && " (polling)"}
                  </span>
                </div>
                <button
                  onClick={handleRefresh}
                  className="text-2xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh{" "}
                  {connectionError ? "Demo Data" : isPolling ? "Data" : "View"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
