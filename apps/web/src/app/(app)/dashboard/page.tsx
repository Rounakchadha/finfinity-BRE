'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Wallet, BarChart2, ArrowRight,
  Zap, RefreshCw, CreditCard, Target, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import {
  formatInrShort,
  calcTotalDebt,
  calcMonthlyEmi,
  calcEmiRatio,
  getHighestRateLoan,
  calcWeightedAvgRate,
  calcTotalInterestPayable,
} from '@/lib/mock-bureau';
import { Header } from '@/components/layout/Header';
import { CibilScoreRing } from '@/components/bureau/CibilScoreRing';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

function MetricCard({
  label,
  value,
  sub,
  color = 'text-text',
  icon: Icon,
  variant = 'default',
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'warn' | 'danger' | 'success';
  onClick?: () => void;
}) {
  const bgMap = {
    default: 'bg-card border-border',
    warn: 'bg-amber/5 border-amber/20',
    danger: 'bg-red/5 border-red/20',
    success: 'bg-green/5 border-green/20',
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      onClick={onClick}
      className={clsx(
        'rounded-2xl border p-4 flex flex-col gap-2 transition-all',
        bgMap[variant],
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-xl bg-faint flex items-center justify-center">
            <Icon className={clsx('w-3.5 h-3.5', color)} />
          </div>
        )}
      </div>
      <div className={clsx('text-2xl font-black leading-none', color)}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { auth, bureau, profile } = useAppStore();

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
    if (!bureau.fetched) router.replace('/bureau');
  }, [auth.isAuthenticated, bureau.fetched, router]);

  const loans = bureau.loans;
  const totalDebt = calcTotalDebt(loans);
  const monthlyEmi = calcMonthlyEmi(loans);
  const emiRatio = calcEmiRatio(loans, profile.income);
  const highestRate = getHighestRateLoan(loans);
  const avgRate = calcWeightedAvgRate(loans);
  const totalInterest = calcTotalInterestPayable(loans);

  // Sort loans by rate descending
  const sortedLoans = useMemo(
    () => [...loans].sort((a, b) => b.rate - a.rate),
    [loans]
  );

  // Opportunity cards
  const opportunities = useMemo(() => {
    const ops = [];

    if (highestRate && highestRate.rate > 18) {
      const saving = Math.round(highestRate.outstanding * (highestRate.rate - 12) / 100 / 12);
      ops.push({
        icon: 'trending-down' as const,
        title: `Transfer ${highestRate.lender} loan to a lower rate`,
        savings: `Save ${formatInrShort(saving)}/month`,
        reason: `Your ${highestRate.accountType} at ${highestRate.rate}% p.a. is costing you heavily. BT to 12% could free up ${formatInrShort(saving)}/month immediately.`,
        cta: 'View BT Strategy',
        path: '/strategies',
      });
    }

    if (emiRatio > 45) {
      const targetEmi = Math.round(profile.income * 0.4);
      const reduction = monthlyEmi - targetEmi;
      ops.push({
        icon: 'lightbulb' as const,
        title: 'Consolidate loans to reduce EMI burden',
        savings: `Free ₹${Math.round(reduction / 1000)}K/month`,
        reason: `Your EMI:Income ratio is ${emiRatio}% — above the safe 40% threshold. Consolidating could bring it to 35%.`,
        cta: 'See Consolidation Plan',
        path: '/strategies',
      });
    }

    if (totalInterest > 500000) {
      ops.push({
        icon: 'dollar' as const,
        title: 'Part-prepay to slash total interest',
        savings: formatInrShort(Math.round(totalInterest * 0.3)),
        reason: `You're on track to pay ${formatInrShort(totalInterest)} in interest over your loan lifetimes. A strategic part-payment could save 30% of that.`,
        cta: 'Calculate Savings',
        path: '/strategies',
      });
    }

    if (ops.length < 2) {
      ops.push({
        icon: 'refresh' as const,
        title: 'Optimize your loan portfolio',
        savings: `Up to ${formatInrShort(Math.round(totalDebt * 0.05))}/yr`,
        reason: 'Run the strategy optimizer to discover personalized opportunities based on your complete financial profile.',
        cta: 'Run Optimizer',
        path: '/strategies',
      });
    }

    return ops.slice(0, 3);
  }, [loans, highestRate, emiRatio, totalInterest]);

  const quickActions = [
    { label: 'Reduce my EMI', icon: TrendingDown, path: '/strategies?goal=reduce-emi&tab=bygoal', color: 'text-green', sub: 'Lower monthly outflow' },
    { label: 'I need cash', icon: Wallet, path: '/strategies?goal=grow-wealth&tab=bygoal', color: 'text-blue', sub: 'Unlock property equity' },
    { label: 'Consolidate loans', icon: RefreshCw, path: '/strategies?goal=consolidate&tab=bygoal', color: 'text-purple', sub: 'Merge into 1 lower-rate loan' },
    { label: 'See my full plan', icon: Target, path: '/strategies?tab=plan', color: 'text-mint', sub: 'Step-by-step savings plan' },
  ];

  const today = new Date();

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-black text-white">
              Hello, {auth.user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {format(today, 'EEEE, d MMMM yyyy')} · Your financial snapshot
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold',
                bureau.cibilScore >= 750
                  ? 'bg-green/10 border-green/30 text-green'
                  : bureau.cibilScore >= 650
                  ? 'bg-amber/10 border-amber/30 text-amber'
                  : 'bg-red/10 border-red/30 text-red'
              )}
            >
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              CIBIL {bureau.cibilScore}
            </div>
          </div>
        </motion.div>

        {/* Hero metrics */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total Debt"
              value={formatInrShort(totalDebt)}
              sub={`${loans.length} active loans`}
              color="text-mint"
              icon={CreditCard}
            />
            <MetricCard
              label="Monthly EMI"
              value={formatInrShort(monthlyEmi)}
              sub="Across all loans"
              color="text-amber"
              icon={Wallet}
            />
            <MetricCard
              label="EMI : Income"
              value={`${emiRatio}%`}
              sub={emiRatio > 50 ? 'Critical — action needed' : emiRatio > 40 ? 'High — review needed' : 'Healthy'}
              color={emiRatio > 50 ? 'text-red' : emiRatio > 40 ? 'text-amber' : 'text-green'}
              icon={BarChart2}
              variant={emiRatio > 50 ? 'danger' : emiRatio > 40 ? 'warn' : 'success'}
              onClick={() => router.push('/strategies')}
            />
            <MetricCard
              label="Highest Rate"
              value={`${highestRate?.rate ?? 0}%`}
              sub={highestRate?.lender || '—'}
              color="text-red"
              icon={TrendingUp}
              variant={highestRate && highestRate.rate > 20 ? 'danger' : 'default'}
              onClick={() => router.push('/strategies')}
            />
          </div>
        </motion.section>

        {/* CIBIL + Loan Portfolio */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* CIBIL Score */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 rounded-2xl border border-border p-6 flex flex-col items-center"
            style={{ background: 'rgba(12, 31, 26, 0.7)' }}
          >
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 self-start">
              Credit Score
            </h2>
            <CibilScoreRing score={bureau.cibilScore} size={180} />
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Weighted Avg Rate</span>
                <span className="text-amber font-semibold">{avgRate}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Total Interest Payable</span>
                <span className="text-red font-semibold">{formatInrShort(totalInterest)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Active Accounts</span>
                <span className="text-text font-semibold">{loans.length}</span>
              </div>
            </div>

            {bureau.cibilScore < 700 && (
              <div className="mt-4 w-full flex items-start gap-2 bg-amber/10 border border-amber/20 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-amber mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber/80">
                  Score below 700 may limit product eligibility. Reduce DPD accounts first.
                </p>
              </div>
            )}
          </motion.div>

          {/* Loan Portfolio */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 rounded-2xl border border-border overflow-hidden"
            style={{ background: 'rgba(12, 31, 26, 0.7)' }}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                Loan Portfolio
              </h2>
              <span className="text-xs text-muted">Ranked by rate (highest first)</span>
            </div>
            <div className="divide-y divide-border">
              {sortedLoans.map((loan, i) => {
                const rateColor =
                  loan.rate > 20 ? 'text-red' : loan.rate > 14 ? 'text-amber' : 'text-green';
                const totalMonths = loan.closureMonths;
                const yearsLeft = Math.floor(totalMonths / 12);
                const monthsLeft = totalMonths % 12;

                return (
                  <motion.div
                    key={loan.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-faint/50 transition-colors"
                  >
                    {/* Rank */}
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-muted bg-faint flex-shrink-0">
                      {i + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text truncate">
                        {loan.lender}
                        <span className="text-muted font-normal ml-1.5 text-xs">
                          {loan.accountType}
                        </span>
                      </div>
                      <div className="text-xs text-muted">
                        {yearsLeft > 0 ? `${yearsLeft}y ` : ''}{monthsLeft}m remaining
                      </div>
                    </div>

                    {/* Rate */}
                    <div className="text-right flex-shrink-0">
                      <div className={clsx('text-sm font-bold', rateColor)}>{loan.rate}%</div>
                      <div className="text-[10px] text-muted">p.a.</div>
                    </div>

                    {/* OS */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <div className="text-sm font-medium text-mint">{formatInrShort(loan.outstanding)}</div>
                      <div className="text-[10px] text-muted">outstanding</div>
                    </div>

                    {/* EMI */}
                    <div className="text-right flex-shrink-0 hidden md:block">
                      <div className="text-sm font-medium text-text">{formatInrShort(loan.emi)}</div>
                      <div className="text-[10px] text-muted">EMI</div>
                    </div>

                    {loan.rate > 20 && (
                      <Badge variant="red" size="sm" dot>High</Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* AI Opportunity Cards */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-mint" />
              AI Opportunities
            </h2>
            <Badge variant="mint" dot>
              {opportunities.length} found
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((op, i) => (
              <OpportunityCard
                key={i}
                icon={op.icon}
                title={op.title}
                savings={op.savings}
                reason={op.reason}
                ctaLabel={op.cta}
                onCta={() => router.push(op.path)}
                index={i}
              />
            ))}
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(action.path)}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col items-start gap-3 hover:border-mint/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-faint flex items-center justify-center group-hover:bg-mint/10 transition-colors">
                  <action.icon className={clsx('w-4 h-4', action.color)} />
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text leading-snug">{action.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-mint transition-colors" />
                  </div>
                  {'sub' in action && <p className="text-[10px] text-muted mt-0.5 leading-tight">{(action as any).sub}</p>}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl p-6 flex items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(37,240,192,0.08) 0%, rgba(47,171,142,0.06) 100%)',
            border: '1px solid rgba(37,240,192,0.2)',
          }}
        >
          <div>
            <h3 className="font-bold text-white text-lg">Ready to save lakhs?</h3>
            <p className="text-sm text-muted mt-0.5">
              Our strategy engine has found {opportunities.length} opportunities for you
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/strategies')}
            className="flex-shrink-0"
          >
            See All Strategies
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
