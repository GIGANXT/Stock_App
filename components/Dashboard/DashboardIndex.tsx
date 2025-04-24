import React, { useState, useEffect, useCallback } from "react";
import LMECashSettlement from "./LMECashSettlement";
import PriceAlert from "./PriceAlert";
import MCXAluminium from "./MCXAluminium";
import LMEAluminium from "./LMEAluminium";
import MonthPrice from "./MonthPrice";
import RatesDisplay from "./RatesDisplay";
import DelayedSpotCard from "./DelayedSpotCard";
import FeedbackBanner from "./FeedbackBanner";
import { X, Clock, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

// Static data for LME Cash Settlement cards
const lmeHistoricalData = [
  {
    basePrice: 2384.00,
    spread: 28.5,
    spreadPercent: "", // No longer displayed in the UI as per requirements
    spreadINR: "3228.52",
    isIncrease: true,
    formattedDate: "23. April 2025"
  },
  {
    basePrice: 2355.50,
    spread: 28,
    spreadPercent: "1.50", // No longer displayed in the UI as per requirements
    spreadINR: "1288.88",
    isIncrease: false,
    formattedDate: "22. April 2025"
  },
  {
    basePrice: 2327.50,
    spread: -5,
    spreadPercent: "0.57", // No longer displayed in the UI as per requirements
    spreadINR: "605.3547",
    isIncrease: false,
    formattedDate: "17. April 2025"
  }
];

export default function MarketDashboard() {
  const currentDate = new Date();
  const [showLMEPopup, setShowLMEPopup] = useState(false);
  
  const todaysLMEData = {
    price: 2387.25,
    date: format(currentDate, "dd MMMM yyyy"),
    time: format(currentDate, "HH:mm:ss")
  };

  // Handle ESC key to close popup - using useCallback for better performance
  const closePopup = useCallback(() => {
    setShowLMEPopup(false);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup();
      }
    };
    
    if (showLMEPopup) {
      window.addEventListener('keydown', handleEsc);
      // Prevent scrolling when popup is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [showLMEPopup, closePopup]);

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
            <button 
              onClick={() => setShowLMEPopup(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white 
                bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700
                hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800
                rounded-md shadow-lg hover:shadow-xl transition-all duration-200
                border border-blue-700/20 hover:translate-y-[-2px] active:translate-y-0
                animate-pulse-subtle flex items-center gap-2"
              aria-label="View today's LME Cash Settlement"
              style={{
                animation: "pulse-light 2s infinite",
                animationDelay: "1s"
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="whitespace-nowrap">Today&apos;s LME Cash Settlement</span>
              </div>
            </button>
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
          
          {/* Source attribution - moved below */}
          <div className="flex justify-end mt-3">
            <p className="text-sm text-gray-500">Source: Westmetals</p>
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

      {/* LME Cash Settlement Popup */}
      {showLMEPopup && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
          onClick={closePopup}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fadeIn overflow-hidden
              border border-gray-100"
            style={{
              animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100 rounded-full opacity-50 z-0"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full opacity-50 z-0"></div>
            
            {/* Close button with improved positioning and styling */}
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log("Close button clicked"); // Debug log
                closePopup();
              }} 
              className="absolute top-4 right-4 z-20 h-10 w-10 flex items-center justify-center
                bg-white hover:bg-gray-100 rounded-full shadow-md border border-gray-300
                text-gray-700 hover:text-gray-900 transition-all duration-200
                cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105"
              aria-label="Close popup"
              type="button"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            
            {/* Header with refined styling */}
            <div className="mb-8 relative z-10">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-700 bg-clip-text text-transparent leading-tight">
                Today&apos;s LME Cash Settlement
              </h3>
              <div className="w-24 h-1 bg-gradient-to-r from-indigo-600 to-blue-600 mt-3 rounded-full"></div>
            </div>
            
            {/* Content with refined styling */}
            <div className="space-y-8 relative z-10">
              {/* Price */}
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200/50">
                  <DollarSign className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">Settlement Price</p>
                  <p className="text-3xl font-bold text-gray-900 font-mono">${todaysLMEData.price.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200/50">
                  <Calendar className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1.5">Date</p>
                  <p className="text-xl font-medium text-gray-900">{todaysLMEData.date}</p>
                </div>
              </div>
              
              {/* Time */}
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200/50">
                  <Clock className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1.5">Time</p>
                  <p className="text-xl font-medium text-gray-900">{todaysLMEData.time}</p>
                </div>
              </div>
            </div>
            
            {/* Footer - without source attribution */}
            <div className="mt-10 pt-5 border-t border-gray-100 relative z-10">
              {/* Footer content removed as requested */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
