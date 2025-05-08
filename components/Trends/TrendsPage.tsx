'use client';

import React, { useState } from 'react';

export default function TrendsChart() {
  const [activeTab, setActiveTab] = useState<'lme' | 'mcx-may' | 'mcx-june' | 'mcx-july'>('lme');
  
  // Import the components using React.lazy for better performance
  const LMETrends = React.lazy(() => import('./LMETrends'));
  const MCXMonthlyTrends = React.lazy(() => import('./MCXMonthlyTrends'));

  return (
    <div className="w-full space-y-8">
      {/* Tab selector */}
      <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
        <button
          onClick={() => setActiveTab('lme')}
          className={`px-4 py-2 text-sm rounded-md transition-all ${
            activeTab === 'lme'
              ? 'bg-white shadow-sm text-emerald-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          LME
        </button>
        <button
          onClick={() => setActiveTab('mcx-may')}
          className={`px-4 py-2 text-sm rounded-md transition-all ${
            activeTab === 'mcx-may'
              ? 'bg-white shadow-sm text-blue-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          MCX May
        </button>
        <button
          onClick={() => setActiveTab('mcx-june')}
          className={`px-4 py-2 text-sm rounded-md transition-all ${
            activeTab === 'mcx-june'
              ? 'bg-white shadow-sm text-blue-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          MCX June
        </button>
        <button
          onClick={() => setActiveTab('mcx-july')}
          className={`px-4 py-2 text-sm rounded-md transition-all ${
            activeTab === 'mcx-july'
              ? 'bg-white shadow-sm text-blue-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          MCX July
        </button>
      </div>

      {/* Chart container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <React.Suspense fallback={<div className="flex items-center justify-center h-80"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>}>
          {activeTab === 'lme' ? (
            <LMETrends />
          ) : (
            <MCXMonthlyTrends initialMonth={activeTab === 'mcx-may' ? 'may' : activeTab === 'mcx-june' ? 'june' : 'july'} />
          )}
        </React.Suspense>
      </div>
    </div>
  );
}
