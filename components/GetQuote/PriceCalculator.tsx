"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Calculator, Wifi, WifiOff, Clock, Loader2, ArrowRight, Sparkles, Calendar } from 'lucide-react';
import { format } from 'date-fns';
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
  const RBI_RATE = ratesData.RBI || 0;
  const SBI_TT_RATE = ratesData.SBI || 0;

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

    if (isMcxLiveMode && mcxPriceData) {
      // If a specific month is selected, don't override with the live data
      if (!selectedMonth && mcxMonthsData) {
        // Auto-select the first month when activating live mode on fresh page
        setSelectedMonth(mcxMonthsData.month1Label);
        setMcxPrice(mcxPriceData.currentPrice.toFixed(2));
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

    if (isLmeLiveMode && lmePriceData) {
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
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
    </div>
  );

  // Render skeleton for buttons
  const renderButtonsSkeleton = () => (
    <div className="flex items-center justify-between gap-2 mt-3 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
      <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
      <div className="h-8 bg-gray-200 rounded-lg flex-1"></div>
    </div>
  );

  // Render loading state for the total price
  const renderTotalPriceSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-14 bg-gradient-to-r from-blue-400/60 to-indigo-400/60 rounded-lg w-full"></div>
    </div>
  );

  // Whether we're ready to display data
  const isDataReady = !mcxLoading && !lmeLoading && !ratesLoading;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${className}`}>
      {/* MCX Based Price */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-100 h-full relative overflow-hidden group">
        {/* Background graphics */}
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full -mr-20 -mb-20 z-0"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600/5 rounded-full -ml-10 -mt-10 z-0"></div>
        
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

        <div className="space-y-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
              <span>MCX Aluminum Price (₹/kg)</span>
              {isMcxLiveMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live
                </span>
              )}
              {selectedMonth && !isMcxLiveMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {selectedMonth}
                </span>
              )}
            </label>
            
            {mcxLoading && !mcxPriceData ? (
              renderPriceInputSkeleton()
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  ref={mcxPriceFieldRef}
                  type="number"
                  value={mcxPrice}
                  onChange={handleMcxPriceChange}
                  className="w-full pl-8 pr-24 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-700 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                    [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter MCX price"
                  disabled={isMcxLiveMode}
                />
                <button
                  onClick={toggleMcxLiveMode}
                  disabled={mcxLoading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-sm font-medium 
                    flex items-center gap-1.5 transition-all duration-300 ${
                    isMcxLiveMode
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${mcxLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {mcxLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isMcxLiveMode ? (
                    <>
                      <Wifi className="w-4 h-4" />
                      Live
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4" />
                      Manual
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* MCX Month Buttons */}
            {loadingMonths ? (
              renderButtonsSkeleton()
            ) : (
              <div className="flex items-center justify-between gap-2 mt-3">
                {mcxMonthsData ? (
                  <>
                    <button
                      onClick={() => setMonthPrice(1)}
                      className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedMonth === mcxMonthsData.month1Label
                          ? 'bg-blue-100 border-blue-200 text-blue-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{mcxMonthsData.month1Label.split(' ')[0]}</span>
                    </button>
                    <button
                      onClick={() => setMonthPrice(2)}
                      className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedMonth === mcxMonthsData.month2Label
                          ? 'bg-purple-100 border-purple-200 text-purple-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-purple-50'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{mcxMonthsData.month2Label.split(' ')[0]}</span>
                    </button>
                    <button
                      onClick={() => setMonthPrice(3)}
                      className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedMonth === mcxMonthsData.month3Label
                          ? 'bg-pink-100 border-pink-200 text-pink-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-pink-50'
                      }`}
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
            
            {mcxConnectionError && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {mcxConnectionError}
              </p>
            )}
            {mcxLastUpdate && isMcxLiveMode && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last updated: {format(mcxLastUpdate, 'HH:mm:ss')}
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premium (₹/kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
              <input
                type="number"
                value={mcxPremium}
                onChange={(e) => setMcxPremium(e.target.value)}
                onKeyDown={handlePremiumKeyPress}
                className="w-full pl-8 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 
                  focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                  [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter premium"
              />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freight (₹/kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
              <input
                ref={freightInputRef}
                type="number"
                value={mcxFreight}
                onChange={(e) => setMcxFreight(e.target.value)}
                className="w-full pl-8 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 
                  focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                  [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter freight"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-blue-200/50">
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-white font-medium">₹</span>
                </div>
                <input
                  type="text"
                  value={calculateMCXTotal().toFixed(2)}
                  disabled
                  className={`w-full pl-9 pr-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 
                    border-0 rounded-lg font-bold text-white text-xl shadow-md transition-all duration-300
                    ${isMcxPriceUpdating ? 'animate-pulse' : ''}`}
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
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border border-purple-100 h-full relative overflow-hidden group">
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

        <div className="space-y-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
              <span>LME Aluminum Price (USD/MT)</span>
              {isLmeLiveMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live
                </span>
              )}
            </label>
            
            {lmeLoading && !lmePriceData ? (
              renderPriceInputSkeleton()
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  ref={lmePriceFieldRef}
                  type="number"
                  value={lmePrice}
                  onChange={handleLmePriceChange}
                  className="w-full pl-8 pr-24 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-700 
                    focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                    [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter LME price"
                  disabled={isLmeLiveMode}
                />
                <button
                  onClick={toggleLmeLiveMode}
                  disabled={lmeLoading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-sm font-medium 
                    flex items-center gap-1.5 transition-all duration-300 ${
                    isLmeLiveMode
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${lmeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {lmeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isLmeLiveMode ? (
                    <>
                      <Wifi className="w-4 h-4" />
                      Live
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4" />
                      Manual
                    </>
                  )}
                </button>
              </div>
            )}
            
            {lmeConnectionError && (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {lmeConnectionError}
              </p>
            )}
            {lmeLastUpdate && isLmeLiveMode && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last updated: {format(lmeLastUpdate, 'HH:mm:ss')}
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premium (USD/MT)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  value={lmePremium}
                  onChange={(e) => setLmePremium(e.target.value)}
                  onKeyDown={handlePremiumKeyPress}
                  className="w-full pl-8 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 
                    focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                    [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter premium"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setExchangeRateType('RBI')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    exchangeRateType === 'RBI'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  RBI
                </button>
                <button
                  type="button"
                  onClick={() => setExchangeRateType('SBI')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    exchangeRateType === 'SBI'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  SBI TT
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
              {ratesLoading ? (
                <div className="w-full animate-pulse flex items-center">
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              ) : (
                <span>
                  Rate: <span className="font-medium text-purple-700">₹{exchangeRateType === 'RBI' ? RBI_RATE.toFixed(4) : SBI_TT_RATE.toFixed(4)}</span>
                </span>
              )}
              {ratesLoading && <span className="text-purple-600 animate-pulse">Updating rates...</span>}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-100 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freight (₹/kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
              <input
                type="number"
                value={lmeFreight}
                onChange={(e) => setLmeFreight(e.target.value)}
                className="w-full pl-8 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 
                  focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                  [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter freight"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-purple-200/50">
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-white font-medium">₹</span>
                </div>
                <input
                  type="text"
                  value={calculateLMETotal().toFixed(2)}
                  disabled
                  className={`w-full pl-9 pr-4 py-4 bg-gradient-to-r from-purple-600 to-pink-600 
                    border-0 rounded-lg font-bold text-white text-xl shadow-md transition-all duration-300
                    ${isLmePriceUpdating ? 'animate-pulse' : ''}`}
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