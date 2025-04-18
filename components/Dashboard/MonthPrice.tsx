import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Maximize2, X } from "lucide-react";

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  timestamp?: string;
  timeSpan?: string;
  isCached?: boolean;
  error?: string;
}

export default function MonthPrice() {
  const [showExpanded, setShowExpanded] = useState(false);
  const [priceData, setPriceData] = useState<PriceData>({
    price: 298.0,
    change: -15.0,
    changePercent: -0.55
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/price');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setPriceData(data);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch real-time data. Showing last known values.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  const { price, change, changePercent, timestamp, timeSpan, isCached } = priceData;

  return (
    <>
      {/* Regular Card View */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-purple-600">3-Month LME </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Real-time</span>
            </div>
            <button
              onClick={() => setShowExpanded(true)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              aria-label="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 mb-2">
            {error}
          </div>
        )}

        {isCached && (
          <div className="text-sm text-yellow-500 mb-2">
            Showing cached data
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-3xl text-purple-600">
            ${price.toFixed(2)}
          </span>
          <span className="text-gray-500">/MT</span>
        </div>

        <div className={`flex items-center gap-2 mt-2 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
          <div className={`p-1 rounded-full ${change >= 0 ? "bg-green-100" : "bg-red-100"}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <span className="font-medium">
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)} ({changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
        </div>

        {timestamp && (
          <div className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </div>

      {/* Expanded Modal View */}
      {showExpanded && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto border border-gray-200">
            <div className="flex items-center justify-between w-full mb-6">
              <h2 className="text-xl font-bold text-purple-600">3-Month Futures</h2>
              <button
                onClick={() => setShowExpanded(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition text-gray-700"
                aria-label="Close expanded view"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Real-time</span>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500">
                  {error}
                </div>
              )}

              {isCached && (
                <div className="text-sm text-yellow-500">
                  Showing cached data
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-4xl text-purple-600">
                  ${price.toFixed(2)}
                </span>
                <span className="text-gray-500">/MT</span>
              </div>

              <div className={`flex items-center gap-2 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                <div className={`p-1 rounded-full ${change >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                  {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <span className="font-medium">
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)} ({changePercent >= 0 ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
              </div>

              {timestamp && (
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(timestamp).toLocaleString()}
                </div>
              )}

              {timeSpan && (
                <div className="text-sm text-gray-500">
                  Time span: {timeSpan}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <p>The 3-month futures price indicates market expectations for future aluminium delivery. The current {change >= 0 ? "increase" : "decrease"} suggests {change >= 0 ? "positive" : "negative"} market sentiment for the coming months.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 

