'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

type IndexType = 'LME_CSP' | 'LME_3M' | 'MCX_MAR' | 'MCX_APR' | 'MCX_MAY' | 'MCX_ALL';
type ViewType = 'line' | 'candle';

interface OhlcData {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartData {
  time: string;
  lmeCsp: number;
  lme3m: number;
  mcxMar: number;
  mcxApr: number;
  mcxMay: number;
  lmeCspOhlc: OhlcData;
  lme3mOhlc: OhlcData;
  mcxMarOhlc: OhlcData;
  mcxAprOhlc: OhlcData;
  mcxMayOhlc: OhlcData;
}

interface CandleStickProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: ChartData;
  dataKey: string;
  yAxis?: {
    scale: (value: number) => number;
  };
}

interface TooltipPayload {
  name?: string;
  dataKey: string;
  value: number;
  color: string;
  payload: ChartData;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface BarShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: ChartData;
  dataKey: string;
  yAxis: {
    scale: (value: number) => number;
  };
}

const generateTimeData = (): ChartData[] => {
  const data: ChartData[] = [];
  const times = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  const lmeCsp: OhlcData[] = [
    { open: 2695, high: 2705, low: 2690, close: 2700 },
    { open: 2700, high: 2710, low: 2698, close: 2705 },
    { open: 2705, high: 2715, low: 2700, close: 2710 },
    { open: 2710, high: 2715, low: 2705, close: 2708 },
    { open: 2708, high: 2715, low: 2705, close: 2712 },
    { open: 2712, high: 2720, low: 2710, close: 2715 },
    { open: 2715, high: 2725, low: 2712, close: 2720 }
  ];

  const lme3m: OhlcData[] = [
    { open: 2680, high: 2690, low: 2675, close: 2685 },
    { open: 2685, high: 2695, low: 2680, close: 2690 },
    { open: 2690, high: 2700, low: 2685, close: 2695 },
    { open: 2695, high: 2700, low: 2690, close: 2693 },
    { open: 2693, high: 2700, low: 2690, close: 2698 },
    { open: 2698, high: 2705, low: 2695, close: 2700 },
    { open: 2700, high: 2705, low: 2698, close: 2702 }
  ];

  const mcxMar: OhlcData[] = [
    { open: 243.50, high: 245.00, low: 243.00, close: 244.50 },
    { open: 244.50, high: 245.50, low: 244.00, close: 245.00 },
    { open: 245.00, high: 246.50, low: 244.50, close: 246.00 },
    { open: 246.00, high: 246.50, low: 245.50, close: 245.75 },
    { open: 245.75, high: 246.50, low: 245.50, close: 246.30 },
    { open: 246.30, high: 247.50, low: 246.00, close: 247.00 },
    { open: 247.00, high: 248.00, low: 246.50, close: 247.50 }
  ];

  const mcxApr: OhlcData[] = [
    { open: 244.25, high: 246.00, low: 244.00, close: 245.25 },
    { open: 245.25, high: 246.00, low: 244.75, close: 245.75 },
    { open: 245.75, high: 246.50, low: 245.25, close: 246.25 },
    { open: 246.25, high: 246.50, low: 245.75, close: 246.00 },
    { open: 246.00, high: 247.00, low: 245.75, close: 246.75 },
    { open: 246.75, high: 247.50, low: 246.50, close: 247.10 },
    { open: 247.10, high: 248.00, low: 246.75, close: 247.40 }
  ];

  const mcxMay: OhlcData[] = [
    { open: 244.60, high: 246.50, low: 244.25, close: 245.60 },
    { open: 245.60, high: 246.50, low: 245.00, close: 246.10 },
    { open: 246.10, high: 247.00, low: 245.75, close: 246.60 },
    { open: 246.60, high: 247.00, low: 246.00, close: 246.40 },
    { open: 246.40, high: 247.50, low: 246.00, close: 247.00 },
    { open: 247.00, high: 248.00, low: 246.75, close: 247.50 },
    { open: 247.50, high: 248.50, low: 247.00, close: 248.00 }
  ];

  times.forEach((time, i) => {
    data.push({
      time,
      lmeCsp: lmeCsp[i].close,
      lme3m: lme3m[i].close,
      mcxMar: mcxMar[i].close,
      mcxApr: mcxApr[i].close,
      mcxMay: mcxMay[i].close,
      lmeCspOhlc: lmeCsp[i],
      lme3mOhlc: lme3m[i],
      mcxMarOhlc: mcxMar[i],
      mcxAprOhlc: mcxApr[i],
      mcxMayOhlc: mcxMay[i],
    });
  });

  return data;
};

const CandleStick = (props: CandleStickProps) => {
  const { x, width, payload, dataKey, yAxis } = props;
  
  // Get the OHLC data based on dataKey
  const ohlcKey = `${dataKey}Ohlc` as keyof ChartData;
  const ohlc = payload[ohlcKey] as OhlcData;
  
  if (!ohlc || !yAxis?.scale) return null;

  const { open, high, low, close } = ohlc;
  const isUp = close >= open;
  const color = isUp ? '#10B981' : '#EF4444';
  const candleWidth = width * 0.6;
  const candleX = x + (width - candleWidth) / 2;

  // Use the yAxis scale to convert values to coordinates
  const scale = yAxis.scale;

  // Calculate coordinates for each part of the candle
  const highY = scale(high);
  const lowY = scale(low);
  const openY = scale(open);
  const closeY = scale(close);

  // Determine the top and bottom of the candle body
  const bodyTop = isUp ? closeY : openY;
  const bodyBottom = isUp ? openY : closeY;
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);

  return (
    <g>
      {/* Upper wick */}
      <line
        x1={x + width / 2}
        y1={highY}
        x2={x + width / 2}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Candle body */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        rx={2}
        ry={2}
      />

      {/* Lower wick */}
      <line
        x1={x + width / 2}
        y1={bodyBottom}
        x2={x + width / 2}
        y2={lowY}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
};

export default function TrendsPage() {
  const [viewType, setViewType] = useState<ViewType>('line');
  const [selectedIndices, setSelectedIndices] = useState<IndexType[]>(['LME_CSP']);
  const data = generateTimeData();

  const handleIndexChange = (index: IndexType) => {
    if (index === 'MCX_ALL') {
      if (selectedIndices.some(i => i === 'LME_CSP' || i === 'LME_3M')) {
        alert("You can't select all MCX months with LME indices");
        return;
      }
      setSelectedIndices(['MCX_ALL']);
      return;
    }

    let newIndices = [...selectedIndices];
    if (newIndices.includes(index)) {
      newIndices = newIndices.filter(i => i !== index);
    } else {
      if ((index === 'LME_CSP' || index === 'LME_3M') && newIndices.includes('MCX_ALL')) {
        alert("You can't select LME indices with all MCX months");
        return;
      }
      if (newIndices.includes('MCX_ALL')) {
        newIndices = [index];
      } else {
        newIndices.push(index);
      }
    }
    setSelectedIndices(newIndices);
  };

  const getLineColor = (index: string) => {
    switch (index) {
      case 'lmeCsp': return '#3B82F6';
      case 'lme3m': return '#8B5CF6';
      case 'mcxMar': return '#10B981';
      case 'mcxApr': return '#F59E0B';
      case 'mcxMay': return '#EC4899';
      default: return '#3B82F6';
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          {payload.map((entry) => {
            const name = entry.name || entry.dataKey;
            const isLme = name.startsWith('lme');
            const prefix = isLme ? '$' : '₹';

            if (viewType === 'candle') {
              const ohlcKey = `${entry.dataKey}Ohlc` as keyof ChartData;
              const ohlc = entry.payload[ohlcKey] as OhlcData;
              return (
                <div key={name} className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-medium" style={{ color: entry.color }}>
                      {name === 'lmeCsp' ? 'LME CSP' :
                       name === 'lme3m' ? 'LME 3M' :
                       name === 'mcxMar' ? 'MCX Mar' :
                       name === 'mcxApr' ? 'MCX Apr' : 'MCX May'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <div>Open: <span className="font-medium">{prefix}{ohlc.open}</span></div>
                    <div>High: <span className="font-medium">{prefix}{ohlc.high}</span></div>
                    <div>Low: <span className="font-medium">{prefix}{ohlc.low}</span></div>
                    <div>Close: <span className="font-medium">{prefix}{ohlc.close}</span></div>
                  </div>
                </div>
              );
            }

            return (
              <div key={name} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium" style={{ color: entry.color }}>
                  {name === 'lmeCsp' ? 'LME CSP' :
                   name === 'lme3m' ? 'LME 3M' :
                   name === 'mcxMar' ? 'MCX Mar' :
                   name === 'mcxApr' ? 'MCX Apr' : 'MCX May'}:
                </span>
                <span className="text-gray-600">
                  {prefix}{entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (viewType === 'line') {
      return (
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="time"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="lme"
            orientation="left"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value}`}
            stroke="#3B82F6"
            tick={{ fill: '#3B82F6', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="mcx"
            orientation="right"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `₹${value}`}
            stroke="#10B981"
            tick={{ fill: '#10B981', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {selectedIndices.includes('LME_CSP') && (
            <Line
              yAxisId="lme"
              type="monotone"
              dataKey="lmeCsp"
              name="LME CSP"
              stroke={getLineColor('lmeCsp')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          {selectedIndices.includes('LME_3M') && (
            <Line
              yAxisId="lme"
              type="monotone"
              dataKey="lme3m"
              name="LME 3M"
              stroke={getLineColor('lme3m')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          {(selectedIndices.includes('MCX_ALL') || selectedIndices.includes('MCX_MAR')) && (
            <Line
              yAxisId="mcx"
              type="monotone"
              dataKey="mcxMar"
              name="MCX Mar"
              stroke={getLineColor('mcxMar')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          {(selectedIndices.includes('MCX_ALL') || selectedIndices.includes('MCX_APR')) && (
            <Line
              yAxisId="mcx"
              type="monotone"
              dataKey="mcxApr"
              name="MCX Apr"
              stroke={getLineColor('mcxApr')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          {(selectedIndices.includes('MCX_ALL') || selectedIndices.includes('MCX_MAY')) && (
            <Line
              yAxisId="mcx"
              type="monotone"
              dataKey="mcxMay"
              name="MCX May"
              stroke={getLineColor('mcxMay')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      );
    } else {
      return (
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="time"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="lme"
            orientation="left"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value}`}
            stroke="#3B82F6"
            tick={{ fill: '#3B82F6', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="mcx"
            orientation="right"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `₹${value}`}
            stroke="#10B981"
            tick={{ fill: '#10B981', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {selectedIndices.includes('LME_CSP') && (
            <Bar
              yAxisId="lme"
              dataKey="lmeCspOhlc"
              name="LME CSP"
              shape={(props: unknown) => {
                const typedProps = props as BarShapeProps;
                const scale = typedProps.yAxis.scale;
                return <CandleStick {...typedProps} yAxis={{ scale }} />;
              }}
              fill={getLineColor('lmeCsp')}
            />
          )}
          {selectedIndices.includes('LME_3M') && (
            <Bar
              yAxisId="lme"
              dataKey="lme3mOhlc"
              name="LME 3M"
              shape={(props: unknown) => {
                const typedProps = props as BarShapeProps;
                const scale = typedProps.yAxis.scale;
                return <CandleStick {...typedProps} yAxis={{ scale }} />;
              }}
              fill={getLineColor('lme3m')}
            />
          )}
          {(selectedIndices.includes('MCX_ALL') || selectedIndices.includes('MCX_MAR')) && (
            <Bar
              yAxisId="mcx"
              dataKey="mcxMarOhlc"
              name="MCX Mar"
              shape={(props: unknown) => {
                const typedProps = props as BarShapeProps;
                const scale = typedProps.yAxis.scale;
                return <CandleStick {...typedProps} yAxis={{ scale }} />;
              }}
              fill={getLineColor('mcxMar')}
            />
          )}
          {(selectedIndices.includes('MCX_ALL') || selectedIndices.includes('MCX_APR')) && (
            <Bar
              yAxisId="mcx"
              dataKey="mcxAprOhlc"
              name="MCX Apr"
              shape={(props: unknown) => {
                const typedProps = props as BarShapeProps;
                const scale = typedProps.yAxis.scale;
                return <CandleStick {...typedProps} yAxis={{ scale }} />;
              }}
              fill={getLineColor('mcxApr')}
            />
          )}
          {(selectedIndices.includes('MCX_ALL') || selectedIndices.includes('MCX_MAY')) && (
            <Bar
              yAxisId="mcx"
              dataKey="mcxMayOhlc"
              name="MCX May"
              shape={(props: unknown) => {
                const typedProps = props as BarShapeProps;
                const scale = typedProps.yAxis.scale;
                return <CandleStick {...typedProps} yAxis={{ scale }} />;
              }}
              fill={getLineColor('mcxMay')}
            />
          )}
        </ComposedChart>
      );
    }
  };

  return (
    <div className="max-w-[1366px] mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setViewType('line')}
              className={`px-4 py-2 text-sm font-medium ${
                viewType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Line View
            </button>
            <button
              onClick={() => setViewType('candle')}
              className={`px-4 py-2 text-sm font-medium ${
                viewType === 'candle'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Candle View
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleIndexChange('LME_CSP')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('LME_CSP')
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              LME CSP
            </button>
            <button
              onClick={() => handleIndexChange('LME_3M')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('LME_3M')
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              LME 3-Month
            </button>
            <button
              onClick={() => handleIndexChange('MCX_MAR')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('MCX_MAR')
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MCX March
            </button>
            <button
              onClick={() => handleIndexChange('MCX_APR')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('MCX_APR')
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MCX April
            </button>
            <button
              onClick={() => handleIndexChange('MCX_MAY')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('MCX_MAY')
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MCX May
            </button>
            <button
              onClick={() => handleIndexChange('MCX_ALL')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedIndices.includes('MCX_ALL')
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MCX All
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}