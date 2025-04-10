import React, { useState, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Maximize2,
  X,
  BarChart2,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

// API response format for 3-month data
interface AluminumApiResponse {
  success: boolean;
  data: {
    Value: string;
    "Time span": string;
    "Rate of Change": string;
    Timestamp: string;
    error: null | string;
  };
}

// Format we use in our component for 3-month data
interface AluminumPriceData {
  Value: string;
  Date: string; // We'll map from 'Time span'
  "Rate of Change": string;
  Timestamp: string;
  error?: string | null;
}

// Format for spot price data
interface SpotPriceData {
  spotPrice: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export default function LMEAluminium() {
  const [showExpanded, setShowExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [priceData, setPriceData] = useState<AluminumPriceData | null>(null);
  const [spotPriceData, setSpotPriceData] = useState<SpotPriceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spotError, setSpotError] = useState<string | null>(null);

  // Default values for spot price if API fails
  const DEFAULT_SPOT_PRICE = 2700.0;
  const DEFAULT_SPOT_CHANGE = 13.0;
  const DEFAULT_SPOT_CHANGE_PERCENT = 0.48;

  // Parse values from the API data for 3-Month Price
  const THREE_MONTH_PRICE = priceData
    ? parseFloat(priceData.Value.replace(/[^0-9.-]+/g, ""))
    : 0;

  // Parse change values from the Rate of Change string (e.g., "-39.25 ((-1.60%))")
  const parseChangeValues = () => {
    if (!priceData || !priceData["Rate of Change"])
      return { change: 0, changePercent: 0 };

    const changeText = priceData["Rate of Change"];
    // Updated regex to match format with double parentheses
    const changeMatch = changeText.match(/([-+]?\d+\.\d+)/);
    const percentMatch = changeText.match(/\(\(([-+]?\d+\.\d+)%\)\)/);

    // Fallback to single parentheses if double parentheses format not found
    const singlePercentMatch = !percentMatch
      ? changeText.match(/\(([-+]?\d+\.\d+)%\)/)
      : null;

    const change = changeMatch ? parseFloat(changeMatch[0]) : 0;
    const changePercent = percentMatch
      ? parseFloat(percentMatch[1])
      : singlePercentMatch
      ? parseFloat(singlePercentMatch[1])
      : 0;

    return { change, changePercent };
  };

  // API-based 3-month price change values
  const {
    change: THREE_MONTH_CHANGE,
    changePercent: THREE_MONTH_CHANGE_PERCENT,
  } = parseChangeValues();

  // Get spot price values from API or use defaults
  const SPOT_PRICE = spotPriceData?.spotPrice || DEFAULT_SPOT_PRICE;
  const SPOT_CHANGE = spotPriceData?.change || DEFAULT_SPOT_CHANGE;
  const SPOT_CHANGE_PERCENT = spotPriceData?.changePercent || DEFAULT_SPOT_CHANGE_PERCENT;

  const MARKET_TREND =
    THREE_MONTH_PRICE < SPOT_PRICE ? "backwardation" : "contango";
  const SPREAD = Math.abs(SPOT_PRICE - THREE_MONTH_PRICE).toFixed(2);

  // Function to fetch 3-month data from the API
  const fetchThreeMonthData = async () => {
    try {
      const response = await fetch("/api/3_months_LME_Aluminium");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: AluminumApiResponse = await response.json();

      if (result.success && result.data) {
        // Map the API data to our component's expected format
        const mappedData: AluminumPriceData = {
          ...result.data,
          Date: result.data["Time span"],
        };
        console.log("Fetched 3-month data:", mappedData);
        setPriceData(mappedData);
        setError(null);
        return true;
      } else {
        throw new Error(result.data?.error || "Failed to fetch price data");
      }
    } catch (err) {
      console.error("Error fetching 3-month data:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh data");
      return false;
    }
  };

  // Function to fetch spot price data from the API
  const fetchSpotPriceData = async () => {
    try {
      const response = await fetch("/api/metal-price");
      
      if (!response.ok) {
        throw new Error('Failed to fetch spot price data');
      }
      
      const data = await response.json();
      setSpotPriceData(data);
      setSpotError(null);
      return true;
    } catch (err) {
      console.error('Error fetching spot price data:', err);
      setSpotError('Failed to load spot price data');
      return false;
    }
  };

  // Set up polling for data updates
  useEffect(() => {
    // Function to fetch data and update connection status
    const fetchDataAndUpdate = async () => {
      try {
        const threeMonthSuccess = await fetchThreeMonthData();
        const spotSuccess = await fetchSpotPriceData();
        
        if (!threeMonthSuccess) {
          setError("Failed to fetch 3-month data");
        }
        if (!spotSuccess) {
          setSpotError("Failed to fetch spot price data");
        }
        
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    console.log("Setting up polling for aluminum price data");

    // Initial fetch
    fetchDataAndUpdate();

    // Set up polling interval
    const interval = setInterval(fetchDataAndUpdate, 10000); // Every 10 seconds

    // Clean up on unmount
    return () => {
      console.log("Cleaning up polling interval");
      clearInterval(interval);
    };
  }, []);

  // Function to manually refresh the data
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const threeMonthSuccess = await fetchThreeMonthData();
      const spotSuccess = await fetchSpotPriceData();
      
      if (!threeMonthSuccess) {
        setError("Failed to fetch 3-month data");
      }
      if (!spotSuccess) {
        setSpotError("Failed to fetch spot price data");
      }
      
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const PriceSection = ({
    isSpot = true,
    expanded = false,
    mobile = false,
  }) => {
    const price = isSpot ? SPOT_PRICE : THREE_MONTH_PRICE;
    const label = isSpot ? "Spot Price" : "3-Month";

    // Use different change values based on if it's spot or 3-month
    const change = isSpot ? SPOT_CHANGE : THREE_MONTH_CHANGE;
    const changePercent = isSpot
      ? SPOT_CHANGE_PERCENT
      : THREE_MONTH_CHANGE_PERCENT;

    return (
      <div
        className={expanded ? "space-y-4" : mobile ? "space-y-2" : "space-y-3"}
      >
        <div className="flex items-center justify-between">
          <span
            className={`font-medium text-gray-700 ${
              expanded ? "text-lg" : mobile ? "text-xs" : "text-sm"
            }`}
          >
            {label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 sm:gap-3">
          <span
            className={`font-mono font-bold bg-gradient-to-r ${
              isSpot
                ? "from-blue-600 to-purple-600"
                : "from-purple-600 to-pink-600"
            } bg-clip-text text-transparent ${
              expanded
                ? "text-5xl"
                : mobile
                ? "text-2xl"
                : "text-3xl sm:text-4xl"
            }`}
          >
            ${price.toFixed(2)}
          </span>
          <span
            className={`text-gray-500 ${
              expanded ? "text-sm" : mobile ? "text-xs" : "text-xs"
            }`}
          >
            /MT
          </span>

          {isSpot ? (
            <span
              className={`text-gray-500 ml-auto flex items-center gap-1 ${
                expanded ? "text-sm" : mobile ? "text-xs" : "text-xs"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {expanded
                ? "Delayed (30 mins)"
                : mobile
                ? "Delayed"
                : "Delayed (30 mins)"}
            </span>
          ) : (
            <span
              className={`ml-auto px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                expanded
                  ? "bg-green-100 text-green-800 text-sm"
                  : mobile
                  ? "bg-green-100 text-green-800 text-xs"
                  : "bg-green-100 text-green-800 text-xs"
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div
          className={`flex items-center gap-1.5 ${
            change >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          <div
            className={`p-1 rounded-full ${
              change >= 0 ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {change >= 0 ? (
              <TrendingUp
                className={
                  expanded ? "w-5 h-5" : mobile ? "w-3 h-3" : "w-3.5 h-3.5"
                }
              />
            ) : (
              <TrendingDown
                className={
                  expanded ? "w-5 h-5" : mobile ? "w-3 h-3" : "w-3.5 h-3.5"
                }
              />
            )}
          </div>
          <span
            className={`font-medium ${
              expanded ? "text-base" : mobile ? "text-xs" : "text-sm"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)} ({changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>
    );
  };

  // Display loading state when no data is available
  if (!priceData && !spotPriceData) {
    return (
      <div className="w-full bg-white rounded-xl p-4 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] min-h-[260px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <span className="text-gray-600">Loading price data...</span>
          {error && <span className="text-red-500 text-sm mt-2">{error}</span>}
          {spotError && <span className="text-red-500 text-sm mt-2">{spotError}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* LME Card */}
      <div className="relative bg-white rounded-xl p-4 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-200 min-h-[260px] group">
        {/* Glow effect on hover - desktop only */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 hidden sm:block"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              LME Aluminium
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Refresh data"
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

        {/* Mobile: Vertical layout */}
        <div className="sm:hidden flex flex-col space-y-4">
          <PriceSection isSpot={true} mobile={true} />
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <PriceSection isSpot={false} mobile={true} />
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden sm:flex flex-col h-[calc(100%-4rem)] relative z-10">
          <div className="flex-1 flex flex-col justify-evenly">
            <PriceSection isSpot={true} />
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2" />
            <PriceSection isSpot={false} />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Updated: {format(lastUpdated, "MMM d, HH:mm")}</span>
            </div>
            {error && <div className="text-xs text-red-500">{error}</div>}
            {spotError && <div className="text-xs text-red-500">{spotError}</div>}
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
                  LME Aluminium
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
              <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-8">
                {/* Spot Price Box */}
                <div className="flex-1 bg-blue-50/50 p-4 sm:p-6 rounded-xl border border-blue-100">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Spot Price
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-mono font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        ${SPOT_PRICE.toFixed(2)}
                      </span>
                      <span className="text-gray-500 text-sm">/MT</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-4 sm:mb-6">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Delayed (30 mins)</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 ${
                        SPOT_CHANGE >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {SPOT_CHANGE >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {SPOT_CHANGE >= 0 ? "+" : ""}
                        {SPOT_CHANGE.toFixed(2)} (
                        {SPOT_CHANGE_PERCENT >= 0 ? "+" : ""}
                        {SPOT_CHANGE_PERCENT.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider - Desktop only */}
                <div className="hidden sm:block w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent my-4" />

                {/* 3-Month Price Box */}
                <div className="flex-1 bg-purple-50/50 p-4 sm:p-6 rounded-xl border border-purple-100">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        3-Month Futures
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-mono font-bold text-3xl sm:text-4xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ${THREE_MONTH_PRICE.toFixed(2)}
                      </span>
                      <span className="text-gray-500 text-sm">/MT</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-4 sm:mb-6">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Real-time data</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Horizontal Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4 sm:my-6"></div>

            {/* Market Status */}
            <div
              className={`text-center py-2 px-4 rounded-md ${
                MARKET_TREND === "backwardation"
                  ? "bg-green-100 border border-green-200 text-green-800"
                  : "bg-red-100 border border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <span>
                  {MARKET_TREND === "backwardation"
                    ? "BACKWARDATION"
                    : "CONTANGO"}
                </span>
                <span>${SPREAD}</span>
                {MARKET_TREND === "backwardation" ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* Description Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
              <div className="bg-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Spot Price Analysis
                </h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  The current spot price reflects immediate market conditions
                  for aluminium delivery. Today&apos;s{" "}
                  {SPOT_CHANGE >= 0 ? "increase" : "decrease"} indicates{" "}
                  {SPOT_CHANGE >= 0 ? "strengthening" : "weakening"} demand in
                  the physical market.
                </p>
              </div>
              <div className="bg-purple-100 p-3 sm:p-4 rounded-lg border border-purple-200">
                <h3 className="text-sm font-medium text-purple-800 mb-2">
                  3-Month Futures Outlook
                </h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  The {MARKET_TREND} of ${SPREAD} suggests the market expects{" "}
                  {MARKET_TREND === "backwardation"
                    ? "near-term supply constraints"
                    : "future supply increases or demand softening"}{" "}
                  in the aluminium sector.
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">
                    Last updated: {format(lastUpdated, "MMM d, yyyy HH:mm:ss")}
                    {priceData?.Timestamp &&
                      ` (Source: ${new Date(
                        priceData.Timestamp
                      ).toLocaleTimeString()})`}
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
          </div>
        </div>
      )}
    </div>
  );
}
