'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ArrowRight, Home, CreditCard, Briefcase,
  TrendingDown, TrendingUp, Layers, Target, CheckCircle2,
  AlertTriangle, Info, ChevronDown, ChevronUp, Edit3,
  Sparkles, Building2, DollarSign, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, BureauLoan, Strategy } from '@/store/useAppStore';
import { formatInrShort } from '@/lib/mock-bureau';
import { buildLoanStrategies, LoanStrategies, ExtendedStrategy } from '@/lib/bre-engine';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type CustomerPath = 'with-property' | 'no-property' | 'no-data';
type TabView = 'plan' | 'byloan' | 'bygoal';
type GoalFilter = 'reduce-emi' | 'reduce-debt' | 'grow-wealth' | 'consolidate';

interface PlanStep {
  stepNum: number;
  priority: 'critical' | 'high' | 'medium' | 'optional';
  icon: string;
  headline: string;
  subline: string;
  emiImpact: number;       // monthly saving
  interestImpact: number;  // total interest saving
  strategies: ExtendedStrategy[];
  loanRef?: BureauLoan;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE ANALYSIS — determines the customer path
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerProfile {
  path: CustomerPath;
  hasHL: boolean;
  hasLAP: boolean;
  hasOtherProperty: boolean;
  propertyValue: number;
  topupAvailable: number;
  topupRate: number;
  totalHighRateDebt: number;   // debt > 12%
  totalDebt: number;
  totalEmi: number;
  emiRatio: number;
  highestRate: number;
  loansHighRate: BureauLoan[]; // >12%
  loansLowRate: BureauLoan[];  // ≤12%
  ccLoans: BureauLoan[];
  plLoans: BureauLoan[];
  hlLoan?: BureauLoan;
  lapLoan?: BureauLoan;
  blLoan?: BureauLoan;
  carLoan?: BureauLoan;
  eduLoan?: BureauLoan;
  fundsAvailable: number;      // total equity available via HL BT + top-up + LAP
  cibil: number;
}

function analyseProfile(
  loans: BureauLoan[],
  cibil: number,
  income: number,
  houseValue: number,
  ownHouse: boolean,
): CustomerProfile {
  const sorted = [...loans].sort((a, b) => b.rate - a.rate);
  const hlLoan  = loans.find(l => l.accountType === 'Home Loan');
  const lapLoan = loans.find(l => l.accountType === 'LAP');
  const ccLoans = loans.filter(l => l.accountType === 'Credit Card');
  const plLoans = loans.filter(l => l.accountType === 'Personal Loan');
  const blLoan  = loans.find(l => l.accountType === 'Business Loan' || l.accountType === 'SME Loan');
  const carLoan = loans.find(l => l.accountType === 'Auto Loan' || l.accountType === 'Car Loan');
  const eduLoan = loans.find(l => l.accountType === 'Education Loan');

  const hasHL = !!hlLoan;
  const hasLAP = !!lapLoan;
  const hasOtherProperty = ownHouse && !hasHL && houseValue > 0;
  const propertyValue = houseValue;

  // Estimate top-up
  let topupAvailable = 0;
  let topupRate = 0;
  if (hlLoan && houseValue > 0) {
    const repaidRatio = Math.max(0, 1 - hlLoan.outstanding / Math.max(hlLoan.sanctionAmount, 1));
    const estElapsed = Math.round(hlLoan.closureMonths * repaidRatio / Math.max(0.05, 1 - repaidRatio));
    const maxPct = estElapsed >= 24 ? 0.30 : estElapsed >= 18 ? 0.20 : estElapsed >= 12 ? 0.10 : 0;
    const ltv75 = houseValue * 0.75;
    const ltvCap = Math.max(0, ltv75 - hlLoan.outstanding);
    topupAvailable = Math.min(hlLoan.sanctionAmount * maxPct, ltvCap);
    topupRate = hlLoan.rate + (topupAvailable / hlLoan.sanctionAmount > 0.30 ? 0.5 : 0);
  }

  // LAP funds (if own property, no HL)
  let lapFunds = 0;
  if (!hasHL && propertyValue > 0) {
    lapFunds = propertyValue * 0.65;
  }

  const fundsAvailable = topupAvailable + lapFunds;

  const totalDebt  = loans.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi   = loans.reduce((s, l) => s + l.emi, 0);
  const emiRatio   = income > 0 ? (totalEmi / income) : 0;
  const highestRate = sorted[0]?.rate ?? 0;

  const loansHighRate = sorted.filter(l => l.rate > 12);
  const loansLowRate  = sorted.filter(l => l.rate <= 12);
  const totalHighRateDebt = loansHighRate.reduce((s, l) => s + l.outstanding, 0);

  const path: CustomerPath =
    hasHL || hasLAP || hasOtherProperty ? 'with-property'
    : loans.length > 0 ? 'no-property'
    : 'no-data';

  return {
    path, hasHL, hasLAP, hasOtherProperty, propertyValue, topupAvailable, topupRate,
    totalHighRateDebt, totalDebt, totalEmi, emiRatio, highestRate,
    loansHighRate, loansLowRate, ccLoans, plLoans, hlLoan, lapLoan, blLoan, carLoan, eduLoan,
    fundsAvailable, cibil,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN BUILDER — creates ordered steps per the BRE head's flow
// ─────────────────────────────────────────────────────────────────────────────

function buildPlan(profile: CustomerProfile, groups: LoanStrategies[]): PlanStep[] {
  const steps: PlanStep[] = [];
  let n = 1;

  const allStrats = groups.flatMap(g => g.strategies);
  const getStrats = (loanId: number) => groups.find(g => g.loanId === loanId)?.strategies ?? [];
  const getBestStrat = (loanId: number, tag?: string) => {
    const s = getStrats(loanId);
    return tag ? s.filter(x => x.tag === tag || x.subTag === tag) : s;
  };

  // ── WITH PROPERTY PATH ────────────────────────────────────────────────────
  if (profile.path === 'with-property') {

    // Step 1: BT / Rate reduction on secured loan (HL or LAP)
    const securedLoan = profile.hlLoan ?? profile.lapLoan;
    if (securedLoan) {
      const btStrats = getBestStrat(securedLoan.id, 'BT');
      const btStrat = btStrats[0];
      if (btStrat) {
        steps.push({
          stepNum: n++, priority: 'high',
          icon: '🏠', headline: `Lower your ${securedLoan.accountType} rate`,
          subline: `Transfer ${securedLoan.lender} @ ${securedLoan.rate}% to a better lender and reduce your secured loan cost immediately.`,
          emiImpact: btStrat.monthlyEmiFreed,
          interestImpact: btStrat.netSaving ?? btStrat.totalInterestSaved,
          strategies: btStrats,
          loanRef: securedLoan,
        });
      }
    }

    // Step 2: Raise funds via Top-up
    if (profile.topupAvailable > 50000 && profile.hlLoan) {
      const topupStrats = allStrats.filter(s => s.subTag === 'TOPUP_CONSOLIDATE' && s.loanIds.includes(profile.hlLoan!.id));
      if (topupStrats.length > 0) {
        const best = topupStrats.sort((a, b) => b.totalInterestSaved - a.totalInterestSaved)[0];
        steps.push({
          stepNum: n++, priority: 'critical',
          icon: '⬆️', headline: `Use home equity: ${formatInrShort(profile.topupAvailable)} top-up available`,
          subline: `Your home loan has equity. A top-up at ${profile.topupRate}% can close your highest-rate loans — saving significantly vs ${profile.highestRate}%.`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.totalInterestSaved,
          strategies: topupStrats,
          loanRef: profile.hlLoan,
        });
      }
    }

    // Step 3: LAP if own property (no HL)
    if (!profile.hasHL && profile.hasOtherProperty) {
      const lapStrats = allStrats.filter(s => s.tag === 'LAP');
      if (lapStrats.length > 0) {
        const best = lapStrats[0];
        steps.push({
          stepNum: n++, priority: 'critical',
          icon: '🏛️', headline: `Mortgage property for LAP — ${formatInrShort(profile.fundsAvailable)} available`,
          subline: `Use your property (65% LTV) to raise funds at ~10.5% and close all high-rate debt (${profile.loansHighRate.map(l => l.accountType).join(', ')}).`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.totalInterestSaved,
          strategies: lapStrats,
        });
      }
    }

    // Step 4: Close high-rate loans with raised funds (CC first)
    if (profile.ccLoans.length > 0) {
      const ccStrats = profile.ccLoans.flatMap(cc => getStrats(cc.id));
      if (ccStrats.length > 0) {
        const best = ccStrats.sort((a, b) => b.totalInterestSaved - a.totalInterestSaved)[0];
        steps.push({
          stepNum: n++, priority: 'critical',
          icon: '💳', headline: `Close Credit Card debt first (${profile.ccLoans[0].rate}% — highest rate)`,
          subline: `Credit card interest is the most expensive. Use top-up funds or convert to PL to eliminate this immediately.`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.totalInterestSaved,
          strategies: ccStrats,
          loanRef: profile.ccLoans[0],
        });
      }
    }

    // Step 5: Consolidate remaining high-rate loans (PL/BL)
    const highRateUnsecured = [...profile.plLoans, ...(profile.blLoan ? [profile.blLoan] : [])].filter(l => l.rate > 14);
    if (highRateUnsecured.length > 0) {
      const strats = highRateUnsecured.flatMap(l => getStrats(l.id)).filter(s => s.tag === 'BT' || s.tag === 'TOPUP');
      if (strats.length > 0) {
        const best = strats.sort((a, b) => b.netSaving - a.netSaving)[0];
        steps.push({
          stepNum: n++, priority: 'high',
          icon: '💼', headline: `Consolidate or transfer high-rate PL/BL`,
          subline: `Shift ${highRateUnsecured.map(l => `${l.lender} @ ${l.rate}%`).join(' + ')} to a lower rate — either via BT or HL top-up funds.`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.totalInterestSaved,
          strategies: strats,
        });
      }
    }

    // Step 6: Invest remaining funds
    const investStrats = allStrats.filter(s => s.subTag === 'TOPUP_INVEST');
    if (investStrats.length > 0) {
      const best = investStrats[0];
      steps.push({
        stepNum: n++, priority: 'optional',
        icon: '📈', headline: `Invest remaining top-up funds for wealth creation`,
        subline: `After closing high-rate debt, ${formatInrShort(best.lumpSumAvailable)} is available to invest at ~12% CAGR via equity MF/NPS.`,
        emiImpact: 0,
        interestImpact: best.netSaving,
        strategies: investStrats,
      });
    }
  }

  // ── NO PROPERTY PATH ──────────────────────────────────────────────────────
  else if (profile.path === 'no-property') {

    // Step 1: Close highest-rate loan (considering FC)
    const highest = profile.loansHighRate[0];
    if (highest) {
      const strats = getStrats(highest.id);
      if (strats.length > 0) {
        const best = strats.sort((a, b) => b.netSaving - a.netSaving)[0];
        steps.push({
          stepNum: n++, priority: 'critical',
          icon: '🎯', headline: `Priority 1: Close ${highest.lender} (${highest.rate}% — highest rate)`,
          subline: `Your most expensive loan. ${best.title}. Saves ${formatInrShort(best.netSaving)} net after all transfer costs.`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.netSaving,
          strategies: strats,
          loanRef: highest,
        });
      }
    }

    // Step 2: CC (if exists) — convert to PL
    if (profile.ccLoans.length > 0) {
      const cc = profile.ccLoans[0];
      const ccStrats = getStrats(cc.id);
      if (ccStrats.length > 0) {
        const best = ccStrats[0];
        steps.push({
          stepNum: n++, priority: 'critical',
          icon: '💳', headline: `Convert Credit Card to Personal Loan`,
          subline: `CC at ${cc.rate}% can be converted to a PL at ~${Math.min(14, cc.rate - 10)}%. Eliminates revolving interest and saves ${formatInrShort(best.totalInterestSaved)}.`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.totalInterestSaved,
          strategies: ccStrats,
          loanRef: cc,
        });
      }
    }

    // Step 3: BT remaining high-rate loans
    const remainingHighRate = profile.loansHighRate.slice(1).filter(l => l.accountType !== 'Credit Card');
    if (remainingHighRate.length > 0) {
      const strats = remainingHighRate.flatMap(l => getStrats(l.id)).filter(s => s.tag === 'BT');
      if (strats.length > 0) {
        const best = strats.sort((a, b) => b.netSaving - a.netSaving)[0];
        steps.push({
          stepNum: n++, priority: 'high',
          icon: '🔀', headline: `Transfer remaining high-rate loans`,
          subline: `${remainingHighRate.map(l => `${l.lender} @ ${l.rate}%`).join(' | ')} — BT to better lenders saves ${formatInrShort(best.netSaving)} net.`,
          emiImpact: best.monthlyEmiFreed,
          interestImpact: best.netSaving,
          strategies: strats,
        });
      }
    }

    // Step 4: Consolidation (if multiple loans)
    const consolStrats = allStrats.filter(s => s.tag === 'CONSOLIDATE');
    if (consolStrats.length > 0) {
      const best = consolStrats[0];
      steps.push({
        stepNum: n++, priority: 'medium',
        icon: '🔗', headline: `Consolidate ${profile.loansHighRate.length} high-rate loans into 1`,
        subline: `Single EMI, lower blended rate. Saves ${formatInrShort(best.totalInterestSaved)} and improves CIBIL score over time.`,
        emiImpact: best.monthlyEmiFreed,
        interestImpact: best.totalInterestSaved,
        strategies: consolStrats,
      });
    }

    // Step 5: Use freed EMI to invest
    if (profile.emiRatio > 0.3) {
      steps.push({
        stepNum: n++, priority: 'optional',
        icon: '📊', headline: `Invest freed EMI in growth assets`,
        subline: `After each loan closes, redirect that EMI to equity MF or NPS. Even ${formatInrShort(Math.round(profile.totalEmi * 0.2))}/month at 12% CAGR = ${formatInrShort(Math.round(profile.totalEmi * 0.2 * 12 * 10 * 1.5))} in 10 years.`,
        emiImpact: 0,
        interestImpact: 0,
        strategies: [],
      });
    }
  }

  // ── Close loan faster (always add if applicable) ──────────────────────────
  const closeFastStrats = allStrats.filter(s =>
    s.title.includes('months early') || s.title.includes('Close')
  ).slice(0, 2);
  if (closeFastStrats.length > 0) {
    const best = closeFastStrats[0];
    steps.push({
      stepNum: n++, priority: 'medium',
      icon: '⚡', headline: `Close your highest-rate loan faster`,
      subline: `Paying 50% extra EMI closes it ${best.totalInterestSaved > 0 ? 'months earlier, saving ' + formatInrShort(best.totalInterestSaved) : 'sooner'}. No prepayment charges on floating rate loans.`,
      emiImpact: 0,
      interestImpact: best.totalInterestSaved,
      strategies: closeFastStrats,
    });
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL FILTER
// ─────────────────────────────────────────────────────────────────────────────

function filterByGoal(allStrats: ExtendedStrategy[], goal: GoalFilter): ExtendedStrategy[] {
  switch (goal) {
    case 'reduce-emi':
      return allStrats.filter(s => s.monthlyEmiFreed > 0).sort((a, b) => b.monthlyEmiFreed - a.monthlyEmiFreed);
    case 'reduce-debt':
      return allStrats.filter(s => s.totalInterestSaved > 0 || (s.netSaving ?? 0) > 0)
        .sort((a, b) => (b.netSaving ?? b.totalInterestSaved) - (a.netSaving ?? a.totalInterestSaved));
    case 'grow-wealth':
      return allStrats.filter(s => s.lumpSumAvailable > 0 || s.subTag === 'TOPUP_INVEST');
    case 'consolidate':
      return allStrats.filter(s => s.tag === 'CONSOLIDATE' || s.subTag === 'TOPUP_CONSOLIDATE');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { color: 'text-red', bg: 'bg-red/10', border: 'border-red/20', label: 'Do First' },
  high:     { color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20', label: 'High Impact' },
  medium:   { color: 'text-blue', bg: 'bg-blue/10', border: 'border-blue/20', label: 'Recommended' },
  optional: { color: 'text-mint', bg: 'bg-mint/10', border: 'border-mint/20', label: 'Bonus' },
};

// Compact strategy option within a step
function StrategyOption({
  strat, isSelected, isDisabled, onToggle,
}: {
  strat: ExtendedStrategy;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editFees, setEditFees] = useState(false);
  const [pf, setPf] = useState(strat.fees?.pf ?? 1);
  const [fc, setFc] = useState(strat.fees?.fc ?? 2);

  return (
    <div className={[
      'rounded-xl border transition-all',
      isDisabled ? 'opacity-40 cursor-not-allowed border-border' :
        isSelected ? 'border-mint/40 bg-mint/5' :
        'border-border bg-faint hover:border-mint/20',
    ].join(' ')}>
      {/* Row */}
      <div className="flex items-center gap-3 px-3 py-2.5" onClick={() => !isDisabled && onToggle(strat.id)}>
        <div className={[
          'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
          isSelected ? 'bg-mint border-mint' : 'border-border',
        ].join(' ')}>
          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text leading-snug">{strat.title}</div>
          {(strat.monthlyEmiFreed > 0 || strat.totalInterestSaved > 0) && (
            <div className="flex gap-3 mt-0.5 text-[10px]">
              {strat.monthlyEmiFreed > 0 && <span className="text-green">▼ {formatInrShort(strat.monthlyEmiFreed)}/mo</span>}
              {strat.totalInterestSaved > 0 && <span className="text-mint">{formatInrShort(strat.totalInterestSaved)} saved</span>}
              {isDisabled && <span className="text-red/70">Conflicts</span>}
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} className="text-muted p-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/40">
              {strat.fromLoan && strat.toLoan && (
                <div className="flex items-center gap-2 text-[11px] bg-black/30 rounded-lg px-3 py-2">
                  <span className="text-muted">From:</span>
                  <span className="text-text font-medium">{strat.fromLoan.lender}</span>
                  <span className="text-red">@{strat.fromLoan.rate}%</span>
                  <ArrowRight className="w-3 h-3 text-mint mx-1" />
                  <span className="text-muted">To:</span>
                  <span className="text-text font-medium">{strat.toLoan.lender}</span>
                  <span className="text-green">@{strat.toLoan.rate}%</span>
                </div>
              )}
              <p className="text-[11px] text-muted leading-relaxed">{strat.reason}</p>
              {/* Fee editor */}
              {(strat.tag === 'BT' || strat.tag === 'TOPUP') && strat.fees && (
                <div className="border border-border/50 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted font-medium">Transfer Costs (editable)</span>
                    <button onClick={() => setEditFees(!editFees)} className="text-[10px] text-mint flex items-center gap-1">
                      <Edit3 className="w-2.5 h-2.5" /> {editFees ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  {editFees ? (
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <div>
                        <div className="text-[10px] text-muted mb-1">PF %</div>
                        <input type="number" value={pf} step="0.1" min="0" max="5"
                          onChange={e => setPf(parseFloat(e.target.value))}
                          className="w-full bg-faint border border-border rounded-lg px-2 py-1 text-xs text-text focus:border-mint/40 outline-none" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted mb-1">FC %</div>
                        <input type="number" value={fc} step="0.1" min="0" max="5"
                          onChange={e => setFc(parseFloat(e.target.value))}
                          className="w-full bg-faint border border-border rounded-lg px-2 py-1 text-xs text-text focus:border-mint/40 outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 text-[11px] mt-1">
                      <span className="text-muted">PF: <span className="text-amber">{pf}%</span></span>
                      <span className="text-muted">FC: <span className="text-amber">{fc}%</span></span>
                      {strat.breakEvenMonths && strat.breakEvenMonths > 0 && (
                        <span className="text-muted">Break-even: <span className="text-text">{strat.breakEvenMonths}mo</span></span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green mt-0.5" />
                <p className="text-[10px] text-muted">{strat.eligibility}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Plan step card
function PlanStepCard({
  step, selectedIds, onToggle,
}: {
  step: PlanStep;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = PRIORITY_CONFIG[step.priority];
  const selectedInStep = step.strategies.filter(s => selectedIds.includes(s.id)).length;
  const hasStrategies = step.strategies.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Step header */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => hasStrategies && setOpen(!open)}
      >
        {/* Step number */}
        <div className="w-7 h-7 rounded-full bg-faint border border-border flex items-center justify-center text-xs font-black text-muted flex-shrink-0 mt-0.5">
          {step.stepNum}
        </div>

        {/* Emoji icon */}
        <span className="text-xl flex-shrink-0">{step.icon}</span>

        <div className="flex-1 min-w-0">
          {/* Priority badge */}
          <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border mb-1 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            {step.priority === 'critical' && '🔴'} {cfg.label}
          </div>
          <h3 className="text-sm font-bold text-white leading-snug">{step.headline}</h3>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{step.subline}</p>

          {/* Impact numbers */}
          {(step.emiImpact > 0 || step.interestImpact > 0) && (
            <div className="flex gap-4 mt-1.5">
              {step.emiImpact > 0 && (
                <div className="text-xs">
                  <span className="text-muted">EMI saving: </span>
                  <span className="text-green font-bold">{formatInrShort(step.emiImpact)}/mo</span>
                </div>
              )}
              {step.interestImpact > 0 && (
                <div className="text-xs">
                  <span className="text-muted">Interest saving: </span>
                  <span className="text-mint font-bold">{formatInrShort(step.interestImpact)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedInStep > 0 && (
            <div className="w-5 h-5 rounded-full bg-mint text-black flex items-center justify-center text-[10px] font-black">
              {selectedInStep}
            </div>
          )}
          {hasStrategies && (
            <span className="text-muted">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          )}
        </div>
      </div>

      {/* Strategy options */}
      <AnimatePresence>
        {open && step.strategies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/40">
              <p className="text-[11px] text-muted mb-2">
                {step.strategies.length === 1 ? 'Select this strategy to include it in your plan:' : `${step.strategies.length} options — select the best one for you:`}
              </p>
              {step.strategies.map(s => {
                const isSelected = selectedIds.includes(s.id);
                const isDisabled = !isSelected && s.conflictsWith.some(cid => selectedIds.includes(cid));
                return (
                  <StrategyOption key={s.id} strat={s} isSelected={isSelected} isDisabled={isDisabled} onToggle={onToggle} />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// By-Loan accordion item
function LoanAccordion({
  group, selectedIds, onToggle,
}: {
  group: LoanStrategies;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const icons: Record<string, string> = {
    'Home Loan': '🏠', 'Personal Loan': '💼', 'Credit Card': '💳',
    'Auto Loan': '🚗', 'Business Loan': '🏢', 'Education Loan': '🎓',
    'Multiple Loans': '🔀', 'Property (LAP)': '🏛️', 'EMI Health': '⚠️',
  };
  const icon = icons[group.loan.accountType] ?? '📋';
  const selectedInGroup = group.strategies.filter(s => selectedIds.includes(s.id)).length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{group.loan.lender}</span>
            <span className="text-xs text-muted">· {group.loan.accountType}</span>
            {group.loan.outstanding > 0 && (
              <span className="text-xs text-amber ml-auto">{group.loan.rate}%</span>
            )}
          </div>
          <div className="text-xs text-muted mt-0.5">
            {group.strategies.length} {group.strategies.length === 1 ? 'strategy' : 'strategies'} available
            {group.loan.outstanding > 0 && ` · OS: ${formatInrShort(group.loan.outstanding)}`}
          </div>
        </div>
        {selectedInGroup > 0 && (
          <div className="w-5 h-5 rounded-full bg-mint text-black flex items-center justify-center text-[10px] font-black">{selectedInGroup}</div>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2 border-t border-border/40 pt-3">
              {group.strategies.map(s => {
                const isSelected = selectedIds.includes(s.id);
                const isDisabled = !isSelected && s.conflictsWith.some(cid => selectedIds.includes(cid));
                return (
                  <StrategyOption key={s.id} strat={s} isSelected={isSelected} isDisabled={isDisabled} onToggle={onToggle} />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tally bar
function TallyBar({ selectedIds, allStrats, onViewResults }: {
  selectedIds: number[];
  allStrats: ExtendedStrategy[];
  onViewResults: () => void;
}) {
  const selected = allStrats.filter(s => selectedIds.includes(s.id));
  const totalEmi = selected.reduce((s, st) => s + st.monthlyEmiFreed, 0);
  const totalSaved = selected.reduce((s, st) => s + st.totalInterestSaved, 0);
  const count = selected.length;
  if (!count) return null;
  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2"
      style={{ background: 'linear-gradient(to top, #080808 50%, transparent)' }}>
      <div className="max-w-3xl mx-auto rounded-2xl border border-mint/30 px-5 py-3 flex items-center gap-4 flex-wrap justify-between"
        style={{ background: 'rgba(12,31,26,0.98)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-mint text-black flex items-center justify-center text-xs font-black">{count}</div>
            <span className="text-sm font-semibold text-text">{count === 1 ? 'strategy' : 'strategies'} selected</span>
          </div>
          {totalEmi > 0 && (
            <div className="border-l border-border pl-3">
              <div className="text-xs font-bold text-green">{formatInrShort(totalEmi)}/mo freed</div>
            </div>
          )}
          <div className="border-l border-border pl-3">
            <div className="text-xs font-bold text-mint">{formatInrShort(totalSaved)} saved</div>
          </div>
        </div>
        <button onClick={onViewResults}
          className="bg-mint text-black text-sm font-bold px-5 py-2 rounded-xl hover:bg-teal transition-colors flex items-center gap-2">
          View Results <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function StrategiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    auth, bureau, profile,
    setStrategies, selectedStrategyIds, toggleStrategy, setLoanFees, setProfile,
  } = useAppStore();

  // Read goal/tab from URL params (set by dashboard quick actions)
  const urlTab  = (searchParams.get('tab') as TabView | null) ?? 'plan';
  const urlGoal = (searchParams.get('goal') as GoalFilter | null) ?? 'reduce-emi';

  const [loanGroups, setLoanGroups] = useState<LoanStrategies[]>([]);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isBuilding, setIsBuilding] = useState(true);
  const [tab, setTab] = useState<TabView>(urlTab);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>(urlGoal);

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
    else if (!bureau.fetched) router.replace('/bureau');
  }, [auth.isAuthenticated, bureau.fetched, router]);

  const rebuild = useCallback(() => {
    if (!bureau.loans.length) { setIsBuilding(false); return; }
    setIsBuilding(true);
    setTimeout(() => {
      const profile_ = analyseProfile(
        bureau.loans, bureau.cibilScore, profile.income,
        profile.houseValue, profile.ownHouse === true,
      );
      setCustomerProfile(profile_);

      const groups = buildLoanStrategies(
        bureau.loans, bureau.cibilScore, profile.income,
        profile.houseValue, profile.ownHouse === true,
      );
      setLoanGroups(groups);
      setStrategies(groups.flatMap(g => g.strategies));

      const steps = buildPlan(profile_, groups);
      setPlanSteps(steps);
      setIsBuilding(false);
    }, 300);
  }, [bureau.loans, bureau.cibilScore, profile.income, profile.houseValue, profile.ownHouse]);

  useEffect(() => { rebuild(); }, []); // eslint-disable-line

  const allStrats = useMemo(() => loanGroups.flatMap(g => g.strategies), [loanGroups]);
  const goalStrats = useMemo(() => filterByGoal(allStrats, goalFilter), [allStrats, goalFilter]);

  const cp = customerProfile;

  return (
    <div className="min-h-screen bg-black pb-32">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-muted hover:text-text transition-colors p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-mint" />
              <h1 className="text-xl font-black text-white">Your Strategy Plan</h1>
            </div>
            <p className="text-xs text-muted">Personalised for {auth.user?.name} · {bureau.loans.length} loans analysed</p>
          </div>
        </div>

        {/* Building */}
        {isBuilding && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Analysing your profile...</p>
          </div>
        )}

        {/* Income prompt */}
        {!isBuilding && !profile.income && (
          <div className="rounded-2xl border border-amber/30 bg-amber/5 p-4 mb-5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber mb-1">Add your income for complete analysis</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center border border-border rounded-xl overflow-hidden bg-surface">
                  <span className="px-2 py-2 text-muted border-r border-border text-sm">₹</span>
                  <input type="number" placeholder="Monthly net income"
                    className="bg-transparent outline-none px-2.5 py-2 text-text text-sm w-40"
                    onBlur={e => { const n = parseInt(e.target.value); if (n > 0) { setProfile({ income: n }); setTimeout(rebuild, 100); } }}
                  />
                </div>
                <span className="text-xs text-muted">/month</span>
              </div>
            </div>
          </div>
        )}

        {/* Customer profile snapshot */}
        {!isBuilding && cp && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border p-4 mb-5 overflow-hidden"
            style={{ background: 'rgba(12,31,26,0.8)' }}>
            {/* Path badge */}
            <div className="flex items-center gap-2 mb-3">
              {cp.path === 'with-property' ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-mint/15 text-mint border border-mint/30">
                  <Home className="w-3 h-3" /> Property Owner — Home Equity Strategy
                </span>
              ) : cp.path === 'no-property' ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue/10 text-blue border border-blue/20">
                  <Target className="w-3 h-3" /> No Property — Direct Debt Reduction
                </span>
              ) : (
                <span className="text-xs text-muted">No loan data</span>
              )}
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-faint rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-muted">CIBIL</div>
                <div className={`text-sm font-black ${cp.cibil >= 750 ? 'text-green' : cp.cibil >= 700 ? 'text-amber' : 'text-red'}`}>{cp.cibil}</div>
              </div>
              <div className="bg-faint rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-muted">Total Debt</div>
                <div className="text-sm font-black text-red/80">{formatInrShort(cp.totalDebt)}</div>
              </div>
              <div className="bg-faint rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-muted">Monthly EMI</div>
                <div className="text-sm font-black text-amber">{formatInrShort(cp.totalEmi)}</div>
              </div>
              <div className="bg-faint rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-muted">Highest Rate</div>
                <div className={`text-sm font-black ${cp.highestRate > 20 ? 'text-red' : cp.highestRate > 14 ? 'text-amber' : 'text-mint'}`}>{cp.highestRate}%</div>
              </div>
            </div>

            {/* Property / funds snapshot */}
            {cp.path === 'with-property' && cp.fundsAvailable > 0 && (
              <div className="mt-3 bg-mint/5 border border-mint/20 rounded-xl px-3 py-2.5">
                <div className="text-xs font-semibold text-mint mb-1">💡 You have home equity to work with</div>
                <div className="flex gap-4 text-xs text-muted">
                  {cp.topupAvailable > 0 && (
                    <span>Top-up available: <span className="text-mint font-semibold">{formatInrShort(cp.topupAvailable)}</span> @ {cp.topupRate}%</span>
                  )}
                  {cp.totalHighRateDebt > 0 && (
                    <span>High-rate debt to close: <span className="text-amber font-semibold">{formatInrShort(cp.totalHighRateDebt)}</span></span>
                  )}
                </div>
              </div>
            )}
            {cp.path === 'no-property' && cp.loansHighRate.length > 0 && (
              <div className="mt-3 bg-amber/5 border border-amber/20 rounded-xl px-3 py-2.5">
                <div className="text-xs font-semibold text-amber mb-1">⚠️ Focus: Close highest-rate loans first</div>
                <div className="text-xs text-muted">
                  {cp.loansHighRate.slice(0, 3).map(l => `${l.lender} @ ${l.rate}%`).join(' → ')}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        {!isBuilding && loanGroups.length > 0 && (
          <>
            <div className="flex gap-1 bg-faint border border-border rounded-xl p-1 mb-5">
              {([
                { id: 'plan', icon: Target, label: 'Your Plan' },
                { id: 'byloan', icon: Layers, label: 'By Loan' },
                { id: 'bygoal', icon: BarChart3, label: 'By Goal' },
              ] as const).map(t => (
                <button key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                    tab === t.id ? 'bg-mint text-black' : 'text-muted hover:text-text',
                  ].join(' ')}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── YOUR PLAN TAB ─────────────────────────────────────────── */}
            {tab === 'plan' && (
              <div className="space-y-3">
                <p className="text-xs text-muted mb-1">
                  Steps are ordered by impact. <span className="text-mint">Expand each step</span> to see specific options and select what works for you.
                </p>
                {planSteps.map(step => (
                  <PlanStepCard key={step.stepNum} step={step} selectedIds={selectedStrategyIds} onToggle={toggleStrategy} />
                ))}
                {planSteps.length === 0 && (
                  <div className="text-center py-8 text-muted text-sm">
                    <p>Your loan profile is already well-optimised.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── BY LOAN TAB ───────────────────────────────────────────── */}
            {tab === 'byloan' && (
              <div className="space-y-3">
                <p className="text-xs text-muted mb-1">Strategies grouped by each loan — sorted highest rate first.</p>
                {loanGroups.map(group => (
                  <LoanAccordion key={group.loanId} group={group} selectedIds={selectedStrategyIds} onToggle={toggleStrategy} />
                ))}
              </div>
            )}

            {/* ── BY GOAL TAB ───────────────────────────────────────────── */}
            {tab === 'bygoal' && (
              <div>
                {/* Goal selector */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {([
                    { id: 'reduce-emi',  icon: TrendingDown, label: 'Reduce EMI',    sub: 'Lower monthly outflow' },
                    { id: 'reduce-debt', icon: Target,       label: 'Reduce Debt',   sub: 'Minimise interest' },
                    { id: 'grow-wealth', icon: TrendingUp,   label: 'Grow Wealth',   sub: 'Invest freed funds' },
                    { id: 'consolidate', icon: Layers,       label: 'Consolidate',   sub: 'Simplify to 1 loan' },
                  ] as const).map(g => (
                    <button key={g.id}
                      onClick={() => setGoalFilter(g.id)}
                      className={[
                        'rounded-2xl border p-3 text-left transition-all',
                        goalFilter === g.id ? 'border-mint/50 bg-mint/5' : 'border-border bg-card hover:border-mint/20',
                      ].join(' ')}>
                      <g.icon className={`w-4 h-4 mb-1 ${goalFilter === g.id ? 'text-mint' : 'text-muted'}`} />
                      <div className={`text-sm font-bold ${goalFilter === g.id ? 'text-white' : 'text-text'}`}>{g.label}</div>
                      <div className="text-[10px] text-muted">{g.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Goal strategies */}
                <div className="space-y-2">
                  {goalStrats.length === 0 && (
                    <div className="text-center py-8 text-muted text-sm">No strategies match this goal.</div>
                  )}
                  {goalStrats.slice(0, 6).map(s => {
                    const isSelected = selectedStrategyIds.includes(s.id);
                    const isDisabled = !isSelected && s.conflictsWith.some(cid => selectedStrategyIds.includes(cid));
                    return (
                      <StrategyOption key={s.id} strat={s} isSelected={isSelected} isDisabled={isDisabled} onToggle={toggleStrategy} />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* No data state */}
        {!isBuilding && loanGroups.length === 0 && !isBuilding && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🎉</div>
            <p className="font-bold text-white">Your loans are already optimised</p>
            <p className="text-sm text-muted mt-1">No significant savings opportunities found.</p>
            <Button variant="ghost" size="sm" onClick={() => router.push('/bureau')} className="mt-4">
              ← Go Back
            </Button>
          </div>
        )}
      </main>

      <TallyBar selectedIds={selectedStrategyIds} allStrats={allStrats}
        onViewResults={() => {
          if (!selectedStrategyIds.length) { toast.error('Select at least one strategy first'); return; }
          router.push('/strategies/results');
        }} />
    </div>
  );
}
