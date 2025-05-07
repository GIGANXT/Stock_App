'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  TooltipProps,
} from 'recharts';

interface DataPoint {
  time: string;
  value: number;
}

// Combined data set
const allData: DataPoint[] = [
  { time: '09:00', value: 240 },
  { time: '09:07', value: 241 },
  { time: '09:15', value: 242 },
  { time: '09:30', value: 245 },
  { time: '09:45', value: 242 },
  { time: '10:00', value: 238 },
  { time: '10:15', value: 234 },
  { time: '10:22', value: 233 },
  { time: '10:30', value: 230 },
  { time: '10:45', value: 228 },
  { time: '11:00', value: 225 },
  { time: '11:15', value: 220 },
  { time: '11:30', value: 215 },
  { time: '11:45', value: 212 },
  { time: '12:00', value: 210 },
  { time: '12:15', value: 213 },
  { time: '12:30', value: 217 },
  { time: '12:45', value: 220 },
  { time: '13:00', value: 225 },
  { time: '13:15', value: 222 },
  { time: '13:30', value: 220 },
  { time: '13:37', value: 223 },
  { time: '13:45', value: 224 },
  { time: '14:00', value: 227 },
  { time: '14:15', value: 228 },
  { time: '14:30', value: 230 },
  { time: '14:45', value: 235 },
  { time: '15:00', value: 240 },
  { time: '15:15', value: 242 },
  { time: '15:30', value: 243 },
  { time: '15:45', value: 241 },
  { time: '16:00', value: 240 },
  { time: '16:13', value: 244 },
  { time: '16:15', value: 243 },
  { time: '16:30', value: 245 },
  { time: '16:45', value: 243 },
  { time: '17:00', value: 242 },
  { time: '17:15', value: 244 },
  { time: '17:30', value: 245 },
  { time: '17:45', value: 246 },
  { time: '18:00', value: 247 },
  { time: '18:15', value: 244 },
  { time: '18:30', value: 242 },
  { time: '18:45', value: 246 },
  { time: '18:51', value: 248 },
  { time: '19:00', value: 250 },
  { time: '19:15', value: 253 },
  { time: '19:30', value: 255 },
  { time: '19:45', value: 257 },
  { time: '20:00', value: 260 },
  { time: '20:12', value: 259 },
  { time: '20:15', value: 258 },
  { time: '20:30', value: 255 },
  { time: '20:45', value: 259 },
  { time: '21:00', value: 265 },
  { time: '21:15', value: 270 },
  { time: '21:30', value: 280 },
  { time: '21:45', value: 275 },
  { time: '22:00', value: 270 },
  { time: '22:15', value: 255 },
  { time: '22:18', value: 254 },
  { time: '22:30', value: 240 },
  { time: '22:45', value: 237 },
  { time: '23:00', value: 235 },
  { time: '23:15', value: 232 },
  { time: '23:30', value: 230 },
];

// Sort by time
const sortedData = allData.sort((a, b) => {
  const [ah, am] = a.time.split(':').map(Number);
  const [bh, bm] = b.time.split(':').map(Number);
  return ah * 60 + am - (bh * 60 + bm);
});

// Transform data to include numeric timestamps for proper scaling
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const transformedData = sortedData.map(point => ({
  ...point,
  timeValue: timeToMinutes(point.time)
}));

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded shadow">
        <p className="text-sm text-slate-700 font-semibold">{label}</p>
        <p className="text-emerald-600 text-lg font-bold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function TrendsChart() {
  const [active, setActive] = useState('LME');

  const min = Math.min(...sortedData.map(d => d.value)) - 10;
  const max = Math.max(...sortedData.map(d => d.value)) + 10;
  const avg = sortedData.reduce((sum, d) => sum + d.value, 0) / sortedData.length;

  // Create evenly spaced time ticks every 30 minutes from 9:00 to 23:30
  const timeLabels = [];
  const timeValues = [];
  
  for (let hour = 9; hour <= 23; hour++) {
    timeLabels.push(`${hour.toString().padStart(2, '0')}:00`);
    timeValues.push(hour * 60);
    
    timeLabels.push(`${hour.toString().padStart(2, '0')}:30`);
    timeValues.push(hour * 60 + 30);
  }

  return (
    <div className="w-full p-6">
      <div className="flex gap-3 mb-4">
        {['LME', 'MCX May', 'MCX June', 'MCX July', 'LME vs MCX'].map(label => (
          <button
            key={label}
            onClick={() => setActive(label)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              active === label
                ? 'bg-emerald-500 text-white shadow'
                : 'bg-white text-slate-700 border hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-xl shadow p-4 h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={transformedData} 
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="timeValue"
              type="number"
              domain={[9*60, 23*60+30]} 
              tickFormatter={(value) => {
                const hour = Math.floor(value / 60).toString().padStart(2, '0');
                const minute = (value % 60).toString().padStart(2, '0');
                return `${hour}:${minute}`;
              }}
              ticks={timeValues}
              tick={{ fontSize: 10, fill: '#64748B' }}
              allowDataOverflow={true}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />}
              labelFormatter={(value) => {
                const hour = Math.floor(value / 60).toString().padStart(2, '0');
                const minute = (value % 60).toString().padStart(2, '0');
                return `${hour}:${minute}`;
              }}
            />
            <ReferenceLine y={avg} stroke="#CBD5E1" strokeDasharray="3 3" />

            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fillOpacity={1}
              fill="url(#colorFill)"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#10B981', stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}