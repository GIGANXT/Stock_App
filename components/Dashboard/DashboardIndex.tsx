import React from "react";
import LMECashSettlement from "./LMECashSettlement";
import PriceAlert from "./PriceAlert";
import MCXAluminium from "./MCXAluminium";
import LMEAluminium from "./LMEAluminium";
import RatesDisplay from "./RatesDisplay";
import LiveSpotCard from "./LiveSpotCard";
import FeedbackBanner from "./FeedbackBanner";

// Mock data that would normally come from backend
const MOCK_LME_DATA = [
  { date: "2023-06-01", price: 2250, change: 12, changePercent: 0.54 },
  { date: "2023-05-31", price: 2238, change: -8, changePercent: -0.36 },
  { date: "2023-05-30", price: 2246, change: 5, changePercent: 0.22 },
  { date: "2023-05-29", price: 2241, change: 0, changePercent: 0 },
];

const RBI_RATE = 84.4063;

export default function MarketDashboard() {
  // Using mock data instead of backend hook
  const data = MOCK_LME_DATA || [];
  const lastUpdated = new Date().toISOString();

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
            <LiveSpotCard lastUpdated={new Date(lastUpdated)} />

            {/* Historical Cards - Safe check for empty data */}
            {data.length > 1 ? (
              data.slice(1).map((item) => (
                <LMECashSettlement
                  key={item.date}
                  basePrice={item.price}
                  spread={item.change}
                  exchangeRate={RBI_RATE}
                  lastUpdated={new Date(item.date)}
                />
              ))
            ) : (
              <p className="text-gray-500 text-sm">No historical data available.</p>
            )}
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

          {/* LME and Rates Grid - Updated for responsive layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LMEAluminium />
            <RatesDisplay />
          </div>
        </div>
      </div>
    </div>
  );
}