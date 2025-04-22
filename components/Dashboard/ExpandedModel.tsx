import React from "react";
import { X, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface ExpandedModalProps {
  onClose: () => void;
  data: {
    march: { price: number; change: number };
    april: { price: number; change: number };
    may: { price: number; change: number };
  };
  lastUpdated: string;
}

export default function ExpandedModal({
  onClose,
  data,
  lastUpdated,
}: ExpandedModalProps) {
  const spread = data.april.price - data.march.price;
  const isContango = spread > 0;
  const formattedTime = format(new Date(lastUpdated), "HH:mm:ss");

  const ContractPrice = ({
    month,
    price,
    change,
    gradient,
  }: {
    month: string;
    price: number;
    change: number;
    gradient: string;
  }) => (
    <div className="flex-1 text-center">
      <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-2">
        <Calendar
          className={`w-4 h-4 ${
            month === "March"
              ? "text-blue-600"
              : month === "April"
              ? "text-purple-600"
              : "text-pink-600"
          }`}
        />
        <span>{month}</span>
      </div>
      <div
        className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
      >
        ₹{price.toFixed(2)}
      </div>
      <div
        className={`flex items-center justify-center gap-1 mt-1  ${
          change >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {change >= 0 ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span className="text-sm">
          {change >= 0 ? "+" : ""}
          {change}%
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-tr from-white to-gray-50 rounded-xl shadow-xl w-full max-w-3xl mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MCX Aluminium
              </h2>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">
                  Live
                </span>
                <span className="text-xs text-gray-500">
                  Last updated: {formattedTime}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Price Grid */}
          <div className="grid grid-cols-3 gap-8 mb-6">
            <ContractPrice
              month="March"
              price={data.march.price}
              change={data.march.change}
              gradient="from-blue-600 to-purple-600"
            />
            <ContractPrice
              month="April"
              price={data.april.price}
              change={data.april.change}
              gradient="from-purple-600 to-pink-600"
            />
            <ContractPrice
              month="May"
              price={data.may.price}
              change={data.may.change}
              gradient="from-pink-600 to-rose-600"
            />
          </div>

          {/* Market Structure Indicator */}
          <div
            className={` text-center py-3 px-4 rounded-lg  ${
              isContango
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2 font-medium pt-2 ">
              <span>{isContango ? "CONTANGO" : "BACKWARDATION"}</span>
              <span>₹{Math.abs(spread).toFixed(2)}</span>
              {isContango ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
