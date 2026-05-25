'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatInrShort } from '@/lib/mock-bureau';

export interface WealthDataPoint {
  year: number;
  remainingDebt: number;
  investmentCorpus: number;
  label: string;
}

// ─── Correct remaining loan balance formula ───────────────────────────────────
// Standard reducing-balance formula: B(n) = P(1+r)^n - EMI × ((1+r)^n - 1) / r
function remainingBalance(outstanding: number, ratePercent: number, monthsRemaining: number, afterMonths: number): number {
  if (afterMonths >= monthsRemaining || outstanding <= 0) return 0;
  const r = ratePercent / 100 / 12;
  if (r === 0) return Math.max(0, outstanding - (outstanding / monthsRemaining) * afterMonths);
  const emiPayment = outstanding * r * Math.pow(1 + r, monthsRemaining) / (Math.pow(1 + r, monthsRemaining) - 1);
  const n = afterMonths;
  return Math.max(0, outstanding * Math.pow(1 + r, n) - emiPayment * (Math.pow(1 + r, n) - 1) / r);
}

// ─── Correct SIP future value formula ────────────────────────────────────────
// FV = P × ((1+r)^n - 1) / r × (1+r)  where r = annual% / 12, n = months
function sipFV(monthly: number, annualRatePct: number, years: number): number {
  if (monthly <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r));
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
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="text-muted font-semibold mb-2">Year {label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-muted">{e.name}:</span>
          <span className="font-bold text-text">{formatInrShort(e.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function WealthChart({ data, height = 260 }: WealthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f87171" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#25F0C0" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#25F0C0" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(30,61,52,0.5)" strokeDasharray="3 3" />
        <XAxis dataKey="year" tickLine={false} axisLine={false}
          tick={{ fill: '#7ab3a8', fontSize: 11 }} tickFormatter={v => `Y${v}`} />
        <YAxis tickLine={false} axisLine={false} width={48}
          tick={{ fill: '#7ab3a8', fontSize: 11 }}
          tickFormatter={v => formatInrShort(v).replace('₹', '')} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7ab3a8', paddingTop: 10 }} iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="remainingDebt" name="Remaining Debt"
          stroke="#f87171" strokeWidth={2} fill="url(#debtGrad)" />
        <Area type="monotone" dataKey="investmentCorpus" name="Investment Corpus"
          stroke="#25F0C0" strokeWidth={2} fill="url(#corpusGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECT wealth data generator
// Uses actual loan data for debt reduction, correct SIP formula for corpus
// ─────────────────────────────────────────────────────────────────────────────
export interface LoanForChart {
  outstanding: number;
  rate: number;
  closureMonths: number;
}

export function generateWealthData(
  monthlySip: number,
  loans: LoanForChart[],
  investReturnPct: number,
): WealthDataPoint[] {
  const checkpoints = [1, 2, 3, 5, 7, 10, 12, 15];

  return checkpoints.map(year => {
    const afterMonths = year * 12;

    // Correct remaining debt: sum of actual remaining balance on each loan
    const remainingDebt = loans.reduce((sum, loan) => {
      return sum + remainingBalance(loan.outstanding, loan.rate, loan.closureMonths, afterMonths);
    }, 0);

    // Correct SIP corpus: standard FV formula
    const investmentCorpus = sipFV(monthlySip, investReturnPct, year);

    return {
      year,
      remainingDebt: Math.round(remainingDebt),
      investmentCorpus,
      label: `Year ${year}`,
    };
  });
}

// Export the SIP FV function for use in results page
export { sipFV };
