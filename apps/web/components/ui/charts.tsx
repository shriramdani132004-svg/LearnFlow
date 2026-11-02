'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #E8EAF5',
  boxShadow: '0 12px 32px -18px rgba(23,37,84,0.35)',
  fontSize: 12,
};

export function TrendAreaChart({
  data,
  height = 240,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height }} className="rounded-xl bg-slate-50" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="lfTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B5FEF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5B5FEF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="#EEF1F8" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value}%`, 'Score']}
            labelStyle={{ color: '#172554', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5B5FEF"
            strokeWidth={2.5}
            fill="url(#lfTrend)"
            dot={{ r: 3, fill: '#fff', stroke: '#5B5FEF', strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const BAR_COLORS = ['#5B5FEF', '#8B5CF6', '#0EA5E9', '#0D9488', '#F59E0B', '#F97373'];

export function TopicBarChart({
  data,
  height = 240,
  unit = '%',
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  unit?: string;
}) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height }} className="rounded-xl bg-slate-50" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="#EEF1F8" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#475569' }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value}${unit}`, 'Accuracy']}
            cursor={{ fill: '#F7F8FD' }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({
  data,
  height = 220,
}: {
  data: Array<{ range: string; count: number }>;
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height }} className="rounded-xl bg-slate-50" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="#EEF1F8" vertical={false} />
          <XAxis
            dataKey="range"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94A3B8' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8FD' }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#8B5CF6" barSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
