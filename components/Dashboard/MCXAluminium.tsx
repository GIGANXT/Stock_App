import React, { useState, useEffect } from "react";
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

const MCXClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-1 text-xs text-gray-600">
      <Clock className="w-3 h-3" />
      <span>{format(currentTime, "HH:mm:ss")}</span>
    </div>
  );
};

interface PriceData {
  price: number;
  site_rate_change: string;
}

interface AluminiumData {
  date: string;
  time: string;
  timestamp: string;
  prices: {
    [key: string]: PriceData;
  };
}

const MCXAluminium = () => {
  const [showExpanded, setShowExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [data, setData] = useState<AluminiumData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/mcx-aluminium');
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const fetchedData = await response.json();
      setData(fetchedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching MCX Aluminium data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setIsRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up polling every 60 seconds
    const interval = setInterval(fetchData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchData();
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-red-600">MCX Aluminium</h2>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-100/50 rounded-full transition-colors text-gray-600"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            MCX Aluminium
          </h2>
          <div className="animate-spin">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  // Get month names from the data
  const monthNames = Object.keys(data.prices);

  // Calculate spread between the first two months if available
  let spread = 0;
  let isContango = false;
  
  if (monthNames.length >= 2) {
    const firstMonth = monthNames[0];
    const secondMonth = monthNames[1];

    const firstPrice = data.prices[firstMonth].price;
    const secondPrice = data.prices[secondMonth].price;

    spread = secondPrice - firstPrice;
    isContango = spread > 0;
  }

  // Helper function to extract change percentage from site_rate_change string
  const extractChangePercentage = (changeStr: string): number => {
    if (!changeStr) return 0;
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
      return parseFloat(priceValue) || 0;
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
    const changePercentage = extractChangePercentage(priceData.site_rate_change);

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
                <span className="text-xs">{Math.abs(changePercentage).toFixed(2)}%</span>
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
    const changePercentage = extractChangePercentage(priceData.site_rate_change);

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
              changePercentage >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {changePercentage >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs">
              {priceData.site_rate_change || "N/A"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const getMonthName = (monthKey: string): string => {
    const months: { [key: string]: string } = {
      'April 2024': 'April',
      'May 2024': 'May',
      'June 2024': 'June'
    };
    return months[monthKey] || monthKey;
  };

  const formatPrice = (price: number): string => {
    return price.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  };

  const formatChange = (change: string): string => {
    const value = parseFloat(change);
    return value >= 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`;
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
                priceData={data.prices[month]}
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
                  priceData={data.prices[month]}
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
          {monthNames.length >= 2 && (
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
          )}
        </div>
      </div>

      {/* Expanded Modal View */}
      {showExpanded && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto border border-gray-200">
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-purple-600" />
                  MCX Aluminium
                </h2>
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
                    priceData={data.prices[month]}
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

            {monthNames.length >= 2 && (
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
            )}

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
                      {getMonthName(month)}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-semibold">
                          ₹{formatPrice(getPrice(data.prices[month].price))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Change:</span>
                        <span
                          className={`font-medium ${
                            extractChangePercentage(data.prices[month].site_rate_change) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatChange(data.prices[month].site_rate_change)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-2xs">
                    Data Time: {data.date} {data.time}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-2xs">
                    Last updated: {format(lastUpdated, "MMM d, yyyy HH:mm:ss")}
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
                  Refresh View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MCXAluminium;