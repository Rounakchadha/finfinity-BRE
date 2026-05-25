'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { formatInrShort } from '@/lib/mock-bureau';

interface WealthDataPoint {
  year: number;
  debt: number;
  savings: number;
  investments: number;
}

interface WealthChartProps {
  data: WealthDataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-card">
      <p className="text-xs text-muted mb-2 font-medium">Year {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted capitalize">{entry.name}:</span>
          <span className="font-semibold text-text">{formatInrShort(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function WealthChart({ data, height = 280 }: WealthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="25%"
        barGap={2}
      >
        <CartesianGrid vertical={false} stroke="rgba(30,61,52,0.6)" strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#7ab3a8', fontSize: 11 }}
          tickFormatter={(v) => `Y${v}`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#7ab3a8', fontSize: 11 }}
          tickFormatter={(v) => formatInrShort(v).replace('₹', '')}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,240,192,0.04)' }} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#7ab3a8', paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="debt" name="Remaining Debt" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={`debt-${index}`}
              fill={`rgba(248,113,113,${0.7 - index * 0.04})`}
            />
          ))}
        </Bar>
        <Bar dataKey="savings" name="Liquid Savings" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={`sav-${index}`}
              fill={`rgba(47,171,142,${0.5 + index * 0.04})`}
            />
          ))}
        </Bar>
        <Bar dataKey="investments" name="Investment Corpus" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={`inv-${index}`}
              fill={`rgba(37,240,192,${0.4 + index * 0.05})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Wealth data generator ────────────────────────────────────────────────────

export function generateWealthData(
  monthlyFreed: number,
  totalDebt: number,
  sipAmount: number
): WealthDataPoint[] {
  const years = [1, 2, 3, 5, 7, 10, 12, 15];
  const annualReturn = 0.12; // 12% XIRR on investments
  const debtReductionRate = 0.15; // 15% annual debt reduction

  return years.map((year) => {
    const debt = Math.max(0, totalDebt * Math.pow(1 - debtReductionRate, year));
    // SIP corpus with compounding
    const months = year * 12;
    const monthlyRate = annualReturn / 12;
    const investments =
      sipAmount > 0
        ? sipAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
        : 0;
    const savings = monthlyFreed * months * 0.3; // 30% goes to liquid savings

    return {
      year,
      debt: Math.round(debt),
      savings: Math.round(savings),
      investments: Math.round(investments),
    };
  });
}
