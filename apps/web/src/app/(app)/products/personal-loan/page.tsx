'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Package, CreditCard, CheckCircle2,
  Info, ExternalLink, Star, Zap, Shield,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatInrShort } from '@/lib/mock-bureau';
import { clsx } from 'clsx';

type PLStep = 'input' | 'compare' | 'apply';

const LENDER_OFFERS = [
  {
    lender: 'Bajaj Finserv',
    logo: '🏦',
    rate: 11.0,
    maxAmount: 3500000,
    tenure: '60 months',
    processingFee: '1.5%',
    approvalTime: '2 hours',
    features: ['Instant approval', 'No collateral', 'Flexi EMI'],
    recommended: true,
  },
  {
    lender: 'HDFC Bank',
    logo: '🏛️',
    rate: 10.5,
    maxAmount: 4000000,
    tenure: '60 months',
    processingFee: '2%',
    approvalTime: '24 hours',
    features: ['Salary account benefit', 'Free insurance', 'Online process'],
    recommended: false,
  },
  {
    lender: 'ICICI Bank',
    logo: '🏢',
    rate: 10.85,
    maxAmount: 2500000,
    tenure: '72 months',
    processingFee: '1.5%',
    approvalTime: '4 hours',
    features: ['Pre-approved offer', 'Digital disbursal', '72-month tenure'],
    recommended: false,
  },
  {
    lender: 'Tata Capital',
    logo: '⚡',
    rate: 12.0,
    maxAmount: 2000000,
    tenure: '60 months',
    processingFee: '2.5%',
    approvalTime: '48 hours',
    features: ['Flexible EMI', 'Part payment allowed', 'Easy documentation'],
    recommended: false,
  },
];

function calcEmi(principal: number, rate: number, months: number): number {
  const r = rate / 100 / 12;
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

export default function PersonalLoanPage() {
  const router = useRouter();
  const { auth, profile, bureau } = useAppStore();

  const [step, setStep] = useState<PLStep>('input');
  const [income, setIncome] = useState(profile.income || 0);
  const [amount, setAmount] = useState(500000);
  const [purpose, setPurpose] = useState('');
  const [tenure, setTenure] = useState(36);
  const [selectedLender, setSelectedLender] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const maxEligible = Math.min(Math.round(income * 24), 4000000);

  const handleCompare = () => {
    if (!income || !amount || !purpose) return;
    setStep('compare');
  };

  const handleApply = async (lender: string) => {
    setSelectedLender(lender);
    setApplying(true);
    await new Promise((r) => setTimeout(r, 2000));
    setApplying(false);
    setApplied(true);
    setStep('apply');
  };

  const purposes = [
    'Wedding', 'Medical Emergency', 'Home Renovation', 'Travel',
    'Education', 'Business', 'Debt Consolidation', 'Other',
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Partner module header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.back()}
              className="text-muted hover:text-text transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(37,240,192,0.1)' }}
            >
              <CreditCard className="w-4 h-4 text-mint" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Personal Loan</h1>
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">Partner Module</Badge>
                <span className="text-xs text-muted">Powered by Finfinity BRE</span>
              </div>
            </div>
          </div>

          {/* Module info banner */}
          <div className="rounded-2xl border border-blue/20 bg-blue/5 p-4 flex items-start gap-3">
            <Package className="w-5 h-5 text-blue mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-blue text-sm mb-0.5">Partner Integration Module</div>
              <p className="text-xs text-muted leading-relaxed">
                This module accepts:{' '}
                <code className="bg-faint px-1 rounded text-blue/80">income</code>,{' '}
                <code className="bg-faint px-1 rounded text-blue/80">loan_amount</code>,{' '}
                <code className="bg-faint px-1 rounded text-blue/80">tenure</code>,{' '}
                <code className="bg-faint px-1 rounded text-blue/80">purpose</code>,{' '}
                <code className="bg-faint px-1 rounded text-blue/80">cibil_score</code>
                {' '}and returns a lender comparison table with rates and eligibility.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: 'input', label: 'Your Details' },
            { key: 'compare', label: 'Compare Offers' },
            { key: 'apply', label: 'Apply' },
          ].map((s, i) => {
            const steps = ['input', 'compare', 'apply'];
            const current = steps.indexOf(step);
            const idx = steps.indexOf(s.key);
            const done = current > idx;
            const active = current === idx;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    done ? 'bg-mint text-black' : active ? 'bg-mint/20 border border-mint text-mint' : 'bg-faint border border-border text-muted'
                  )}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={clsx('text-xs font-medium', active ? 'text-mint' : done ? 'text-teal' : 'text-muted')}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={clsx('w-8 h-0.5 rounded-full', done ? 'bg-mint' : 'bg-border')} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Input ──────────────────────────────────────────────── */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-border p-6 space-y-5"
                style={{ background: 'rgba(12, 31, 26, 0.7)' }}>

                {/* Income */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                    Monthly Net Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                    <input
                      type="number"
                      value={income || ''}
                      onChange={(e) => setIncome(parseInt(e.target.value) || 0)}
                      placeholder="75000"
                      className="w-full bg-faint border border-border rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:border-mint/50"
                    />
                  </div>
                  {income > 0 && (
                    <p className="text-xs text-muted mt-1">
                      Max eligible: <span className="text-mint font-semibold">{formatInrShort(maxEligible)}</span>
                    </p>
                  )}
                </div>

                {/* Loan amount */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                    Loan Amount Required
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                    <input
                      type="number"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                      placeholder="500000"
                      className="w-full bg-faint border border-border rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:border-mint/50"
                    />
                  </div>
                  {/* Slider */}
                  <input
                    type="range"
                    min={50000}
                    max={maxEligible || 4000000}
                    step={50000}
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="w-full mt-2 accent-mint"
                  />
                  <div className="flex justify-between text-xs text-muted">
                    <span>₹50K</span>
                    <span>{formatInrShort(maxEligible || 4000000)}</span>
                  </div>
                </div>

                {/* Tenure */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                    Tenure: {tenure} months ({Math.round(tenure / 12 * 10) / 10} years)
                  </label>
                  <div className="flex gap-2">
                    {[12, 24, 36, 48, 60].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTenure(t)}
                        className={clsx(
                          'flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                          tenure === t
                            ? 'bg-mint/15 border-mint/50 text-mint'
                            : 'bg-faint border-border text-muted hover:border-mint/30'
                        )}
                      >
                        {t}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                    Purpose
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {purposes.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPurpose(p)}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                          purpose === p
                            ? 'bg-mint/15 border-mint/50 text-mint'
                            : 'bg-faint border-border text-muted hover:border-mint/30'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CIBIL score display */}
                <div className="flex items-center justify-between bg-faint rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted" />
                    <span className="text-xs text-muted">CIBIL Score</span>
                  </div>
                  <span className={clsx('text-sm font-bold',
                    bureau.cibilScore >= 750 ? 'text-green' : bureau.cibilScore >= 650 ? 'text-amber' : 'text-red'
                  )}>
                    {bureau.cibilScore}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="full"
                onClick={handleCompare}
                disabled={!income || !amount || !purpose}
              >
                Compare Offers
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: Compare ────────────────────────────────────────────── */}
          {step === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-sm text-muted mb-2">
                For ₹{amount.toLocaleString('en-IN')} over {tenure} months · CIBIL {bureau.cibilScore}
              </div>

              {LENDER_OFFERS.filter((l) => l.maxAmount >= amount).map((offer, i) => {
                const emi = calcEmi(amount, offer.rate, tenure);
                const totalPayable = emi * tenure;
                const totalInterest = totalPayable - amount;

                return (
                  <motion.div
                    key={offer.lender}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={clsx(
                      'rounded-2xl border p-5 transition-all',
                      offer.recommended
                        ? 'border-mint/40 bg-gradient-to-br from-mint/5 to-card'
                        : 'border-border bg-card'
                    )}
                  >
                    {offer.recommended && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Star className="w-3.5 h-3.5 text-mint" />
                        <span className="text-xs font-semibold text-mint">Finfinity Recommended</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{offer.logo}</span>
                        <div>
                          <div className="font-bold text-text">{offer.lender}</div>
                          <div className="text-xs text-muted">{offer.approvalTime} approval</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-mint">{offer.rate}%</div>
                        <div className="text-xs text-muted">p.a.</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-faint rounded-xl p-2.5 text-center">
                        <div className="text-xs text-muted mb-0.5">Monthly EMI</div>
                        <div className="text-sm font-bold text-text">₹{emi.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-faint rounded-xl p-2.5 text-center">
                        <div className="text-xs text-muted mb-0.5">Total Interest</div>
                        <div className="text-sm font-bold text-amber">₹{(totalInterest / 1000).toFixed(0)}K</div>
                      </div>
                      <div className="bg-faint rounded-xl p-2.5 text-center">
                        <div className="text-xs text-muted mb-0.5">Processing Fee</div>
                        <div className="text-sm font-bold text-text">{offer.processingFee}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {offer.features.map((f) => (
                        <div key={f} className="flex items-center gap-1 text-xs text-muted bg-faint px-2 py-1 rounded-full border border-border">
                          <CheckCircle2 className="w-3 h-3 text-green" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={offer.recommended ? 'primary' : 'outline'}
                      size="full"
                      loading={applying && selectedLender === offer.lender}
                      onClick={() => handleApply(offer.lender)}
                    >
                      Apply with {offer.lender}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                );
              })}

              <button
                onClick={() => setStep('input')}
                className="text-sm text-muted hover:text-text transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Change details
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Applied ────────────────────────────────────────────── */}
          {step === 'apply' && (
            <motion.div
              key="apply"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full bg-mint/15 border-2 border-mint flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-mint" />
              </motion.div>

              <h2 className="text-2xl font-black text-white mb-2">Application Submitted!</h2>
              <p className="text-muted mb-1">Your personal loan application has been sent to</p>
              <p className="text-lg font-bold text-mint mb-6">{selectedLender}</p>

              <div className="rounded-2xl border border-border bg-card p-5 text-left mb-6">
                <div className="space-y-3">
                  {[
                    { label: 'Loan Amount', value: formatInrShort(amount) },
                    { label: 'Tenure', value: `${tenure} months` },
                    { label: 'Expected Rate', value: `${LENDER_OFFERS.find((l) => l.lender === selectedLender)?.rate}% p.a.` },
                    { label: 'Reference ID', value: `PL${Date.now().toString().slice(-8)}` },
                    { label: 'Next Step', value: 'KYC verification via video call' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted">{item.label}</span>
                      <span className="font-medium text-text">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button variant="primary" onClick={() => router.push('/strategies')}>
                  See More Strategies
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
