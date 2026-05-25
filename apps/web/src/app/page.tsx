'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: Shield,
    title: 'Bureau Intelligence',
    desc: 'Instant CIBIL analysis with actionable insights',
  },
  {
    icon: Zap,
    title: 'Real-time BRE',
    desc: 'Lightning-fast loan eligibility across 50+ lenders',
  },
  {
    icon: TrendingUp,
    title: 'Wealth Optimizer',
    desc: 'AI-driven debt reduction + wealth creation plans',
  },
  {
    icon: BarChart3,
    title: 'Strategy Engine',
    desc: 'Balance transfers, top-ups & debt consolidation',
  },
];

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <main className="min-h-screen bg-black flex flex-col overflow-hidden relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(ellipse at center, #25F0C0 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[400px] opacity-5"
          style={{
            background: 'radial-gradient(ellipse at bottom-right, #2FAB8E 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Header */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)' }}
          >
            F∞
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-tight">FinBRE</div>
            <div className="text-[10px] text-muted leading-tight tracking-widest uppercase">
              by Finfinity
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Button variant="ghost" size="sm" onClick={() => router.push('/auth')}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={() => router.push('/auth')}>
            Get Started
          </Button>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium mb-8"
          style={{
            borderColor: 'rgba(37, 240, 192, 0.3)',
            background: 'rgba(37, 240, 192, 0.05)',
            color: '#25F0C0',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
          India's Most Intelligent Loan Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight max-w-4xl"
        >
          Your Debt.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Optimized.
          </span>
          <br />
          Your Wealth.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #2FAB8E, #25F0C0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Unleashed.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-muted max-w-2xl mb-10 leading-relaxed"
        >
          Finfinity BRE analyzes your entire loan portfolio in seconds — then shows you
          exactly how to reduce your EMI, save lakhs in interest, and start building real
          wealth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/auth')}
            className="group"
          >
            Analyze My Portfolio
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push('/auth')}>
            See a Demo
          </Button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16"
        >
          {[
            { value: '₹2.4 Cr', label: 'Avg Interest Saved' },
            { value: '50+', label: 'Partner Lenders' },
            { value: '< 30s', label: 'BRE Analysis Time' },
            { value: '94%', label: 'Approval Accuracy' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="text-center"
            >
              <div className="text-2xl md:text-3xl font-black" style={{ color: '#25F0C0' }}>
                {stat.value}
              </div>
              <div className="text-xs text-muted mt-1 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="rounded-2xl p-5 border card-hover"
              style={{
                background: 'rgba(19, 39, 35, 0.6)',
                borderColor: '#1e3d34',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(37, 240, 192, 0.1)' }}
              >
                <f.icon className="w-5 h-5" style={{ color: '#25F0C0' }} />
              </div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-6 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="rounded-3xl p-10 mx-auto max-w-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(37,240,192,0.08) 0%, rgba(47,171,142,0.08) 100%)',
            border: '1px solid rgba(37,240,192,0.2)',
          }}
        >
          <h2 className="text-3xl font-black text-white mb-3">
            Ready to free up{' '}
            <span style={{ color: '#25F0C0' }}>₹20,000/month?</span>
          </h2>
          <p className="text-muted mb-6">
            Enter your PAN. We'll pull your bureau data and show you the path in 30 seconds.
          </p>
          <Button variant="primary" size="lg" onClick={() => router.push('/auth')}>
            Start Free Analysis
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </section>
    </main>
  );
}
