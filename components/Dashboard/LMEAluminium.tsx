import React, { useState } from "react";
import { TrendingUp, TrendingDown, Clock, Maximize2, X } from "lucide-react";
import { SPOT_PRICE_DATA } from "./types";

export default function LMEAluminium() {
  const [showExpanded, setShowExpanded] = useState(false);
  const { price: spotPrice, change: spotChange, changePercent: spotChangePercent } = SPOT_PRICE_DATA;

  return (
    <>
      {/* Regular Card View */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-blue-600">Spot Price</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              <span>Delayed (30 mins)</span>
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

        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-3xl text-blue-600">
            ${spotPrice.toFixed(2)}
          </span>
          <span className="text-gray-500">/MT</span>
        </div>

        <div className={`flex items-center gap-2 mt-2 ${spotChange >= 0 ? "text-green-600" : "text-red-600"}`}>
          <div className={`p-1 rounded-full ${spotChange >= 0 ? "bg-green-100" : "bg-red-100"}`}>
            {spotChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <span className="font-medium">
            {spotChange >= 0 ? "+" : ""}
            {spotChange.toFixed(2)} ({spotChangePercent >= 0 ? "+" : ""}
            {spotChangePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Expanded Modal View */}
      {showExpanded && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto border border-gray-200">
            <div className="flex items-center justify-between w-full mb-6">
              <h2 className="text-xl font-bold text-blue-600">Spot Price</h2>
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
                  <Clock className="w-4 h-4" />
                  <span>Delayed (30 mins)</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-4xl text-blue-600">
                  ${spotPrice.toFixed(2)}
                </span>
                <span className="text-gray-500">/MT</span>
              </div>

              <div className={`flex items-center gap-2 ${spotChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                <div className={`p-1 rounded-full ${spotChange >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                  {spotChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <span className="font-medium">
                  {spotChange >= 0 ? "+" : ""}
                  {spotChange.toFixed(2)} ({spotChangePercent >= 0 ? "+" : ""}
                  {spotChangePercent.toFixed(2)}%)
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <p>The current spot price reflects immediate market conditions for aluminium delivery. Today&apos;s {spotChange >= 0 ? "increase" : "decrease"} indicates {spotChange >= 0 ? "strengthening" : "weakening"} demand in the physical market.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
