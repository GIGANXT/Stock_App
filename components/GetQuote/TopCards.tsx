"use client";

import React from 'react';
import LiveSpotCard from '../Dashboard/LiveSpotCard';
import MCXAluminium from '../Dashboard/MCXAluminium';

const TopCards = () => {
  return (
    <div className="max-w-[1366px] mx-auto px-4 pt-3 md:pt-4">
      <section className="relative bg-gradient-to-br from-indigo-50/95 via-blue-50/95 to-sky-50/95 backdrop-blur-sm rounded-xl p-4 md:p-6 
        border border-indigo-100/50 shadow-[0_8px_16px_rgba(99,102,241,0.06)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.08)] 
        transition-all duration-300 overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.05)_0%,transparent_50%)]" />

        <div className="flex justify-between items-baseline mb-3 md:mb-4">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 
            bg-clip-text text-transparent">
            Live Market Data
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 md:gap-6">
          <div className="w-full md:col-span-2">
            <LiveSpotCard />
          </div>
          <div className="w-full md:col-span-5">
            {/* Custom styling wrapper for MCXAluminium to control height and width */}
            <div className="mcx-top-card-wrapper">
              <MCXAluminium />
            </div>
            {/* Add custom CSS to modify the MCXAluminium card */}
            <style jsx global>{`
              /* Target the MCXAluminium card when inside the top-card wrapper */
              .mcx-top-card-wrapper > div {
                min-height: auto !important; /* Auto height for mobile */
                max-height: none !important; /* Remove max height constraint */
                height: auto !important;
                width: 100% !important;
                overflow: visible !important; /* Allow content to be visible */
                padding: 0.75rem !important; /* Reduce overall padding */
                position: relative !important;
              }
              
              /* Fix loading state height */
              .mcx-top-card-wrapper .bg-white.rounded-lg.p-4.border.border-gray-200.shadow-sm.min-h-\\[190px\\],
              .mcx-top-card-wrapper .bg-white.rounded-xl.p-3.border.border-gray-100.shadow-\\[0_4px_12px_rgba\\(0\\,0\\,0\\,0\\.05\\)\\].hover\\:shadow-lg.transition-all.duration-200.min-h-\\[190px\\].relative {
                min-height: 162px !important;
                max-height: 162px !important;
                height: 162px !important;
                overflow: hidden !important;
              }
              
              /* Make the header more compact */
              .mcx-top-card-wrapper > div > div:first-child {
                margin-bottom: 0.25rem !important;
              }
              
              /* Show all month prices on mobile */
              .mcx-top-card-wrapper .hidden.sm\\:flex {
                display: flex !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow-x: auto !important;
                gap: 0.75rem !important;
                position: relative !important;
                justify-content: space-between !important;
              }
              
              /* CUSTOM DIVIDER IMPLEMENTATION */
              /* Hide all default dividers */
              .mcx-top-card-wrapper .hidden.sm\\:flex > div:not(:last-child)::after,
              .mcx-top-card-wrapper div[class*="w-0.5"],
              .mcx-top-card-wrapper div.flex-1.flex.items-center > div.h-12 {
                display: none !important;
              }

              /* Add solid bold dividers in-between month prices */
              .mcx-top-card-wrapper .hidden.sm\\:flex > div {
                position: relative !important;
              }
              
              .mcx-top-card-wrapper .hidden.sm\\:flex > div:not(:last-child) {
                border-right: 2px solid #4B5563 !important;
                margin-right: 15px !important;
                padding-right: 15px !important;
              }
              
              /* Make month blocks more compact */
              .mcx-top-card-wrapper .hidden.sm\\:flex > div {
                min-width: 85px !important;
                text-align: center !important;
              }
              
              /* Responsive font sizes for prices */
              .mcx-top-card-wrapper .font-mono {
                font-size: 1.25rem !important;
                line-height: 1.2 !important;
              }
              
              /* Ensure mobile contract visualization */
              .mcx-top-card-wrapper .flex.sm\\:hidden {
                display: flex !important;
                overflow-x: auto !important;
                padding-bottom: 0.5rem !important;
                margin-bottom: 0.5rem !important;
              }
              
              /* Make sure contango bar is visible */
              .mcx-top-card-wrapper .rounded-lg.shadow-sm.p-1\\.5.bg-white.border.border-gray-200 {
                display: block !important;
                margin-top: 0.5rem !important;
              }
              
              /* Properly style the contango section - RESTORE COLORS */
              .mcx-top-card-wrapper .p-1\\.5 .transition-all.py-2 {
                background: inherit !important;
              }
              
              /* Set text color for contango section */
              .mcx-top-card-wrapper .p-1\\.5 .transition-all.py-2 p {
                color: inherit !important;
              }
              
              /* Restore contango colors */
              .mcx-top-card-wrapper p.text-green-800 {
                color: rgb(22, 101, 52) !important;
              }
              
              .mcx-top-card-wrapper p.text-red-800 {
                color: rgb(153, 27, 27) !important;
              }
              
              .mcx-top-card-wrapper .bg-gradient-to-r.from-green-100.to-green-50 {
                background: linear-gradient(to right, rgb(220, 252, 231), rgb(240, 253, 244)) !important;
              }
              
              .mcx-top-card-wrapper .bg-gradient-to-r.from-red-100.to-red-50 {
                background: linear-gradient(to right, rgb(254, 226, 226), rgb(254, 242, 242)) !important;
              }
              
              /* Target the contango bar specifically as in MCXAluminium component */
              .mcx-top-card-wrapper .mt-auto {
                background: transparent !important;
              }
              
              /* Apply the proper contango/backwardation styling */
              .mcx-top-card-wrapper .text-center.py-1.px-2.mt-auto.rounded {
                display: block !important;
                width: 100% !important;
                text-align: center !important;
              }
              
              /* Fix centered content within contango bar */
              .mcx-top-card-wrapper .text-center.py-1.px-2.mt-auto.rounded .flex.items-center.justify-center.gap-1\\.5.text-xs {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important;
              }
              
              /* Green contango styling */
              .mcx-top-card-wrapper .text-center.py-1.px-2.mt-auto.rounded.bg-green-100 {
                background-color: rgb(220, 252, 231) !important; /* bg-green-100 */
                border: 1px solid rgb(187, 247, 208) !important; /* border-green-200 */
                color: rgb(22, 101, 52) !important; /* text-green-800 */
              }
              
              /* Red backwardation styling */
              .mcx-top-card-wrapper .text-center.py-1.px-2.mt-auto.rounded.bg-red-100 {
                background-color: rgb(254, 226, 226) !important; /* bg-red-100 */
                border: 1px solid rgb(254, 202, 202) !important; /* border-red-200 */
                color: rgb(153, 27, 27) !important; /* text-red-800 */
              }
              
              /* Fix Live button styling to match Dashboard */
              .mcx-top-card-wrapper button.flex.items-center.gap-1.px-2.py-0\\.5.rounded-full.text-xs.font-medium {
                background: linear-gradient(to right, #3b82f6, #4f46e5) !important;
                color: white !important;
                padding: 0.25rem 0.75rem !important;
                border: none !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 0.25rem !important;
                font-weight: 500 !important;
                border-radius: 9999px !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
              }
              
              /* Mobile view adjustments for Live button */
              @media (max-width: 639px) {
                /* Position the Live button better in mobile view */
                .mcx-top-card-wrapper > div > div:first-child {
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  width: 100% !important;
                  margin-bottom: 0.5rem !important;
                  padding: 0 0.25rem !important;
                }
                
                /* Fix header title and make it bigger */
                .mcx-top-card-wrapper > div > div:first-child > h2 {
                  font-size: 0.875rem !important;
                  font-weight: 600 !important;
                  margin: 0 !important;
                  white-space: nowrap !important;
                  overflow: hidden !important;
                  text-overflow: ellipsis !important;
                  max-width: 60% !important;
                }
                
                /* Position buttons container */
                .mcx-top-card-wrapper > div > div:first-child > div:last-child {
                  display: flex !important;
                  gap: 0.5rem !important;
                  align-items: center !important;
                  justify-content: flex-end !important;
                }
                
                /* Make the button more compact in mobile view */
                .mcx-top-card-wrapper button.flex.items-center.gap-1.px-2.py-0\\.5.rounded-full.text-xs.font-medium {
                  padding: 0.25rem 0.5rem !important;
                  font-size: 0.65rem !important;
                  height: 1.5rem !important;
                  min-width: 3rem !important;
                  justify-content: center !important;
                  margin-left: auto !important;
                }
                
                /* Hide text label on smallest screens */
                .mcx-top-card-wrapper button.flex.items-center span:not(:first-child) {
                  display: none !important;
                }
                
                /* Make indicator slightly smaller */
                .mcx-top-card-wrapper .w-1\\.5.h-1\\.5.bg-green-500.rounded-full {
                  width: 0.3rem !important;
                  height: 0.3rem !important;
                }
                
                /* Adjust layout of the card itself */
                .mcx-top-card-wrapper .bg-white.rounded-lg.p-4.border.border-gray-200.shadow-sm.min-h-\\[190px\\],
                .mcx-top-card-wrapper .bg-white.rounded-xl.p-3.border.border-gray-100.shadow-\\[0_4px_12px_rgba\\(0\\,0\\,0\\,0\\.05\\)\\].hover\\:shadow-lg.transition-all.duration-200.min-h-\\[190px\\].relative {
                  padding-top: 0.25rem !important;
                }
              }
              
              /* Live indicator pulse */
              .mcx-top-card-wrapper .w-1\\.5.h-1\\.5.bg-green-500.rounded-full {
                width: 0.375rem !important;
                height: 0.375rem !important;
                background-color: #22c55e !important;
                border-radius: 9999px !important;
                position: relative !important;
              }
              
              .mcx-top-card-wrapper .w-1\\.5.h-1\\.5.bg-green-500.rounded-full::after {
                content: '' !important;
                position: absolute !important;
                width: 100% !important;
                height: 100% !important;
                border-radius: 50% !important;
                background-color: #22c55e !important;
                opacity: 0.5 !important;
                animation: pulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite !important;
              }
              
              @keyframes pulse {
                0% {
                  transform: scale(1);
                  opacity: 0.5;
                }
                70% {
                  transform: scale(2);
                  opacity: 0;
                }
                100% {
                  transform: scale(2.5);
                  opacity: 0;
                }
              }
              
              @media (min-width: 640px) {
                .mcx-top-card-wrapper .font-mono {
                  font-size: 1.5rem !important;
                  line-height: 1.25 !important;
                }
                
                .mcx-top-card-wrapper > div {
                  min-height: 162px !important;
                  max-height: 162px !important;
                  padding: 0.5rem 1rem !important;
                  overflow: hidden !important;
                }
                
                /* Position contango section for laptop view */
                .mcx-top-card-wrapper .mt-auto {
                  position: relative !important;
                  bottom: auto !important;
                  left: auto !important;
                  right: auto !important;
                  transform: none !important;
                  margin-top: 0 !important;
                  z-index: 5 !important;
                  background: transparent !important;
                  backdrop-filter: none !important;
                }
              }

              /* Restore original contango section layout */
              .mcx-top-card-wrapper .py-1\\.5 {
                display: block !important;
                height: 0.375rem !important;
              }
              
              /* Move contango section to match MCXAluminium */
              .mcx-top-card-wrapper {
                position: relative !important;
              }
              
              .mcx-top-card-wrapper .mt-auto {
                position: absolute !important;
                bottom: 0.75rem !important;
                left: 50% !important;
                transform: translate(-50%, 0) !important;
                width: 200px !important;  /* Fixed width instead of percentage */
                padding: 2px 8px !important;
                z-index: 10 !important;
              }
              
              /* Style the contango section */
              .mcx-top-card-wrapper .text-center.py-1.px-2.mt-auto.rounded {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 120px !important;
                margin: 0 auto !important;
              }

              /* Ensure consistent positioning across screen sizes */
              @media (min-width: 640px) {
                .mcx-top-card-wrapper .mt-auto {
                  bottom: 0.75rem !important;
                  width: 200px !important;
                }
              }
              
              /* Hide the expand button (the last button in the header) */
              .mcx-top-card-wrapper > div > div:first-child > div:last-child > button:last-child {
                display: none !important;
              }
              
              /* Adjust title size for mobile */
              .mcx-top-card-wrapper > div > div:first-child h2 {
                font-size: 0.875rem !important;
              }
              
              @media (min-width: 640px) {
                .mcx-top-card-wrapper > div > div:first-child h2 {
                  font-size: 1rem !important;
                }
              }
              
              /* Hide anything that might be taking too much space */
              .mcx-top-card-wrapper div.border-t {
                display: none !important; /* Hide the Market Insight section */
              }
              
              /* Style loading effects to match MonthPrice component */
              
              /* For LiveSpotCard loading skeleton */
              .price-card .animate-pulse {
                animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
              }
              
              /* For MCXAluminium component loading skeleton */
              .mcx-top-card-wrapper .animate-pulse {
                animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
              }
              
              /* Make pulse animation more subtle like in MonthPrice */
              @keyframes pulse-subtle {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.7;
                }
              }
              
              /* Style the loading elements */
              .price-card .bg-gray-200, 
              .mcx-top-card-wrapper .bg-gray-200 {
                background-color: #f3f4f6 !important;
                border-radius: 0.25rem !important;
              }
              
              /* Make MCXAluminium loading match MonthPrice */
              .mcx-top-card-wrapper [class*="bg-gray-200"] {
                background-color: #f3f4f6 !important;
                border-radius: 0.25rem !important;
              }
            `}</style>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TopCards;