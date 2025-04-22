'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Clock() {
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    const updateTime = () => {
      setTime(format(new Date(), 'HH:mm:ss'));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return <span className="whitespace-nowrap text-sm text-gray-600 crisp-text">{time}</span>;
}