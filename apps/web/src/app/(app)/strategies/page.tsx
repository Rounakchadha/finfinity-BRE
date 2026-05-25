'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, Sparkles, TrendingDown, Wallet, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, Strategy } from '@/store/useAppStore';
import { formatInrShort, calcWeightedAvgRate } from '@/lib/mock-bureau';
import { Header } from '@/components/layout/Header';
import { StrategyCard } from '@/components/strategy/StrategyCard';
import { Button } from '@/components/ui/Button';

// ─── Mock strategy generator ───────────────────────────────────────────────────

function generateStrategies(loans: ReturnType<typeof useAppStore.getState>['bureau']['loans'], cibilScore: number, income: number): Strategy[] {
  const strategies: Strategy[] = [];
  let id = 1;

  // Sort by rate desc
  const sorted = [...loans].sort((a, b) => b.rate - a.rate);

  for (const loan of sorted) {
    if (loan.rate > 16 && (loan.accountType === 'Personal Loan' || loan.accountType === 'Business Loan')) {
      const newRate = cibilScore >= 750 ? 12 : cibilScore >= 700 ? 14 : 16;
      if (newRate < loan.rate) {
        const oldEmi = loan.emi;
        const months = loan.closureMonths;
        const r = newRate / 100 / 12;
        const newEmi = Math.round((loan.outstanding * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
        const emiFreed = oldEmi - newEmi;
        const oldTotal = oldEmi * months;
        const newTotal = newEmi * months;
        const saved = oldTotal - newTotal;
        const pfCost = loan.outstanding * 0.01;
        const fcCost = loan.outstanding * 0.02;
        const netSaving = saved - pfCost - fcCost;

        const lenders = ['HDFC Bank', 'ICICI Bank', 'Bajaj Finserv', 'Tata Capital', 'Fullerton'].filter(
          (l) => l !== loan.lender
        );

        strategies.push({
          id: id++,
          tag: 'BT',
          title: `Transfer ${loan.lender} ${loan.accountType} to ${lenders[0]}`,
          reason: `At ${loan.rate}% p.a., you're overpaying significantly. ${lenders[0]} offers ${newRate}% for your CIBIL score — a ${(loan.rate - newRate).toFixed(1)}% saving.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: lenders[0], rate: newRate, amount: loan.outstanding },
          monthlyEmiFreed: Math.max(0, emiFreed),
          totalInterestSaved: Math.max(0, saved),
          lumpSumAvailable: 0,
          netSaving: Math.max(0, netSaving),
          conflictsWith: [],
          fees: { pf: 1, fc: 2 },
          eligibility: `Eligible based on CIBIL score ${cibilScore} and ${loan.closureMonths} months remaining tenure.`,
          recommendation: `This is the highest-impact strategy in your portfolio. The break-even (fees vs savings) is typically 3-4 months. We recommend executing this first.`,
          loanIds: [loan.id],
        });
      }
    }

    // Home loan BT
    if (loan.accountType === 'Home Loan' && loan.rate > 9.5) {
      const newRate = 8.65;
      const months = loan.closureMonths;
      const r = newRate / 100 / 12;
      const newEmi = Math.round((loan.outstanding * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
      const emiFreed = loan.emi - newEmi;
      const saved = (loan.emi - newEmi) * months;
      const pfCost = loan.outstanding * 0.005;
      const netSaving = saved - pfCost;

      strategies.push({
        id: id++,
        tag: 'BT',
        title: `Home Loan BT from ${loan.lender} to SBI @ 8.65%`,
        reason: `Your home loan at ${loan.rate}% can be transferred to SBI's current best rate of 8.65%. On ${formatInrShort(loan.outstanding)} outstanding, this saves significantly.`,
        fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
        toLoan: { lender: 'SBI', rate: 8.65, amount: loan.outstanding },
        monthlyEmiFreed: Math.max(0, emiFreed),
        totalInterestSaved: Math.max(0, saved),
        lumpSumAvailable: 0,
        netSaving: Math.max(0, netSaving),
        conflictsWith: [],
        fees: { pf: 0.5, fc: 0 },
        eligibility: `Home loan BT available for loans with ≥ 12 EMIs paid and clean repayment history.`,
        recommendation: `Home loan BTs have the lowest fees (typically 0.5% PF) and highest savings due to large principal. Recommended for long remaining tenure.`,
        loanIds: [loan.id],
      });
    }
  }

  // Top-up strategy (if home loan exists)
  const hl = loans.find((l) => l.accountType === 'Home Loan');
  if (hl && income > 0) {
    const maxTopup = Math.min(hl.sanctionAmount * 0.3, hl.outstanding * 0.5);
    const topupRate = 9.2;
    const topupMonths = 120;
    const r = topupRate / 100 / 12;
    const topupEmi = Math.round((maxTopup * r * Math.pow(1 + r, topupMonths)) / (Math.pow(1 + r, topupMonths) - 1));

    // Can this replace a high-rate PL?
    const highPl = loans.find((l) => l.accountType === 'Personal Loan' && l.rate > 18);
    if (highPl) {
      const emiFreed = highPl.emi - topupEmi;
      const saved = (highPl.emi * highPl.closureMonths) - (topupEmi * Math.min(topupMonths, highPl.closureMonths));

      strategies.push({
        id: id++,
        tag: 'TOPUP',
        title: `Top-up on ${hl.lender} HL to close ${highPl.lender} PL`,
        reason: `Use your home loan equity to foreclose the expensive ${highPl.lender} personal loan at ${highPl.rate}%. Top-up at 9.2% vs PL at ${highPl.rate}%.`,
        fromLoan: { lender: highPl.lender, rate: highPl.rate, outstanding: highPl.outstanding },
        toLoan: { lender: hl.lender, rate: topupRate, amount: Math.min(maxTopup, highPl.outstanding) },
        monthlyEmiFreed: Math.max(0, emiFreed),
        totalInterestSaved: Math.max(0, saved),
        lumpSumAvailable: Math.max(0, maxTopup - highPl.outstanding),
        netSaving: Math.max(0, saved * 0.85),
        conflictsWith: strategies.filter((s) => s.loanIds.includes(hl.id) || s.loanIds.includes(highPl.id)).map((s) => s.id),
        fees: { pf: 0.5, fc: 0 },
        eligibility: `Top-up available if property value > current outstanding + top-up amount. LTV ≤ 75%.`,
        recommendation: `By converting unsecured PL debt to secured home loan debt, you reduce rate from ${highPl.rate}% to 9.2% — a massive saving. This also improves your EMI ratio.`,
        loanIds: [hl.id, highPl.id],
      });
    }
  }

  // Partial prepayment strategy
  if (loans.length > 0 && income > 0) {
    const highRateLoan = sorted[0];
    const prepayAmount = Math.round(income * 6);
    const newClosureMonths = Math.max(6, highRateLoan.closureMonths - Math.round(prepayAmount / highRateLoan.emi));
    const saved = highRateLoan.emi * (highRateLoan.closureMonths - newClosureMonths);

    strategies.push({
      id: id++,
      tag: 'PARTIAL',
      title: `Part-prepay ${highRateLoan.lender} loan with 6-month bonus`,
      reason: `Using ₹${(prepayAmount / 1000).toFixed(0)}K (6 months savings) to prepay your highest-rate loan reduces tenure by ${highRateLoan.closureMonths - newClosureMonths} months.`,
      monthlyEmiFreed: 0,
      totalInterestSaved: Math.max(0, saved),
      lumpSumAvailable: 0,
      netSaving: Math.max(0, saved * 0.9),
      conflictsWith: [],
      eligibility: `Partial prepayment typically allowed after 12 EMIs with no foreclosure charge for floating rate loans under RBI guidelines.`,
      recommendation: `Even a one-time prepayment of ${formatInrShort(prepayAmount)} can save ${formatInrShort(saved)} in interest. Best done at beginning of EMI cycle.`,
      loanIds: [highRateLoan.id],
    });
  }

  // Consolidation (if 3+ loans)
  if (loans.length >= 3) {
    const plLoans = loans.filter((l) => l.accountType === 'Personal Loan' || l.accountType === 'Consumer Durable');
    if (plLoans.length >= 2) {
      const totalOs = plLoans.reduce((s, l) => s + l.outstanding, 0);
      const totalEmi = plLoans.reduce((s, l) => s + l.emi, 0);
      const consolidateRate = cibilScore >= 750 ? 13 : 15;
      const consolidateMonths = 48;
      const r = consolidateRate / 100 / 12;
      const newEmi = Math.round((totalOs * r * Math.pow(1 + r, consolidateMonths)) / (Math.pow(1 + r, consolidateMonths) - 1));
      const emiFreed = totalEmi - newEmi;
      const avgRateOld = plLoans.reduce((s, l) => s + l.rate * l.outstanding, 0) / totalOs;
      const saved = (totalEmi - newEmi) * Math.min(...plLoans.map((l) => l.closureMonths));

      strategies.push({
        id: id++,
        tag: 'CONSOLIDATE',
        title: `Consolidate ${plLoans.length} personal loans into one`,
        reason: `Multiple personal loans add administrative complexity and higher blended rate. Consolidating at ${consolidateRate}% (vs avg ${avgRateOld.toFixed(1)}%) simplifies repayment.`,
        monthlyEmiFreed: Math.max(0, emiFreed),
        totalInterestSaved: Math.max(0, saved),
        lumpSumAvailable: 0,
        netSaving: Math.max(0, saved * 0.85),
        conflictsWith: strategies.filter((s) => s.loanIds.some((lid) => plLoans.map((l) => l.id).includes(lid))).map((s) => s.id),
        eligibility: `Consolidation loan available for borrowers with CIBIL ≥ ${cibilScore >= 700 ? 700 : 650}. Debt-to-income must be < 55%.`,
        recommendation: `Consolidation simplifies your debt to a single EMI, reduces overall interest, and improves credit utilization ratio which can boost your CIBIL score.`,
        loanIds: plLoans.map((l) => l.id),
      });
    }
  }

  // Update conflict IDs properly
  strategies.forEach((s, i) => {
    strategies.forEach((other, j) => {
      if (i !== j && s.loanIds.some((lid) => other.loanIds.includes(lid))) {
        if (!s.conflictsWith.includes(other.id)) s.conflictsWith.push(other.id);
        if (!other.conflictsWith.includes(s.id)) other.conflictsWith.push(s.id);
      }
    });
  });

  return strategies;
}

// ─── Live Tally Bar ────────────────────────────────────────────────────────────

function TallyBar({ selectedIds, strategies }: { selectedIds: number[]; strategies: Strategy[] }) {
  const selected = strategies.filter((s) => selectedIds.includes(s.id));
  const totalEmiFreed = selected.reduce((sum, s) => sum + s.monthlyEmiFreed, 0);
  const totalSaved = selected.reduce((sum, s) => sum + s.totalInterestSaved, 0);
  const count = selected.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 0.98, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-2xl"
        >
          <div
            className="rounded-2xl border border-mint/30 px-5 py-3 flex items-center gap-4 flex-wrap justify-between shadow-mint-glow"
            style={{ background: 'rgba(12, 31, 26, 0.97)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-mint text-black flex items-center justify-center text-xs font-black">
                {count}
              </div>
              <span className="text-sm font-medium text-text">strategies selected</span>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-xs text-muted">EMI Freed</div>
                <div className="text-sm font-bold text-green">{formatInrShort(totalEmiFreed)}/mo</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted">Interest Saved</div>
                <div className="text-sm font-bold text-mint">{formatInrShort(totalSaved)}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StrategiesPage() {
  const router = useRouter();
  const {
    auth, bureau, profile,
    strategies, setStrategies,
    selectedStrategyIds, toggleStrategy,
    setLoanFees,
  } = useAppStore();

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
    if (!bureau.fetched) router.replace('/bureau');
  }, [auth.isAuthenticated, bureau.fetched, router]);

  // Generate strategies on mount
  useEffect(() => {
    if (bureau.loans.length > 0 && strategies.length === 0) {
      const generated = generateStrategies(bureau.loans, bureau.cibilScore, profile.income);
      setStrategies(generated);
    }
  }, [bureau.loans.length]);

  const handleProceed = () => {
    if (selectedStrategyIds.length === 0) {
      toast.error('Please select at least one strategy');
      return;
    }
    router.push('/strategies/results');
  };

  const totalEmiFreed = useMemo(
    () => strategies.filter((s) => selectedStrategyIds.includes(s.id)).reduce((s, st) => s + st.monthlyEmiFreed, 0),
    [strategies, selectedStrategyIds]
  );
  const totalSaved = useMemo(
    () => strategies.filter((s) => selectedStrategyIds.includes(s.id)).reduce((s, st) => s + st.totalInterestSaved, 0),
    [strategies, selectedStrategyIds]
  );

  return (
    <div className="min-h-screen bg-black pb-40">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-mint" />
            <h1 className="text-2xl font-black text-white">Strategy Optimizer</h1>
          </div>
          <p className="text-sm text-muted">
            Select the strategies you want to execute. Our BRE engine has calculated exact savings for your profile.
          </p>
        </motion.div>

        {/* Summary stats */}
        {strategies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <div className="text-2xl font-black text-mint">{strategies.length}</div>
              <div className="text-xs text-muted mt-1">Strategies Found</div>
            </div>
            <div className="rounded-2xl border border-green/20 bg-green/5 p-4 text-center">
              <div className="text-2xl font-black text-green">
                {formatInrShort(strategies.reduce((s, st) => s + st.monthlyEmiFreed, 0))}/mo
              </div>
              <div className="text-xs text-muted mt-1">Max EMI Reduction</div>
            </div>
            <div className="rounded-2xl border border-mint/20 bg-mint/5 p-4 text-center">
              <div className="text-2xl font-black text-mint">
                {formatInrShort(strategies.reduce((s, st) => s + st.totalInterestSaved, 0))}
              </div>
              <div className="text-xs text-muted mt-1">Max Interest Saved</div>
            </div>
          </motion.div>
        )}

        {/* Strategy cards */}
        {strategies.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Zap className="w-10 h-10 text-muted/30 mx-auto mb-4" />
            <p className="font-medium">No strategies generated yet</p>
            <p className="text-sm mt-1">Please complete bureau review first</p>
            <Button variant="primary" size="md" onClick={() => router.push('/bureau')} className="mt-4">
              Go to Bureau Review
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy, i) => {
              const isSelected = selectedStrategyIds.includes(strategy.id);
              const isDisabled =
                !isSelected &&
                strategy.conflictsWith.some((cid) => selectedStrategyIds.includes(cid));

              return (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={toggleStrategy}
                  onFeesChange={(id, pf, fc) => setLoanFees(id, { pf, fc })}
                  index={i}
                />
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between mt-8"
        >
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleProceed}
            disabled={selectedStrategyIds.length === 0}
          >
            View Results
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </main>

      {/* Tally bar */}
      <TallyBar selectedIds={selectedStrategyIds} strategies={strategies} />
    </div>
  );
}
