import React from "react";
import LMECashSettlement from "./LMECashSettlement";
import PriceAlert from "./PriceAlert";
import MCXAluminium from "./MCXAluminium";
import LMEAluminium from "./LMEAluminium";
import MonthPrice from "./MonthPrice";
import RatesDisplay from "./RatesDisplay";
import DelayedSpotCard from "./DelayedSpotCard";
import FeedbackBanner from "./FeedbackBanner";

// Static data for LME Cash Settlement cards
const lmeHistoricalData = [
  {
    basePrice: 2355.50,
    spread: 28,
    spreadPercent: "1.50", // No longer displayed in the UI as per requirements
    spreadINR: "1288.88",
    isIncrease: true,
    formattedDate: "22. April 2025"
  },
  {
    basePrice: 2327.50,
    spread: -5,
    spreadPercent: "0.57", // No longer displayed in the UI as per requirements
    spreadINR: "605.3547",
    isIncrease: false,
    formattedDate: "17. April 2025"
  },
  {
    basePrice: 2332.50,
    spread: -1,
    spreadPercent: "0.96", // No longer displayed in the UI as per requirements
    spreadINR: "188.554",
    isIncrease: false,
    formattedDate: "16. April 2025"
  }
];

export default function MarketDashboard() {
  const currentDate = new Date();

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
            {/* Delayed Spot Card */}
            <DelayedSpotCard lastUpdated={currentDate} />

            {/* Historical Cards with static data */}
            {lmeHistoricalData.map((data, index) => (
              <LMECashSettlement 
                key={`static-${index + 1}`}
                basePrice={data.basePrice}
                spread={data.spread}
                spreadINR={data.spreadINR}
                isIncrease={data.isIncrease}
                formattedDate={data.formattedDate}
              />
            ))}
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