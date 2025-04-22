import React from "react";
import LMECashSettlement from "./LMECashSettlement";
import PriceAlert from "./PriceAlert";
import MCXAluminium from "./MCXAluminium";
import LMEAluminium from "./LMEAluminium";
import MonthPrice from "./MonthPrice";
import RatesDisplay from "./RatesDisplay";
import LiveSpotCard from "./LiveSpotCard";
import FeedbackBanner from "./FeedbackBanner";
import { subDays } from "date-fns";
import { format } from "date-fns";

// Mock data that would normally come from backend
const MOCK_LME_DATA = [
  { date: "2023-06-01", price: 2250, change: 12, changePercent: 0.54 },
  { date: "2023-05-31", price: 2238, change: -8, changePercent: -0.36 },
  { date: "2023-05-30", price: 2246, change: 5, changePercent: 0.22 },
  { date: "2023-05-29", price: 2241, change: 0, changePercent: 0 },
];

// Mock RBI reference rates for each day
const MOCK_RBI_RATES: { [key: string]: number } = {
  "2023-06-01": 84.4063,
  "2023-05-31": 84.2500,
  "2023-05-30": 84.1080,
  "2023-05-29": 83.9750,
  "2023-05-28": 83.8500,
};

// Current RBI rate
const CURRENT_RBI_RATE = 84.4063;

export default function MarketDashboard() {
  // Using mock data instead of backend hook
  const data = MOCK_LME_DATA || [];
  const currentDate = new Date();
  
  // Calculate previous dates for historical cards
  const previousDates = [
    subDays(currentDate, 1),
    subDays(currentDate, 2),
    subDays(currentDate, 3)
  ];

  // Get actual prices for each day and the day before
  const getHistoricalData = (index: number) => {
    // Use mock data if available, otherwise use default values
    const mockItem = data[index + 1] || { price: 2200 - (index * 10), change: index === 1 ? -8 : index * 5 };
    const mockItemPrevDay = data[index + 2] || { price: mockItem.price - mockItem.change };
    
    // Calculate current and previous day RBI rates
    // In a real app, these would come from an API
    const currentDateKey = format(previousDates[index], 'yyyy-MM-dd');
    const prevDateKey = format(subDays(previousDates[index], 1), 'yyyy-MM-dd');
    
    const rbiRate = MOCK_RBI_RATES[currentDateKey] || CURRENT_RBI_RATE - (0.15 * (index + 1));
    const prevRbiRate = MOCK_RBI_RATES[prevDateKey] || rbiRate - 0.15;
    
    return {
      basePrice: mockItem.price,
      spread: mockItem.change,
      prevDayPrice: mockItemPrevDay.price,
      exchangeRate: rbiRate,
      prevExchangeRate: prevRbiRate
    };
  };

  return (
    <div className="max-w-[1366px] mx-auto px-4 pt-4 space-y-2 min-h-screen">
      <FeedbackBanner />
      
      {/* LME Cash Settlement Block */}
      <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-6 
        border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)] 
        transition-all duration-300 overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.05)_0%,transparent_50%)]" />

        <div className="relative">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              LME Cash Settlement
            </h2>
            <p className="text-sm text-gray-500">Source: Westmetals</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Live Spot Card */}
            <LiveSpotCard lastUpdated={currentDate} />

            {/* Historical Cards */}
            {previousDates.map((date, index) => {
              const historicalData = getHistoricalData(index);
              return (
                <LMECashSettlement
                  key={date.toISOString()}
                  basePrice={historicalData.basePrice}
                  spread={historicalData.spread}
                  prevDayPrice={historicalData.prevDayPrice}
                  exchangeRate={historicalData.exchangeRate}
                  prevExchangeRate={historicalData.prevExchangeRate}
                  lastUpdated={date}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Left Column - Price Alert */}
        <div>
          <PriceAlert />
        </div>

        {/* Right Column */}
        <div className="space-y-2 mb-6">
          {/* MCX Aluminium */}
          <MCXAluminium />

          {/* LME, Month Price and Rates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <LMEAluminium />
              <MonthPrice />
            </div>
            <div>
              <RatesDisplay />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}