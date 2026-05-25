'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, CreditCard, RefreshCw, TrendingUp, Building2, Briefcase, ArrowRight, Lock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const PRODUCTS = [
  {
    id: 'personal-loan',
    icon: CreditCard,
    name: 'Personal Loan',
    tagline: 'Instant approval, no collateral',
    bestRate: '10.50',
    description:
      'Flexible personal loans from India\'s top lenders. Compare rates and get disbursed in 24 hours.',
    badge: 'Partner Module',
    badgeVariant: 'blue' as const,
    available: true,
    path: '/products/personal-loan',
    highlight: true,
  },
  {
    id: 'home-loan',
    icon: Home,
    name: 'Home Loan',
    tagline: 'Buy your dream home',
    bestRate: '8.40',
    description:
      'Home loans up to ₹5 Cr at the lowest rates. Tax benefits under 80C and 24(b).',
    badge: 'Popular',
    badgeVariant: 'mint' as const,
    available: true,
    path: '/products/home-loan',
  },
  {
    id: 'balance-transfer',
    icon: RefreshCw,
    name: 'Balance Transfer',
    tagline: 'Cut your interest rate',
    bestRate: '8.90',
    description:
      'Transfer your existing high-rate loans to partner lenders. Save lakhs in interest.',
    badge: 'Top Savings',
    badgeVariant: 'green' as const,
    available: true,
    path: '/strategies',
  },
  {
    id: 'top-up',
    icon: TrendingUp,
    name: 'Top-up Loan',
    tagline: 'Extra funds on existing loans',
    bestRate: '9.50',
    description:
      'Get additional funds over your existing home loan without new documentation hassle.',
    badge: null,
    badgeVariant: 'muted' as const,
    available: true,
    path: '/strategies',
  },
  {
    id: 'lap',
    icon: Building2,
    name: 'Loan Against Property',
    tagline: 'Unlock your property\'s value',
    bestRate: '9.00',
    description:
      'Use your property as collateral for large-value loans at competitive rates. Up to 70% LTV.',
    badge: 'Best Value',
    badgeVariant: 'amber' as const,
    available: true,
    path: '/products/lap',
  },
  {
    id: 'business-loan',
    icon: Briefcase,
    name: 'Business Loan',
    tagline: 'Fuel your business growth',
    bestRate: '13.00',
    description:
      'Unsecured business loans for SMEs and self-employed professionals. Quick disbursals.',
    badge: null,
    badgeVariant: 'muted' as const,
    available: true,
    path: '/products/business-loan',
  },
];

export default function ProductsPage() {
  const router = useRouter();
  const { auth, bureau } = useAppStore();

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
  }, [auth.isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-white mb-2">Loan Products</h1>
          <p className="text-muted text-sm">
            Compare and apply for the best loan products from 50+ partner lenders
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer group ${
                product.highlight
                  ? 'border-mint/40 bg-gradient-to-br from-mint/5 to-card'
                  : 'border-border bg-card'
              }`}
              onClick={() => router.push(product.path)}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: product.highlight ? 'rgba(37,240,192,0.15)' : 'rgba(14,40,32,0.8)' }}
                >
                  <product.icon
                    className={`w-5 h-5 ${product.highlight ? 'text-mint' : 'text-muted'}`}
                  />
                </div>
                {product.badge && (
                  <Badge variant={product.badgeVariant} size="sm">
                    {product.badge}
                  </Badge>
                )}
              </div>

              {/* Name + rate */}
              <div>
                <h3 className="font-bold text-white text-base mb-0.5">{product.name}</h3>
                <p className="text-xs text-muted mb-3">{product.tagline}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-muted">Best rate from</span>
                  <span
                    className="text-xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {product.bestRate}%
                  </span>
                  <span className="text-xs text-muted">p.a.</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted leading-relaxed flex-1">{product.description}</p>

              {/* CTA */}
              <button
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border group-hover:gap-3 ${
                  product.highlight
                    ? 'bg-mint text-black border-transparent shadow-mint-glow hover:brightness-110'
                    : 'bg-faint border-border text-muted hover:border-mint/30 hover:text-mint'
                }`}
              >
                Explore Offers
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-2"
        >
          <Lock className="w-3.5 h-3.5 text-teal" />
          All products go through our BRE engine for instant eligibility check before application
        </motion.div>
      </main>
    </div>
  );
}
