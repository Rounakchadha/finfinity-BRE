'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, User, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { Stepper } from './Stepper';
import { Badge } from '@/components/ui/Badge';

export function Header() {
  const router = useRouter();
  const { auth, bureau, setChatOpen, chatOpen, logout } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const score = bureau.cibilScore;
  const scoreVariant = score >= 750 ? 'green' : score >= 650 ? 'amber' : 'red';

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2.5 flex-shrink-0"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-black font-black text-xs"
            style={{ background: 'linear-gradient(135deg, #25F0C0, #2FAB8E)' }}
          >
            F∞
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-white text-sm leading-tight">FinBRE</div>
            <div className="text-[9px] text-muted leading-tight tracking-widest uppercase">
              Finfinity
            </div>
          </div>
        </button>

        {/* Stepper — center */}
        <div className="flex-1 flex items-center justify-center overflow-x-auto">
          <div className="hidden md:block">
            <Stepper />
          </div>
          <div className="md:hidden">
            <Stepper compact />
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* CIBIL score badge */}
          {score > 0 && (
            <button
              onClick={() => router.push('/bureau')}
              className={clsx(
                'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                score >= 750
                  ? 'bg-green/10 border-green/30 text-green'
                  : score >= 650
                  ? 'bg-amber/10 border-amber/30 text-amber'
                  : 'bg-red/10 border-red/30 text-red'
              )}
            >
              <div
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  score >= 750 ? 'bg-green' : score >= 650 ? 'bg-amber' : 'bg-red'
                )}
              />
              CIBIL {score}
            </button>
          )}

          {/* Chat button */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={clsx(
              'w-9 h-9 rounded-xl border flex items-center justify-center transition-all',
              chatOpen
                ? 'bg-mint/20 border-mint/50 text-mint'
                : 'bg-faint border-border text-muted hover:border-mint/30 hover:text-mint'
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Profile */}
          {auth.isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-faint hover:border-mint/30 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-mint/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-mint" />
                </div>
                <span className="hidden sm:block text-xs font-medium text-text max-w-[80px] truncate">
                  {auth.user?.name?.split(' ')[0] || 'Me'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted" />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-card shadow-card-hover py-2 z-50"
                  onMouseLeave={() => setProfileOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-border">
                    <div className="text-sm font-semibold text-text">{auth.user?.name}</div>
                    <div className="text-xs text-muted">{auth.user?.pan}</div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      router.push('/auth');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red hover:bg-red/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
