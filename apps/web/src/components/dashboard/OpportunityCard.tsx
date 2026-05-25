'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OpportunityCardProps {
  icon?: 'lightbulb' | 'trending-down' | 'dollar' | 'refresh';
  title: string;
  savings: string;
  reason: string;
  ctaLabel?: string;
  onCta?: () => void;
  index?: number;
}

const ICONS = {
  lightbulb: Lightbulb,
  'trending-down': TrendingDown,
  dollar: DollarSign,
  refresh: RefreshCw,
};

export function OpportunityCard({
  icon = 'lightbulb',
  title,
  savings,
  reason,
  ctaLabel = 'View Strategy',
  onCta,
  index = 0,
}: OpportunityCardProps) {
  const Icon = ICONS[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl p-5 border relative overflow-hidden group cursor-pointer card-hover"
      style={{
        background: 'linear-gradient(135deg, rgba(37,240,192,0.05) 0%, rgba(19,39,35,0.8) 100%)',
        borderColor: 'rgba(37,240,192,0.2)',
      }}
      onClick={onCta}
    >
      {/* Glow effect */}
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37,240,192,0.15) 0%, transparent 70%)',
          transform: 'translate(-30%, -30%)',
        }}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37,240,192,0.12)' }}
        >
          <Icon className="w-4 h-4 text-mint" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-text text-sm leading-snug">{title}</h4>
        </div>
      </div>

      {/* Savings */}
      <div
        className="text-2xl font-black mb-1"
        style={{
          background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {savings}
      </div>

      {/* Reason */}
      <p className="text-xs text-muted leading-relaxed mb-4">{reason}</p>

      {/* CTA */}
      <div className="flex items-center gap-1 text-xs font-semibold text-mint group-hover:gap-2 transition-all">
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </motion.div>
  );
}
