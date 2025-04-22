"use client";

import { useState, useRef, useEffect } from 'react';
import { Calculator, Wifi, WifiOff, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMCXPrice } from '../../hook/useMCXPrice';
import { useLMEPrice } from '../../hook/useLMEPrice';

interface PriceCalculatorProps {
  className?: string;
}

type ExchangeRateType = 'RBI' | 'SBI';

export default function PriceCalculator({ className }: PriceCalculatorProps) {
  const [mcxPrice, setMcxPrice] = useState('243.75');
  const [mcxPremium, setMcxPremium] = useState('');
  const [mcxFreight, setMcxFreight] = useState('');
  
  const [lmePrice, setLmePrice] = useState('2639.50');
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

  const DUTY_FACTOR = 1.0825;
  const RBI_RATE = 84.4063;
  const SBI_TT_RATE = 84.6500;

  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;

    if (isMcxLiveMode && mcxPriceData) {
      setMcxPrice(mcxPriceData.currentPrice.toFixed(2));
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
  }, [isMcxLiveMode, mcxPriceData]);

  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;

    if (isLmeLiveMode && lmePriceData) {
      setLmePrice(lmePriceData.currentPrice.toFixed(2));
      setLmeLastUpdate(new Date());
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

  const handlePremiumKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && freightInputRef.current) {
      freightInputRef.current.focus();
    }
  };

  const toggleMcxLiveMode = () => {
    if (!isMcxLiveMode && mcxLoading) return;
    setIsMcxLiveMode(!isMcxLiveMode);
    if (!isMcxLiveMode) {
      setMcxLastUpdate(new Date());
    }
  };

  const toggleLmeLiveMode = () => {
    if (!isLmeLiveMode && lmeLoading) return;
    setIsLmeLiveMode(!isLmeLiveMode);
    if (!isLmeLiveMode) {
      setLmeLastUpdate(new Date());
    }
  };

  const handleMcxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMcxLiveMode(false);
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

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${className}`}>
      {/* MCX Based Price */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-100 h-[101.5%]">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MCX Based Price
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MCX Aluminum Price (₹/kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">₹</span>
              </div>
              <input
                ref={mcxPriceFieldRef}
                type="number"
                value={mcxPrice}
                onChange={handleMcxPriceChange}
                className="w-full pl-8 pr-24 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-700 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                  [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter MCX price"
                disabled={isMcxLiveMode}
              />
              <button
                onClick={toggleMcxLiveMode}
                disabled={mcxLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-sm font-medium 
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
            {mcxConnectionError && (
              <p className="mt-1 text-sm text-red-500">{mcxConnectionError}</p>
            )}
            {mcxLastUpdate && isMcxLiveMode && (
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last updated: {format(mcxLastUpdate, 'HH:mm:ss')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premium (₹/kg)
            </label>
            <input
              type="number"
              value={mcxPremium}
              onChange={(e) => setMcxPremium(e.target.value)}
              onKeyDown={handlePremiumKeyPress}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 
                focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter premium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freight (₹/kg)
            </label>
            <input
              ref={freightInputRef}
              type="number"
              value={mcxFreight}
              onChange={(e) => setMcxFreight(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 
                focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter freight"
            />
          </div>

          <div className="pt-4 border-t border-blue-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Price (per kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-white">₹</span>
              </div>
              <input
                type="text"
                value={calculateMCXTotal().toFixed(2)}
                disabled
                className={`w-full pl-8 pr-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 
                  border-0 rounded-lg font-bold text-white text-lg shadow-sm transition-all duration-300
                  ${isMcxPriceUpdating ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* LME Based Price */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm p-6 border border-purple-100 h-[101.5%]">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Calculator className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            LME Based Price
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LME Aluminum Price (USD/MT)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                ref={lmePriceFieldRef}
                type="number"
                value={lmePrice}
                onChange={handleLmePriceChange}
                className="w-full pl-8 pr-24 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-700 
                  focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                  [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter LME price"
                disabled={isLmeLiveMode}
              />
              <button
                onClick={toggleLmeLiveMode}
                disabled={lmeLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-sm font-medium 
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
            {lmeConnectionError && (
              <p className="mt-1 text-sm text-red-500">{lmeConnectionError}</p>
            )}
            {lmeLastUpdate && isLmeLiveMode && (
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last updated: {format(lmeLastUpdate, 'HH:mm:ss')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premium (USD/MT)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={lmePremium}
                onChange={(e) => setLmePremium(e.target.value)}
                onKeyDown={handlePremiumKeyPress}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 
                  focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                  [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter premium"
              />
              <div className="flex rounded-lg overflow-hidden border-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setExchangeRateType('RBI')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    exchangeRateType === 'RBI'
                      ? 'bg-purple-600 text-white'
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
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  SBI TT
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Rate: ₹{exchangeRateType === 'RBI' ? RBI_RATE.toFixed(4) : SBI_TT_RATE.toFixed(4)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freight (₹/kg)
            </label>
            <input
              type="number"
              value={lmeFreight}
              onChange={(e) => setLmeFreight(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 
                focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter freight"
            />
          </div>

          <div className="pt-4 border-t border-purple-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Price (per kg)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-white">₹</span>
              </div>
              <input
                type="text"
                value={calculateLMETotal().toFixed(2)}
                disabled
                className={`w-full pl-8 pr-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 
                  border-0 rounded-lg font-bold text-white text-lg shadow-sm transition-all duration-300
                  ${isLmePriceUpdating ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}