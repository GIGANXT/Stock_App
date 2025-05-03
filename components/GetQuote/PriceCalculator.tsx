"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Calculator, Wifi, WifiOff, Loader2, ArrowRight, Sparkles, Calendar } from 'lucide-react';
import { useMCXPrice } from '../../hook/useMCXPrice';
import { useLMEPrice } from '../../hook/useLMEPrice';
import { useExchangeRates } from '../../hook/useExchangeRates';

interface PriceCalculatorProps {
  className?: string;
}

type ExchangeRateType = 'RBI' | 'SBI';

export default function PriceCalculator({ className }: PriceCalculatorProps) {
  const [mcxPrice, setMcxPrice] = useState('');
  const [mcxPremium, setMcxPremium] = useState('');
  const [mcxFreight, setMcxFreight] = useState('');
  
  const [lmePrice, setLmePrice] = useState('');
  const [lmePremium, setLmePremium] = useState('');
  const [lmeFreight, setLmeFreight] = useState('');
  
  const [isMcxLiveMode, setIsMcxLiveMode] = useState(false);
  const [isLmeLiveMode, setIsLmeLiveMode] = useState(false);
  // Track last update times for status indicators
  const [mcxLastUpdate, setMcxLastUpdate] = useState<Date | null>(null);
  const [lmeLastUpdate, setLmeLastUpdate] = useState<Date | null>(null);
  const [mcxConnectionError, setMcxConnectionError] = useState<string | null>(null);
  const [lmeConnectionError, setLmeConnectionError] = useState<string | null>(null);
  const [isMcxPriceUpdating, setIsMcxPriceUpdating] = useState(false);
  const [isLmePriceUpdating, setIsLmePriceUpdating] = useState(false);
  const [exchangeRateType, setExchangeRateType] = useState<ExchangeRateType>('RBI');
  
  const freightInputRef = useRef<HTMLInputElement>(null);
  const mcxPriceFieldRef = useRef<HTMLInputElement>(null);
  const lmePriceFieldRef = useRef<HTMLInputElement>(null);
  
  const { priceData: mcxPriceData, loading: mcxLoading, error: mcxError } = useMCXPrice();
  const { priceData: lmePriceData, loading: lmeLoading, error: lmeError } = useLMEPrice();
  const { ratesData, loading: ratesLoading, error: ratesError } = useExchangeRates();

  const DUTY_FACTOR = 1.0825;
  const RBI_RATE = ratesData?.RBI || 0;
  const SBI_TT_RATE = ratesData?.SBI || 0;

  // Add state for MCX month data
  const [mcxMonthsData, setMcxMonthsData] = useState<{
    month1Label: string;
    month1Price: number;
    month2Label: string;
    month2Price: number;
    month3Label: string;
    month3Price: number;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [loadingMonths, setLoadingMonths] = useState(false);

  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;

    if (isMcxLiveMode && mcxPriceData && mcxPriceData.currentPrice) {
      // If a specific month is selected, don't override with the live data
      if (!selectedMonth && mcxMonthsData) {
        // Auto-select the first month when activating live mode on fresh page
        setSelectedMonth(mcxMonthsData.month1Label);
        setMcxPrice(mcxMonthsData.month1Price.toFixed(2));
      } else if (!selectedMonth) {
        setMcxPrice(mcxPriceData.currentPrice.toFixed(2));
      }
      setMcxLastUpdate(new Date());
      setIsMcxPriceUpdating(true);

      if (mcxPriceFieldRef.current) {
        mcxPriceFieldRef.current.classList.add('bg-green-50');
        updateTimeout = setTimeout(() => {
          mcxPriceFieldRef.current?.classList.remove('bg-green-50');
          setIsMcxPriceUpdating(false);
        }, 1000);
      }
    }

    return () => clearTimeout(updateTimeout);
  }, [isMcxLiveMode, mcxPriceData, selectedMonth, mcxMonthsData]);

  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;

    if (isLmeLiveMode && lmePriceData && lmePriceData.currentPrice) {
      setLmePrice(lmePriceData.currentPrice.toFixed(2));
      setLmeLastUpdate(new Date(lmePriceData.lastUpdated));
      setIsLmePriceUpdating(true);

      if (lmePriceFieldRef.current) {
        lmePriceFieldRef.current.classList.add('bg-green-50');
        updateTimeout = setTimeout(() => {
          lmePriceFieldRef.current?.classList.remove('bg-green-50');
          setIsLmePriceUpdating(false);
        }, 1000);
      }
    }

    return () => clearTimeout(updateTimeout);
  }, [isLmeLiveMode, lmePriceData]);

  useEffect(() => {
    if (mcxError) {
      setMcxConnectionError('Failed to fetch live MCX price data');
      setIsMcxLiveMode(false);
    } else {
      setMcxConnectionError(null);
    }
  }, [mcxError]);

  useEffect(() => {
    if (lmeError) {
      setLmeConnectionError('Failed to fetch live LME price data');
      setIsLmeLiveMode(false);
    } else {
      setLmeConnectionError(null);
    }
  }, [lmeError]);
  
  useEffect(() => {
    if (ratesError) {
      console.error('Failed to fetch exchange rates:', ratesError);
    }
  }, [ratesError]);

  const handlePremiumKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && freightInputRef.current) {
      freightInputRef.current.focus();
    }
  };

  const toggleMcxLiveMode = () => {
    if (!isMcxLiveMode && mcxLoading) return;
    
    const newLiveMode = !isMcxLiveMode;
    setIsMcxLiveMode(newLiveMode);
    
    if (newLiveMode) {
      // Switching to live mode
      setMcxLastUpdate(new Date());
      
      // Auto-select first month if no month selected and months data is available
      if (!selectedMonth && mcxMonthsData) {
        setSelectedMonth(mcxMonthsData.month1Label);
        setMcxPrice(mcxMonthsData.month1Price.toFixed(2));
      } else {
        // Clear selected month when going to live mode without month data
        setSelectedMonth(null);
      }
    } else {
      // Switching to manual mode
      setMcxPrice(''); // Clear price when switching to manual
    }
  };

  const toggleLmeLiveMode = () => {
    if (!isLmeLiveMode && lmeLoading) return;
    
    const newLiveMode = !isLmeLiveMode;
    setIsLmeLiveMode(newLiveMode);
    
    if (newLiveMode) {
      setLmeLastUpdate(new Date());
    } else {
      setLmePrice(''); // Clear price when switching to manual
    }
  };

  const handleMcxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMcxLiveMode(false);
    setSelectedMonth(null); // Clear selected month when manually changing price
    setMcxPrice(e.target.value);
  };

  const handleLmePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLmeLiveMode(false);
    setLmePrice(e.target.value);
  };

  const calculateMCXTotal = () => {
    const price = parseFloat(mcxPrice) || 0;
    const premium = parseFloat(mcxPremium) || 0;
    const freight = parseFloat(mcxFreight) || 0;
    return price + premium + freight;
  };

  const calculateLMETotal = () => {
    const price = parseFloat(lmePrice) || 0;
    const premium = parseFloat(lmePremium) || 0;
    const freight = parseFloat(lmeFreight) || 0;
    const exchangeRate = exchangeRateType === 'RBI' ? RBI_RATE : SBI_TT_RATE;
    
    // Convert from USD/MT to INR/kg:
    // 1. Add price and premium (in USD/MT)
    // 2. Apply duty factor
    // 3. Convert to INR using exchange rate
    // 4. Convert from per MT to per kg (divide by 1000)
    // 5. Add freight (already in INR/kg)
    return (((price + premium) * DUTY_FACTOR * exchangeRate) / 1000) + freight;
  };

  // Fetch MCX months data
  const fetchMCXMonthsData = useCallback(async () => {
    try {
      setLoadingMonths(true);
      const res = await fetch('/api/3_month_mcx?action=view&limit=1');
      
      if (!res.ok) {
        throw new Error('Failed to fetch MCX months data');
      }
      
      const result = await res.json();
      
      if (result.success && result.data?.length > 0) {
        const rawData = result.data[0];
        const monthsData = {
          month1Label: rawData.month1Label,
          month1Price: parseFloat(rawData.month1Price),
          month2Label: rawData.month2Label,
          month2Price: parseFloat(rawData.month2Price),
          month3Label: rawData.month3Label,
          month3Price: parseFloat(rawData.month3Price)
        };
        
        console.log('MCX months data received in UI:', 
          `Month1: ${monthsData.month1Label} (${monthsData.month1Price})`, 
          `Month2: ${monthsData.month2Label} (${monthsData.month2Price})`, 
          `Month3: ${monthsData.month3Label} (${monthsData.month3Price})`
        );
        
        setMcxMonthsData(monthsData);
        
        // If in live mode but no month is selected, select the first month
        if (isMcxLiveMode && !selectedMonth) {
          setSelectedMonth(monthsData.month1Label);
          
          // Make sure the price is updated too
          if (mcxPriceData) {
            setMcxPrice(mcxPriceData.currentPrice.toFixed(2));
            setMcxLastUpdate(new Date());
            
            // Provide visual feedback for auto-selection
            setIsMcxPriceUpdating(true);
            setTimeout(() => {
              setIsMcxPriceUpdating(false);
            }, 1000);
            
            if (mcxPriceFieldRef.current) {
              mcxPriceFieldRef.current.classList.add('bg-green-50');
              setTimeout(() => {
                mcxPriceFieldRef.current?.classList.remove('bg-green-50');
              }, 1000);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching MCX months data:', err);
    } finally {
      setLoadingMonths(false);
    }
  }, [isMcxLiveMode, mcxPriceData, selectedMonth]);
  
  // Set price for specific month
  const setMonthPrice = (monthNum: 1 | 2 | 3) => {
    if (!mcxMonthsData) return;
    
    const price = mcxMonthsData[`month${monthNum}Price`];
    const label = mcxMonthsData[`month${monthNum}Label`];
    
    // Update price regardless of mode
    setMcxPrice(price.toFixed(2));
    setSelectedMonth(label);
    
    // If in live mode, keep it in live mode but with the selected month's price
    if (isMcxLiveMode) {
      // Don't need to change the mode, just update the last update time
      setMcxLastUpdate(new Date());
    }
    
    // Visual feedback
    if (mcxPriceFieldRef.current) {
      // Use different color based on mode
      mcxPriceFieldRef.current.classList.add(isMcxLiveMode ? 'bg-green-50' : 'bg-blue-50');
      setTimeout(() => {
        mcxPriceFieldRef.current?.classList.remove('bg-green-50', 'bg-blue-50');
      }, 1000);
    }
    
    // Show updating effect
    setIsMcxPriceUpdating(true);
    setTimeout(() => {
      setIsMcxPriceUpdating(false);
    }, 1000);
  };
  
  // Fetch months data on component mount
  useEffect(() => {
    fetchMCXMonthsData();
    const interval = setInterval(fetchMCXMonthsData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchMCXMonthsData]);

  // Render skeleton loaders for the inputs
  const renderPriceInputSkeleton = () => (
    <div className="relative flex-grow flex items-center">
      <div className="w-full h-14 bg-white rounded-full border border-gray-200 shadow-sm overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-full bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer"></div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );

  // Render skeleton for buttons
  const renderButtonsSkeleton = () => (
    <div className="flex items-center justify-between gap-2 mt-0 h-full">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="flex-1 h-10 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-full bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer"></div>
        </div>
      ))}
    </div>
  );

  // Render loading state for the total price
  const renderTotalPriceSkeleton = () => (
    <div className="relative w-full h-14 rounded-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 animate-pulse-subtle"></div>
    </div>
  );

  // Whether we're ready to display data
  const isDataReady = !mcxLoading && !lmeLoading && !ratesLoading;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${className}`}>
      {/* MCX Based Price */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-100 h-full relative overflow-hidden group flex flex-col">
        {/* Background graphics */}
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full -mr-20 -mb-20 z-0"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600/5 rounded-full -ml-10 -mt-10 z-0"></div>
        
        {/* Add animation styles */}
        <style jsx global>{`
          @keyframes pulse-subtle {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
          
          .animate-pulse-subtle {
            animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              MCX Based Price
            </h2>
            <p className="text-xs text-blue-700/70">Multi Commodity Exchange</p>
          </div>
        </div>

        <div className="space-y-6 relative z-10 flex-grow flex flex-col">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between mb-2 h-6">
              <label className="text-sm font-medium text-gray-700">
                MCX Aluminum Price (₹/kg)
              </label>
              {selectedMonth && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {selectedMonth}
                </span>
              )}
            </div>
            
            <div className="h-14 mb-3">
              {mcxLoading && !mcxPriceData ? (
                <div className="flex flex-col flex-1">
                  {renderPriceInputSkeleton()}
                </div>
              ) : (
                <div className="relative flex-grow flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center h-full">
                    <span className="text-gray-500 text-base font-medium flex items-center h-full">₹</span>
                  </div>
                  <input
                    ref={mcxPriceFieldRef}
                    type="number"
                    value={mcxPrice}
                    onChange={handleMcxPriceChange}
                    placeholder="Enter MCX price"
                    disabled={isMcxLiveMode}
                    className="w-full pl-10 py-3 h-12 border-2 border-gray-200 active:border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-base bg-white placeholder:text-gray-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <button
                      onClick={toggleMcxLiveMode}
                      disabled={mcxLoading}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all duration-300 border-2 border-gray-200 active:border-gray-300 shadow-md
                        ${isMcxLiveMode ? 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700' : 'bg-gradient-to-r from-gray-300 to-gray-500 text-white hover:from-gray-400 hover:to-gray-600'}
                        ${mcxLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {mcxLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isMcxLiveMode ? (
                        <>
                          <Wifi className="w-4 h-4" />
                          <span className="hidden sm:inline">Live</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4" />
                          <span className="hidden sm:inline">Manual</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-10 mb-2">
              {loadingMonths ? (
                renderButtonsSkeleton()
              ) : (
                <div className="flex items-center justify-between gap-2 h-full">
                  {mcxMonthsData ? (
                    <>
                      <button
                        onClick={() => setMonthPrice(1)}
                        className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 rounded-lg text-xs font-medium border transition-all ${selectedMonth === mcxMonthsData.month1Label ? 'bg-green-100 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-green-50'}`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{mcxMonthsData.month1Label.split(' ')[0]}</span>
                      </button>
                      <button
                        onClick={() => setMonthPrice(2)}
                        className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 rounded-lg text-xs font-medium border transition-all ${selectedMonth === mcxMonthsData.month2Label ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50'}`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{mcxMonthsData.month2Label.split(' ')[0]}</span>
                      </button>
                      <button
                        onClick={() => setMonthPrice(3)}
                        className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 rounded-lg text-xs font-medium border transition-all ${selectedMonth === mcxMonthsData.month3Label ? 'bg-purple-100 border-purple-200 text-purple-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-purple-50'}`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{mcxMonthsData.month3Label.split(' ')[0]}</span>
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center py-2 text-xs text-gray-500">
                      No month data available
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="h-4 flex items-center text-xs">
              {mcxConnectionError ? (
                <p className="text-red-500 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                  {mcxConnectionError}
                </p>
              ) : mcxLastUpdate && isMcxLiveMode ? (
                <p className="text-blue-500 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-blue-500"></span>
                  Last updated: {mcxLastUpdate.toLocaleTimeString()}
                </p>
              ) : null}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm h-[132px] flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premium (₹/kg)
            </label>
            <div className="relative flex-grow flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center h-full">
                <span className="text-gray-500 text-base font-medium flex items-center h-full">₹</span>
              </div>
              <input
                type="number"
                value={mcxPremium}
                onChange={(e) => setMcxPremium(e.target.value)}
                onKeyDown={handlePremiumKeyPress}
                className="w-full pl-10 py-3 h-12 border-2 border-gray-200 active:border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-base bg-white placeholder:text-gray-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter premium"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm min-h-[100px] flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freight (₹/kg)
            </label>
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-medium">₹</span>
              </div>
              <input
                ref={freightInputRef}
                type="number"
                value={mcxFreight}
                onChange={(e) => setMcxFreight(e.target.value)}
                className="w-full pl-10 py-3 h-12 border-2 border-gray-200 active:border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-base bg-white placeholder:text-gray-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter freight"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-blue-200/50 min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Total Price (per kg)
              </label>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-500" />
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            
            {!isDataReady && mcxLoading ? (
              renderTotalPriceSkeleton()
            ) : (
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-white font-medium">₹</span>
                </div>
                <input
                  type="text"
                  value={calculateMCXTotal().toFixed(2)}
                  disabled
                  className={`w-full pl-9 pr-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 border-0 rounded-lg font-bold text-white text-xl shadow-md transition-all duration-300 ${isMcxPriceUpdating ? 'animate-pulse' : ''}`}
                />
                {isMcxPriceUpdating && (
                  <div className="absolute inset-0 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full animate-pulse">
                      Updating...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LME Based Price */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border border-purple-100 h-full relative overflow-hidden group flex flex-col">
        {/* Background graphics */}
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full -mr-20 -mb-20 z-0"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-pink-600/5 rounded-full -ml-10 -mt-10 z-0"></div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-md">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              LME Based Price
            </h2>
            <p className="text-xs text-purple-700/70">London Metal Exchange</p>
          </div>
        </div>

        <div className="space-y-6 relative z-10 flex-grow flex flex-col">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100 shadow-sm min-h-[200px] flex flex-col">
            <div className="mb-1">
              <label className="text-sm font-medium text-gray-700">
                LME Aluminum Price (USD/MT)
              </label>
            </div>
            
            <div className="mb-1">
              {lmeLoading && !lmePriceData ? (
                <div className="w-full py-2">
                  {renderPriceInputSkeleton()}
                </div>
              ) : (
                <div className="w-full">
                  <div className="relative flex items-center w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center h-full">
                      <span className="text-gray-500 text-base font-medium flex items-center h-full">$</span>
                    </div>
                    <input
                      ref={lmePriceFieldRef}
                      type="number"
                      value={lmePrice}
                      onChange={handleLmePriceChange}
                      placeholder="Enter LME price"
                      disabled={isLmeLiveMode}
                      className="w-full pl-10 py-3 h-12 border-2 border-gray-200 active:border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 text-base bg-white placeholder:text-gray-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <button
                        onClick={toggleLmeLiveMode}
                        disabled={lmeLoading}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all duration-300 border-2 border-gray-200 active:border-gray-300 shadow-md
                          ${isLmeLiveMode ? 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700' : 'bg-gradient-to-r from-gray-300 to-gray-500 text-white hover:from-gray-400 hover:to-gray-600'}
                          ${lmeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {lmeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isLmeLiveMode ? (
                          <>
                            <Wifi className="w-4 h-4" />
                            <span className="hidden sm:inline">Live</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4" />
                            <span className="hidden sm:inline">Manual</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-grow min-h-[56px]"></div>
            
            <div className="h-4 flex items-center text-xs">
              {lmeConnectionError ? (
                <p className="text-red-500 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                  {lmeConnectionError}
                </p>
              ) : lmeLastUpdate && isLmeLiveMode ? (
                <p className="text-purple-500 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-purple-500"></span>
                  Last updated: {lmeLastUpdate.toLocaleTimeString()}
                </p>
              ) : null}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100 shadow-sm h-[132px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Premium (USD/MT)
              </label>
              {!ratesLoading ? (
                <div className="text-xs font-medium bg-white border border-purple-200 text-purple-700 px-2.5 py-1 rounded-full shadow-sm">
                  Exchange Rate: <span className="font-semibold">₹{exchangeRateType === 'RBI' ? RBI_RATE.toFixed(4) : SBI_TT_RATE.toFixed(4)}</span>
                </div>
              ) : (
                <div className="text-xs font-medium bg-white border border-purple-200 text-purple-600 px-2.5 py-1 rounded-full shadow-sm flex items-center">
                  <div className="h-4 w-20 bg-gray-200 animate-pulse-subtle rounded"></div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-grow">
              <div className="relative flex-grow flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center h-full">
                  <span className="text-gray-500 text-base font-medium flex items-center h-full">$</span>
                </div>
                <input
                  type="number"
                  value={lmePremium}
                  onChange={(e) => setLmePremium(e.target.value)}
                  onKeyDown={handlePremiumKeyPress}
                  className="w-full pl-10 py-3 h-12 border-2 border-gray-200 active:border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 text-base bg-white placeholder:text-gray-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter premium"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex rounded-full overflow-hidden border-2 border-gray-200 active:border-gray-300 shadow-sm">
                <button
                  type="button"
                  onClick={() => setExchangeRateType('RBI')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${exchangeRateType === 'RBI' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  RBI
                </button>
                <button
                  type="button"
                  onClick={() => setExchangeRateType('SBI')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${exchangeRateType === 'SBI' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  SBI TT
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100 shadow-sm min-h-[100px] flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freight (₹/kg)
            </label>
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-base font-medium">₹</span>
              </div>
              <input
                type="number"
                value={lmeFreight}
                onChange={(e) => setLmeFreight(e.target.value)}
                className="w-full pl-10 py-3 h-12 border-2 border-gray-200 active:border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 text-base bg-white placeholder:text-gray-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter freight"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-purple-200/50 min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Total Price (per kg)
              </label>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-500" />
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            
            {!isDataReady && lmeLoading ? (
              <div className="animate-pulse">
                <div className="h-14 bg-gradient-to-r from-purple-400/60 to-pink-400/60 rounded-lg w-full"></div>
              </div>
            ) : (
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-white font-medium">₹</span>
                </div>
                <input
                  type="text"
                  value={calculateLMETotal().toFixed(2)}
                  disabled
                  className={`w-full pl-9 pr-4 py-4 bg-gradient-to-r from-purple-600 to-pink-600 border-0 rounded-lg font-bold text-white text-xl shadow-md transition-all duration-300 ${isLmePriceUpdating ? 'animate-pulse' : ''}`}
                />
                {isLmePriceUpdating && (
                  <div className="absolute inset-0 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <div className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full animate-pulse">
                      Updating...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}