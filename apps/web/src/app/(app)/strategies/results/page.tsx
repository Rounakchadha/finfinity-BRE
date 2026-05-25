'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingDown, Wallet, PiggyBank, BarChart3, ChevronLeft,
  CheckCircle2, Circle, ArrowRight, Trophy, Info,
  AlertTriangle, Target, Star, Calendar,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatInrShort, calcEmiRatio } from '@/lib/mock-bureau';
import { Header } from '@/components/layout/Header';
import { WealthChart, generateWealthData, sipFV } from '@/components/charts/WealthChart';
import { Button } from '@/components/ui/Button';

// ─── Investment options (returns are historical CAGR ranges — not guaranteed) ─
const INVESTMENT_OPTIONS = [
  { name: 'Equity Mutual Fund (Index)', icon: '📈', returnPct: 12, riskLabel: 'Moderate-High', note: 'Based on Nifty 50 historical CAGR. Past returns do not guarantee future performance.', taxNote: 'LTCG 10% above ₹1.25L/yr (Budget 2024)' },
  { name: 'NPS Tier 1 (Equity 75%)', icon: '🏛️', returnPct: 10, riskLabel: 'Moderate', note: 'Based on NPS historical equity fund returns. Subject to market risk.', taxNote: '80CCD(1B): ₹50K extra deduction' },
  { name: 'PPF', icon: '🔒', returnPct: 7.1, riskLabel: 'Zero Risk', note: 'Current rate 7.1% p.a. (revised quarterly by Govt). 15-year lock-in.', taxNote: 'Fully tax-free (EEE)' },
  { name: 'Debt Mutual Fund', icon: '🏦', returnPct: 7.5, riskLabel: 'Low', note: 'Indicative. Actual returns depend on fund category and duration.', taxNote: 'Taxed as per income slab' },
];

// ─── Correct SIP future value (verified formula) ─────────────────────────────
// FV = P × ((1+r)^n – 1) / r × (1+r), where r = rate/12, n = months
// This is the standard annuity-due formula used by all financial calculators

// ─── Loan closure priority ───────────────────────────────────────────────────
const CLOSURE_REASONS: Record<string, string> = {
  'Credit Card': 'Closes revolving high-rate debt — improves CIBIL utilization immediately.',
  'Personal Loan': 'High-rate unsecured debt — frees up the most income per rupee closed.',
  'Consumer Durable': 'Short tenure, high effective rate. Quick win.',
  'Business Loan': 'High rate, reduces DTI. Deductible as business expense.',
  'Auto Loan': 'Asset depreciates — close before it becomes a liability.',
  'Education Loan': 'Section 80E deductible. Close after 8-year deduction window expires.',
  'Home Loan': 'Lowest rate + 80C/24(b) deduction. Maintain for tax benefits; focus on wealth instead.',
  'LAP': 'Secured at low rate. Only close if surplus exists after other loans.',
};

export default function ResultsPage() {
  const router = useRouter();
  const { auth, bureau, profile, strategies, selectedStrategyIds } = useAppStore();
  const [selectedInvestment, setSelectedInvestment] = useState(0); // index into INVESTMENT_OPTIONS
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
    if (selectedStrategyIds.length === 0) router.replace('/strategies');
  }, [auth.isAuthenticated, selectedStrategyIds.length, router]);

  const selectedStrats = strategies.filter(s => selectedStrategyIds.includes(s.id));

  // ── Correct aggregation ───────────────────────────────────────────────────
  // Exclude warning strategies (monthlyEmiFreed=0 anyway after fix) from totals
  const actionStrats = selectedStrats.filter(s => !s.title.startsWith('⚠️'));

  // Monthly EMI freed = sum of actual EMI reduction from selected strategies
  const totalEmiFreed = actionStrats.reduce((s, st) => s + (st.monthlyEmiFreed || 0), 0);

  // Total interest saved = sum of net savings (after transfer costs) — not double-counted
  // We use netSaving (which deducts PF+FC) where available, else totalInterestSaved
  const totalNetSaved = actionStrats.reduce((s, st) => s + (st.netSaving ?? st.totalInterestSaved ?? 0), 0);

  // Lump sum available (from top-up / LAP)
  const totalLumpAvail = actionStrats.reduce((s, st) => s + (st.lumpSumAvailable || 0), 0);

  // New EMI after strategies
  const currentTotalEmi = bureau.loans.reduce((s, l) => s + l.emi, 0);
  const newTotalEmi = Math.max(0, currentTotalEmi - totalEmiFreed);
  const newEmiRatioPct = profile.income > 0 ? Math.round((newTotalEmi / profile.income) * 100) : 0;
  const oldEmiRatioPct = profile.income > 0 ? Math.round((currentTotalEmi / profile.income) * 100) : 0;

  // ── Wealth projection (correct formulas) ─────────────────────────────────
  const inv = INVESTMENT_OPTIONS[selectedInvestment];

  // Monthly investible = freed EMI (conservative — user may not invest all of it)
  // We show the freed EMI amount as the SIP but label it clearly as an assumption
  const monthlySip = totalEmiFreed;

  // Corpus at 15 years using correct SIP FV formula
  const corpus15yr = useMemo(
    () => sipFV(monthlySip, inv.returnPct, 15),
    [monthlySip, inv.returnPct],
  );

  // Also show corpus at 5yr and 10yr
  const corpus5yr  = useMemo(() => sipFV(monthlySip, inv.returnPct, 5), [monthlySip, inv.returnPct]);
  const corpus10yr = useMemo(() => sipFV(monthlySip, inv.returnPct, 10), [monthlySip, inv.returnPct]);

  // Chart data — uses actual loan balances for debt, correct SIP formula for corpus
  const wealthData = useMemo(() => generateWealthData(
    monthlySip,
    bureau.loans.map(l => ({ outstanding: l.outstanding, rate: l.rate, closureMonths: l.closureMonths })),
    inv.returnPct,
  ), [monthlySip, bureau.loans, inv.returnPct]);

  // Closure priority
  const closurePriority = useMemo(() =>
    [...bureau.loans]
      .filter(l => l.outstanding > 0)
      .sort((a, b) => {
        if (a.accountType === 'Home Loan' || a.accountType === 'LAP') return 1;
        if (b.accountType === 'Home Loan' || b.accountType === 'LAP') return -1;
        return b.rate - a.rate;
      }),
    [bureau.loans],
  );

  const actionItems = useMemo(() => {
    const items: string[] = [];
    actionStrats.forEach(s => {
      if (s.tag === 'BT' && s.fromLoan)
        items.push(`Apply BT: ${s.fromLoan.lender} → ${s.toLoan?.lender ?? 'new lender'}. Collect NOC + foreclosure letter first.`);
      if (s.tag === 'TOPUP')
        items.push(`Apply for top-up at ${s.toLoan?.lender ?? 'your bank'}. Keep LTV documents ready.`);
      if (s.tag === 'CONSOLIDATE')
        items.push(`Apply for consolidation loan at ${s.toLoan?.lender ?? 'chosen lender'}. Carry all loan statements.`);
      if (s.tag === 'LAP')
        items.push(`Initiate LAP application. Property valuation + clear title documents required.`);
    });
    if (monthlySip > 0) items.push(`Start ₹${formatInrShort(monthlySip)}/month SIP in ${inv.name} immediately after EMI reduction.`);
    items.push('Set up auto-debit for new lower EMI to avoid missed payments.');
    items.push('Review your CIBIL report 45 days after execution to track score improvement.');
    return items;
  }, [actionStrats, monthlySip, inv.name]);

  return (
    <div className="min-h-screen bg-black pb-16">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/strategies')} className="text-muted hover:text-text transition-colors p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Your Savings Plan</h1>
            <p className="text-xs text-muted">{actionStrats.length} strategies selected · {bureau.loans.length} loans analysed</p>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber/90 leading-relaxed">
            <strong>Indicative projections only.</strong> All savings estimates assume eligibility approval, indicative market rates (not guaranteed by any lender), and that freed EMI is invested consistently. Investment returns shown are historical averages — not a promise of future performance. Consult your Finfinity advisor before acting.
          </div>
        </div>

        {/* Big 4 numbers */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Monthly EMI Freed', value: formatInrShort(totalEmiFreed), sub: 'per month, every month', color: 'text-green', border: 'border-green/20', bg: 'bg-green/5', icon: TrendingDown },
            { label: 'Net Interest Saved', value: formatInrShort(totalNetSaved), sub: 'over loan lifetimes (after transfer costs)', color: 'text-mint', border: 'border-mint/20', bg: 'bg-mint/5', icon: Wallet },
            { label: 'EMI Ratio (After)', value: profile.income > 0 ? `${newEmiRatioPct}%` : '—', sub: `Was ${oldEmiRatioPct}% of income`, color: newEmiRatioPct > 50 ? 'text-amber' : 'text-blue', border: 'border-blue/20', bg: 'bg-blue/5', icon: BarChart3 },
            { label: 'Lump-sum Available', value: totalLumpAvail > 0 ? formatInrShort(totalLumpAvail) : '—', sub: 'via top-up / LAP (if applicable)', color: 'text-purple', border: 'border-purple/20', bg: 'bg-purple/5', icon: PiggyBank },
          ].map(m => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border ${m.border} ${m.bg} p-4`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">{m.label}</span>
                <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              </div>
              <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
              <div className="text-[10px] text-muted mt-0.5 leading-tight">{m.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Wealth projection */}
        <div className="rounded-2xl border border-border p-5" style={{ background: 'rgba(12,31,26,0.8)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-white text-base">Wealth Projection</h2>
              <p className="text-[11px] text-muted mt-0.5">
                If you invest {formatInrShort(monthlySip)}/month (freed EMI) in {inv.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-mint">{formatInrShort(corpus15yr)}</div>
              <div className="text-[10px] text-muted">at 15 years *</div>
            </div>
          </div>

          {/* Investment selector */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {INVESTMENT_OPTIONS.map((opt, i) => (
              <button key={i} onClick={() => setSelectedInvestment(i)}
                className={[
                  'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all',
                  selectedInvestment === i
                    ? 'bg-mint text-black border-mint'
                    : 'border-border text-muted hover:border-mint/30',
                ].join(' ')}>
                {opt.icon} {opt.returnPct}% {opt.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <WealthChart data={wealthData} height={220} />

          {/* Milestones */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: '5 Years', value: corpus5yr, icon: '🌱' },
              { label: '10 Years', value: corpus10yr, icon: '🌳' },
              { label: '15 Years', value: corpus15yr, icon: '🏆' },
            ].map(m => (
              <div key={m.label} className="bg-faint rounded-xl p-2.5 text-center">
                <div className="text-base mb-0.5">{m.icon}</div>
                <div className="text-xs font-black text-mint">{formatInrShort(m.value)}</div>
                <div className="text-[10px] text-muted">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-2 leading-relaxed">
            * Assumes ₹{formatInrShort(monthlySip)}/month SIP at {inv.returnPct}% CAGR. {inv.note} | {inv.taxNote}
          </p>
        </div>

        {/* Selected strategies */}
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'rgba(12,31,26,0.8)' }}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">Selected Strategies</h2>
            <span className="text-xs text-mint">{actionStrats.length} selected</span>
          </div>
          {actionStrats.map(s => (
            <div key={s.id} className="px-4 py-3 border-b border-border/50 last:border-0 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-mint flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text leading-snug">{s.title}</div>
                <div className="text-xs text-muted mt-0.5">
                  {s.fromLoan && s.toLoan ? `${s.fromLoan.lender} @${s.fromLoan.rate}% → ${s.toLoan.lender} @${s.toLoan.rate}%` : s.tag}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {s.monthlyEmiFreed > 0 && <div className="text-xs font-bold text-green">{formatInrShort(s.monthlyEmiFreed)}/mo</div>}
                {(s.netSaving ?? s.totalInterestSaved) > 0 && (
                  <div className="text-[10px] text-muted">{formatInrShort(s.netSaving ?? s.totalInterestSaved)} net saved</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Loan closure priority */}
        {closurePriority.length > 0 && (
          <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'rgba(12,31,26,0.8)' }}>
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-bold text-white text-sm">Loan Closure Priority</h2>
              <p className="text-[11px] text-muted mt-0.5">Pay off in this order to minimise total interest cost</p>
            </div>
            {closurePriority.map((loan, i) => {
              const isHL = loan.accountType === 'Home Loan' || loan.accountType === 'LAP';
              const icons: Record<string, string> = { 'Home Loan': '🏠', 'Personal Loan': '💼', 'Credit Card': '💳', 'Auto Loan': '🚗', 'Business Loan': '🏢', 'Education Loan': '🎓', 'LAP': '🏛️' };
              return (
                <div key={loan.id} className="px-4 py-2.5 border-b border-border/50 last:border-0 flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-red/20 text-red' : i === 1 ? 'bg-amber/20 text-amber' : 'bg-border text-muted'}`}>
                    {i + 1}
                  </div>
                  <span className="text-base flex-shrink-0">{icons[loan.accountType] ?? '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text">{loan.lender} <span className="text-muted font-normal">({loan.accountType})</span></div>
                    <div className="text-[10px] text-muted leading-snug">{CLOSURE_REASONS[loan.accountType] ?? 'Close based on rate and tenure.'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${isHL ? 'text-green' : 'text-amber'}`}>{loan.rate}%</div>
                    <div className="text-[10px] text-muted">{formatInrShort(loan.outstanding)} left</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action checklist */}
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'rgba(12,31,26,0.8)' }}>
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-bold text-white text-sm">Your Action Checklist</h2>
            <p className="text-[11px] text-muted mt-0.5">Execute in order — check off as you go</p>
          </div>
          {actionItems.map((item, i) => (
            <div key={i}
              className="px-4 py-2.5 border-b border-border/50 last:border-0 flex items-start gap-3 cursor-pointer group"
              onClick={() => setChecklist(p => ({ ...p, [item]: !p[item] }))}>
              {checklist[item]
                ? <CheckCircle2 className="w-4 h-4 text-mint flex-shrink-0 mt-0.5" />
                : <Circle className="w-4 h-4 text-border flex-shrink-0 mt-0.5 group-hover:text-muted transition-colors" />}
              <span className={`text-sm leading-snug ${checklist[item] ? 'text-muted line-through' : 'text-text'}`}>{item}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={() => router.push('/strategies')}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => router.push('/products')}>
            Apply Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
