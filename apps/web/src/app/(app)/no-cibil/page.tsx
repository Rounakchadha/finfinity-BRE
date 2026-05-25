'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles, ChevronRight, ChevronLeft, Briefcase, TrendingUp,
  CheckCircle2, Calendar, Star, ArrowRight, Shield, CreditCard,
  Building2, Users,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MultiToggle } from '@/components/ui/Toggle';
import { clsx } from 'clsx';
import { formatInrShort } from '@/lib/mock-bureau';

type Employment = 'salaried' | 'self-employed' | 'business' | '';

interface FreshProfile {
  employment: Employment;
  income: number;
  yearsEmployed: number;
  purpose: string;
}

const FRESH_PRODUCTS = [
  {
    name: 'Salary Advance Loan',
    icon: '💼',
    amount: '₹25K – ₹2L',
    rate: '14–18%',
    badge: 'Best for Salaried',
    badgeVariant: 'green' as const,
    requirements: ['Min 6 months employed', '15K+ salary', 'Valid ID'],
    available: true,
  },
  {
    name: 'Secured Credit Card',
    icon: '💳',
    amount: 'FD-backed',
    rate: '24–36% revolving',
    badge: 'Best Start',
    badgeVariant: 'mint' as const,
    requirements: ['Fixed deposit (min ₹10K)', 'Age 18+', 'Valid ID + PAN'],
    available: true,
  },
  {
    name: 'Consumer Durable Loan',
    icon: '📱',
    amount: '₹5K – ₹1L',
    rate: '0–24% EMI',
    badge: 'Easy Approval',
    badgeVariant: 'blue' as const,
    requirements: ['Min income ₹10K/mo', 'NACH mandate', 'GST number (self-employed)'],
    available: true,
  },
  {
    name: 'Gold Loan',
    icon: '🪙',
    amount: 'Up to ₹50L',
    rate: '8–12%',
    badge: 'No CIBIL needed',
    badgeVariant: 'amber' as const,
    requirements: ['Gold ornaments/coins', 'Min 18 carats', 'ID proof'],
    available: true,
  },
];

const ROADMAP_STEPS = [
  {
    month: 'Month 1–2',
    icon: CreditCard,
    title: 'Get a Secured Credit Card',
    desc: 'Open an FD for ₹10K–₹25K and get a credit card against it. Use it for groceries only.',
    impact: 'Establishes credit history',
    color: 'text-mint',
  },
  {
    month: 'Month 2–3',
    icon: TrendingUp,
    title: 'Use 10–20% of credit limit',
    desc: 'Spend max ₹2,000–₹5,000/month on card. Pay FULL bill each month — never minimum.',
    impact: 'Builds repayment track record',
    color: 'text-green',
  },
  {
    month: 'Month 3–4',
    icon: Building2,
    title: 'Take a small consumer durable loan',
    desc: 'Purchase a phone/appliance via no-cost EMI. This adds a new credit type (installment loan).',
    impact: 'Diversifies credit mix',
    color: 'text-blue',
  },
  {
    month: 'Month 5',
    icon: CheckCircle2,
    title: 'Check your CIBIL score',
    desc: 'Request free CIBIL report. You should see a score between 650–700 now.',
    impact: 'Score typically appears at 650–700',
    color: 'text-amber',
  },
  {
    month: 'Month 6',
    icon: Star,
    title: 'Apply for entry-level personal loan',
    desc: 'With 5–6 months history, apply for a small ₹50K–₹1L personal loan at competitive rates.',
    impact: 'Access mainstream credit',
    color: 'text-purple',
  },
  {
    month: 'Month 12+',
    icon: Sparkles,
    title: 'Graduate to premium products',
    desc: 'With consistent repayment, your score crosses 700+ and all mainstream products open up.',
    impact: 'CIBIL 700+ unlocks best rates',
    color: 'text-mint',
  },
];

export default function NoCibilPage() {
  const router = useRouter();
  const { setProfile } = useAppStore();

  const [freshProfile, setFreshProfile] = useState<FreshProfile>({
    employment: '',
    income: 0,
    yearsEmployed: 0,
    purpose: '',
  });

  const [step, setStep] = useState(0);

  const updateProfile = (key: keyof FreshProfile, val: FreshProfile[keyof FreshProfile]) => {
    setFreshProfile((prev) => ({ ...prev, [key]: val }));
  };

  const handleComplete = () => {
    setProfile({
      employment: freshProfile.employment as 'salaried' | 'self-employed' | 'business' | '',
      income: freshProfile.income,
    });
    setStep(1);
  };

  const purposes = ['Home Purchase', 'Business', 'Education', 'Emergency', 'Vehicle', 'Other'];

  // Historical insight
  const insight = {
    amount: freshProfile.employment === 'business' ? '5L' : freshProfile.income > 50000 ? '3L' : '1.5L',
    rate: freshProfile.employment === 'salaried' ? '14' : '16',
    approval: freshProfile.employment === 'salaried' ? '78' : '65',
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Reassuring header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(37,240,192,0.1)', border: '1px solid rgba(37,240,192,0.2)' }}
          >
            <Sparkles className="w-8 h-8 text-mint" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            No credit history?{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              No problem.
            </span>
          </h1>
          <p className="text-muted leading-relaxed max-w-lg mx-auto">
            Everyone starts somewhere. We'll find you the right products to build your credit profile
            and get you to a 750+ CIBIL score in 12 months.
          </p>
        </motion.div>

        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="rounded-2xl border border-border p-6 mb-6"
              style={{ background: 'rgba(12, 31, 26, 0.7)' }}>
              <h2 className="font-bold text-white mb-5">Tell us about yourself</h2>

              <div className="space-y-5">
                {/* Employment */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Employment Type</label>
                  <MultiToggle
                    options={[
                      { value: 'salaried', label: 'Salaried', color: 'green' },
                      { value: 'self-employed', label: 'Self-Employed', color: 'blue' },
                      { value: 'business', label: 'Business Owner', color: 'purple' },
                    ]}
                    value={freshProfile.employment}
                    onChange={(v) => updateProfile('employment', v as Employment)}
                  />
                </div>

                {/* Income */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Monthly Income</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                    <input
                      type="number"
                      value={freshProfile.income || ''}
                      onChange={(e) => updateProfile('income', parseInt(e.target.value) || 0)}
                      placeholder="30000"
                      className="w-full bg-faint border border-border rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:border-mint/50"
                    />
                  </div>
                </div>

                {/* Years employed */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">
                    Years in current employment/business
                  </label>
                  <MultiToggle
                    options={[
                      { value: 0, label: '< 6 months' },
                      { value: 1, label: '6m–1yr' },
                      { value: 2, label: '1–2 years', color: 'mint' },
                      { value: 3, label: '2+ years', color: 'green' },
                    ]}
                    value={freshProfile.yearsEmployed}
                    onChange={(v) => updateProfile('yearsEmployed', v as number)}
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Loan Purpose</label>
                  <div className="flex flex-wrap gap-2">
                    {purposes.map((p) => (
                      <button
                        key={p}
                        onClick={() => updateProfile('purpose', p)}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                          freshProfile.purpose === p
                            ? 'bg-mint/15 border-mint/50 text-mint'
                            : 'bg-faint border-border text-muted hover:border-mint/30'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Historical insight */}
            {freshProfile.employment && freshProfile.income > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-mint/20 p-5 mb-6"
                style={{ background: 'linear-gradient(135deg, rgba(37,240,192,0.05) 0%, rgba(12,31,26,0.8) 100%)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-mint" />
                  <span className="text-sm font-semibold text-text">Historical Insight</span>
                  <Badge variant="mint" size="sm">Based on 50K+ profiles</Badge>
                </div>
                <p className="text-sm text-muted mb-3">
                  People similar to you ({freshProfile.employment},{' '}
                  {formatInrShort(freshProfile.income)}/month) got:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-faint rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-mint">₹{insight.amount}</div>
                    <div className="text-xs text-muted">Avg. approved amount</div>
                  </div>
                  <div className="bg-faint rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-amber">{insight.rate}%</div>
                    <div className="text-xs text-muted">Avg. interest rate</div>
                  </div>
                  <div className="bg-faint rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-green">{insight.approval}%</div>
                    <div className="text-xs text-muted">Approval rate</div>
                  </div>
                </div>
              </motion.div>
            )}

            <Button
              variant="primary"
              size="full"
              onClick={handleComplete}
              disabled={!freshProfile.employment || !freshProfile.income}
            >
              See My Options
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Available products */}
            <div>
              <h2 className="font-bold text-white mb-1">Products Available For You</h2>
              <p className="text-xs text-muted mb-4">These don't require prior credit history</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FRESH_PRODUCTS.map((p, i) => (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl border border-border bg-card p-4 hover:border-mint/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-2xl">{p.icon}</div>
                      <Badge variant={p.badgeVariant} size="sm">{p.badge}</Badge>
                    </div>
                    <h3 className="font-semibold text-text mb-0.5">{p.name}</h3>
                    <div className="flex gap-4 text-xs text-muted mb-3">
                      <span>{p.amount}</span>
                      <span>·</span>
                      <span>{p.rate}</span>
                    </div>
                    <div className="space-y-1">
                      {p.requirements.map((r) => (
                        <div key={r} className="flex items-center gap-1.5 text-xs text-muted">
                          <CheckCircle2 className="w-3 h-3 text-green flex-shrink-0" />
                          {r}
                        </div>
                      ))}
                    </div>
                    <button className="mt-3 w-full py-2 rounded-xl border border-mint/20 text-mint text-xs font-semibold hover:bg-mint/5 transition-all group-hover:border-mint/50">
                      Apply Now
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Credit building roadmap */}
            <div>
              <h2 className="font-bold text-white mb-1">6-Month Credit Building Roadmap</h2>
              <p className="text-xs text-muted mb-5">Follow this exact plan to reach CIBIL 700+ in 6 months</p>

              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-4">
                  {ROADMAP_STEPS.map((step, i) => (
                    <motion.div
                      key={step.month}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-start gap-4 relative"
                    >
                      <div
                        className="w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 relative z-10"
                        style={{ background: '#0c1f1a', borderColor: '#1e3d34' }}
                      >
                        <step.icon className={clsx('w-4 h-4', step.color)} />
                      </div>
                      <div className="flex-1 rounded-2xl border border-border bg-card p-4 mb-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-mint">{step.month}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-faint text-muted border border-border">
                            {step.impact}
                          </span>
                        </div>
                        <h3 className="font-semibold text-text text-sm mb-1">{step.title}</h3>
                        <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div
              className="rounded-3xl p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(37,240,192,0.08), rgba(12,31,26,0.9))',
                border: '1px solid rgba(37,240,192,0.2)',
              }}
            >
              <Shield className="w-8 h-8 text-mint mx-auto mb-3" />
              <h3 className="font-bold text-white mb-2">Track Your Progress</h3>
              <p className="text-xs text-muted mb-4">
                We'll monitor your credit building journey and notify you when you're eligible for better products.
              </p>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Set Up Credit Tracking
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to questionnaire
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
