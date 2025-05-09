'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface MetalPriceContextType {
  lastFetchTime: number;
  triggerRefresh: () => void;
  registerRefreshListener: (callback: () => void) => () => void;
}

const MetalPriceContext = createContext<MetalPriceContextType | undefined>(undefined);

export function MetalPriceProvider({ children }: { children: ReactNode }) {
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());
  const [refreshListeners, setRefreshListeners] = useState<(() => void)[]>([]);

  // Function to trigger a refresh across all registered components
  const triggerRefresh = useCallback(() => {
    // Update the timestamp
    setLastFetchTime(Date.now());
    
    // Call all registered refresh callbacks
    refreshListeners.forEach(callback => callback());
    
    console.log(`Triggered price refresh for ${refreshListeners.length} components`);
  }, [refreshListeners]);

  // Function to register a refresh callback
  const registerRefreshListener = useCallback((callback: () => void) => {
    setRefreshListeners(prev => [...prev, callback]);
    
    // Return function to unregister the callback
    return () => {
      setRefreshListeners(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  return (
    <MetalPriceContext.Provider 
      value={{ 
        lastFetchTime,
        triggerRefresh,
        registerRefreshListener
      }}
    >
      {children}
    </MetalPriceContext.Provider>
  );
}

export function useMetalPrice() {
  const context = useContext(MetalPriceContext);
  if (context === undefined) {
    throw new Error('useMetalPrice must be used within a MetalPriceProvider');
  }
  return context;
} 