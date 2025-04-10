'use client';

import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export default function MCXClock() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Only render the clock on the client side
  if (!mounted) {
    return (
      <div className="flex items-center gap-1">
        <ClockIcon className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500">--:--:--</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <ClockIcon className="w-4 h-4 text-gray-500" />
      <span className="text-xs text-gray-500">{time}</span>
    </div>
  );
} 