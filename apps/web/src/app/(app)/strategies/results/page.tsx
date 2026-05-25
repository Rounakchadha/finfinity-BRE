'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingDown, Wallet, PiggyBank, BarChart3, ChevronLeft,
  CheckCircle2, Circle, ArrowRight, Trophy, Star, Target, Calendar,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatInrShort, calcEmiRatio, calcMonthlyEmi } from '@/lib/mock-bureau';
import { Header } from '@/components/layout/Header';
import { WealthChart, generateWealthData } from '@/components/charts/WealthChart';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';

const INVESTMENT_OPTIONS = [
  {
    name: 'Equity Mutual Fund',
    icon: '📈',
    expectedReturn: 12,
    risk: 'Moderate-High',
    color: 'text-green',
    minSip: 500,
    description: 'Diversified equity funds for long-term wealth creation. ELSS also saves ₹46,800 in taxes.',
  },
  {
    name: 'NPS (Tier 1)',
    icon: '🏛️',
    expectedReturn: 10,
    risk: 'Low-Moderate',
    color: 'text-blue',
    minSip: 500,
    description: 'National Pension System. Additional ₹50K tax deduction under 80CCD(1B). Ideal for retirement.',
  },
  {
    name: 'PPF',
    icon: '🔒',
    expectedReturn: 7.1,
    risk: 'Zero',
    color: 'text-teal',
    minSip: 500,
    description: 'Public Provident Fund. Government-backed, tax-free returns. 15-year lock-in.',
  },
  {
    name: 'REITs / InvITs',
    icon: '🏢',
    expectedReturn: 9,
    risk: 'Low-Moderate',
    color: 'text-purple',
    minSip: 200,
    description: 'Real Estate Investment Trusts. Regular dividend income + capital appreciation.',
  },
];

const CLOSURE_PRIORITY_REASONS: Record<string, string> = {
  'Credit Card': 'Highest rate (36%+). Closure improves CIBIL utilization immediately.',
  'Personal Loan': 'Unsecured, high rate. Frees up income faster than secured loans.',
  'Consumer Durable': 'Short-tenure, high effective rate. Quick win.',
  'Business Loan': 'High rate and unsecured. Reduces DTI ratio significantly.',
  'Auto Loan': 'Depreciating asset. Closure reduces liability faster than asset value drops.',
  'Education Loan': 'Tax deductible (80E). Closure depends on income vs tax benefit calculus.',
  'Home Loan': 'Lowest rate + tax deduction. Keep last — focus on wealth creation instead.',
};

export default function ResultsPage() {
  const router = useRouter();
  const { auth, bureau, profile, strategies, selectedStrategyIds } = useAppStore();
  const [selectedInvestment, setSelectedInvestment] = useState('Equity Mutual Fund');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
    if (selectedStrategyIds.length === 0) router.replace('/strategies');
  }, [auth.isAuthenticated, selectedStrategyIds.length, router]);

  const selectedStrategies = strategies.filter((s) => selectedStrategyIds.includes(s.id));

  const totalEmiFreed = selectedStrategies.reduce((s, st) => s + st.monthlyEmiFreed, 0);
  const totalInterestSaved = selectedStrategies.reduce((s, st) => s + st.totalInterestSaved, 0);
  const totalLumpSum = selectedStrategies.reduce((s, st) => s + st.lumpSumAvailable, 0);

  const currentEmi = calcMonthlyEmi(bureau.loans);
  const newEmi = Math.max(0, currentEmi - totalEmiFreed);
  const newEmiRatio = calcEmiRatio(
    [{ id: 0, lender: '', accountType: '', accountNumber: '', sanctionAmount: 0, outstanding: 0, emi: newEmi, rate: 0, dpd: 0, closureMonths: 0 }],
    profile.income
  );

  const sipAmount = Math.round(totalEmiFreed * 0.6);
  const totalDebt = bureau.loans.reduce((s, l) => s + l.outstanding, 0);
  const wealthData = generateWealthData(totalEmiFreed, totalDebt, sipAmount);

  const selectedInvestmentObj = INVESTMENT_OPTIONS.find((i) => i.name === selectedInvestment)!;
  const monthlyRate = selectedInvestmentObj.expectedReturn / 100 / 12;
  const months15 = 180;
  const corpus15 = sipAmount > 0
    ? Math.round(sipAmount * ((Math.pow(1 + monthlyRate, months15) - 1) / monthlyRate) * (1 + monthlyRate))
    : 0;

  // Loan closure priority (by rate desc, skip home loans)
  const closurePriority = useMemo(
    () => [...bureau.loans].sort((a, b) => {
      if (a.accountType === 'Home Loan') return 1;
      if (b.accountType === 'Home Loan') return -1;
      return b.rate - a.rate;
    }),
    [bureau.loans]
  );

  const milestones = [
    { year: '6 months', label: 'Complete BT applications, strategies executed', icon: Target },
    { year: '1 year', label: `First SIP corpus milestone: ${formatInrShort(sipAmount * 12 * 1.06)}`, icon: Star },
    { year: '3 years', label: `${closurePriority[0]?.lender || 'High-rate'} loan closed completely`, icon: Trophy },
    { year: '5 years', label: `Investment corpus: ${formatInrShort(corpus15 / 3)}`, icon: BarChart3 },
    { year: '10 years', label: 'Debt-free except home loan. Full wealth mode.', icon: CheckCircle2 },
    { year: '15 years', label: `Corpus: ${formatInrShort(corpus15)} — retirement secured`, icon: Trophy },
  ];

  const actionItems = [
    `Apply for BT on ${selectedStrategies.find((s) => s.tag === 'BT')?.fromLoan?.lender || 'high-rate'} loan immediately`,
    'Collect NOC / foreclosure letter from existing lender',
    'Submit BT application to new lender with salary slips (last 3 months)',
    'Set up auto-debit for new lower EMI',
    `Start ₹${sipAmount.toLocaleString('en-IN')} SIP in ${selectedInvestment}`,
    'Review and update CIBIL report after 45 days',
    'Schedule quarterly financial review with Finfinity AI',
  ];

  const toggleCheck = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <Badge variant="mint" dot className="mb-3">
            {selectedStrategies.length} strategies selected
          </Badge>
          <h1 className="text-3xl font-black text-white mb-2">Your Wealth Plan</h1>
          <p className="text-muted text-sm">
            Here's exactly what happens when you execute your selected strategies
          </p>
        </motion.div>

        {/* Big numbers hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {[
            {
              label: 'Monthly EMI Freed',
              value: formatInrShort(totalEmiFreed),
              sub: 'every month, forever',
              color: 'text-green',
              icon: TrendingDown,
              bg: 'border-green/20 bg-green/5',
            },
            {
              label: 'Total Interest Saved',
              value: formatInrShort(totalInterestSaved),
              sub: 'over loan lifetime',
              color: 'text-mint',
              icon: Wallet,
              bg: 'border-mint/20 bg-mint/5',
            },
            {
              label: 'New EMI Ratio',
              value: `${Math.round(profile.income > 0 ? (newEmi / profile.income) * 100 : 0)}%`,
              sub: `Down from ${calcEmiRatio(bureau.loans, profile.income)}%`,
              color: 'text-blue',
              icon: BarChart3,
              bg: 'border-blue/20 bg-blue/5',
            },
            {
              label: 'Investible Monthly',
              value: formatInrShort(sipAmount),
              sub: 'freed up for wealth building',
              color: 'text-purple',
              icon: PiggyBank,
              bg: 'border-purple/20 bg-purple/5',
            },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className={`rounded-2xl border p-4 ${m.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted uppercase tracking-wider">{m.label}</span>
                <m.icon className={clsx('w-4 h-4', m.color)} />
              </div>
              <div className={clsx('text-2xl font-black', m.color)}>{m.value}</div>
              <div className="text-xs text-muted mt-1">{m.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Wealth projection chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border p-6"
          style={{ background: 'rgba(12, 31, 26, 0.7)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white text-lg">15-Year Wealth Projection</h2>
              <p className="text-xs text-muted">
                Assuming {sipAmount.toLocaleString('en-IN')}/mo SIP in {selectedInvestment} @{selectedInvestmentObj.expectedReturn}% XIRR
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-mint">{formatInrShort(corpus15)}</div>
              <div className="text-xs text-muted">Projected corpus at 15Y</div>
            </div>
          </div>
          <WealthChart data={wealthData} height={260} />
        </motion.div>

        {/* Selected strategies summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border overflow-hidden"
          style={{ background: 'rgba(12, 31, 26, 0.7)' }}
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold text-white">Selected Strategies</h2>
          </div>
          <div className="divide-y divide-border">
            {selectedStrategies.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-mint flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text truncate">{s.title}</div>
                  <div className="text-xs text-muted">{s.tag} · Net saving {formatInrShort(s.netSaving)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-green">{formatInrShort(s.monthlyEmiFreed)}/mo</div>
                  <div className="text-xs text-muted">EMI freed</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Investment options */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-bold text-white mb-4">
            Where to invest your ₹{sipAmount.toLocaleString('en-IN')}/month?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INVESTMENT_OPTIONS.map((opt) => {
              const isSelected = selectedInvestment === opt.name;
              const r = opt.expectedReturn / 100 / 12;
              const corpus = sipAmount > 0
                ? Math.round(sipAmount * ((Math.pow(1 + r, months15) - 1) / r) * (1 + r))
                : 0;

              return (
                <button
                  key={opt.name}
                  onClick={() => setSelectedInvestment(opt.name)}
                  className={clsx(
                    'rounded-2xl border p-4 text-left transition-all',
                    isSelected
                      ? 'border-mint/50 bg-mint/5 shadow-mint-glow'
                      : 'border-border bg-card hover:border-mint/20'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <div className="font-semibold text-text text-sm">{opt.name}</div>
                        <div className="text-xs text-muted">{opt.expectedReturn}% expected · {opt.risk} risk</div>
                      </div>
                    </div>
                    <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center', isSelected ? 'border-mint bg-mint' : 'border-border')}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-3 leading-relaxed">{opt.description}</p>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-[10px] text-muted">15Y Corpus</div>
                      <div className={clsx('text-base font-bold', opt.color)}>{formatInrShort(corpus)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted">Min SIP</div>
                      <div className="text-sm font-medium text-text">₹{opt.minSip}/mo</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Loan closure priority */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border overflow-hidden"
          style={{ background: 'rgba(12, 31, 26, 0.7)' }}
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold text-white">Loan Closure Priority</h2>
            <p className="text-xs text-muted mt-0.5">Pay off in this order for maximum financial benefit</p>
          </div>
          <div className="divide-y divide-border">
            {closurePriority.map((loan, i) => (
              <div key={loan.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-faint flex items-center justify-center text-xs font-bold text-muted flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text">{loan.lender}</div>
                  <div className="text-xs text-muted leading-relaxed">
                    {CLOSURE_PRIORITY_REASONS[loan.accountType] || 'Reduce total debt burden'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-amber">{loan.rate}%</div>
                  <div className="text-xs text-muted">{formatInrShort(loan.outstanding)}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Wealth milestones */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-mint" />
            Wealth Milestones
          </h2>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.07 }}
                  className="flex items-start gap-4 relative"
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 relative z-10"
                    style={{
                      background: i === milestones.length - 1 ? 'rgba(37,240,192,0.15)' : '#0c1f1a',
                      borderColor: i === milestones.length - 1 ? '#25F0C0' : '#1e3d34',
                    }}
                  >
                    <m.icon className="w-4 h-4 text-mint" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="text-xs font-bold text-mint mb-0.5">{m.year}</div>
                    <div className="text-sm text-text">{m.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Action checklist */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-border p-6"
          style={{ background: 'rgba(12, 31, 26, 0.7)' }}
        >
          <h2 className="font-bold text-white mb-4">Action Checklist</h2>
          <div className="space-y-2.5">
            {actionItems.map((item, i) => (
              <button
                key={item}
                onClick={() => toggleCheck(item)}
                className="w-full flex items-start gap-3 text-left group"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {checklist[item] ? (
                    <CheckCircle2 className="w-5 h-5 text-mint" />
                  ) : (
                    <Circle className="w-5 h-5 text-border group-hover:text-muted transition-colors" />
                  )}
                </div>
                <span
                  className={clsx(
                    'text-sm transition-colors',
                    checklist[item] ? 'line-through text-muted' : 'text-text group-hover:text-mint'
                  )}
                >
                  {item}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted">
            {Object.values(checklist).filter(Boolean).length}/{actionItems.length} completed
          </div>
        </motion.div>

        {/* Bottom navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3 justify-between"
        >
          <Button variant="ghost" onClick={() => router.push('/strategies')}>
            <ChevronLeft className="w-4 h-4" />
            Modify Strategies
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/products')}>
              Explore Products
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              Export Plan
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
