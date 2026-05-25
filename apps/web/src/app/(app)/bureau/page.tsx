'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Loader2, RefreshCw, Home, Building2, Store, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { generateMockBureauData, formatInrShort } from '@/lib/mock-bureau';
import { Header } from '@/components/layout/Header';
import { CibilScoreRing, CibilScoreBar } from '@/components/bureau/CibilScoreRing';
import { LoanCard } from '@/components/bureau/LoanCard';
import { Button } from '@/components/ui/Button';
import { YesNoToggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';

export default function BureauPage() {
  const router = useRouter();
  const {
    auth,
    bureau,
    profile,
    setBureauLoans,
    setCibilScore,
    setBureauFetched,
    updateLoan,
    setProfile,
  } = useAppStore();

  const [loading, setLoading] = useState(!bureau.fetched);
  const [confirming, setConfirming] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
  }, [auth.isAuthenticated, router]);

  // Load bureau data
  useEffect(() => {
    if (!bureau.fetched && auth.isAuthenticated) {
      setLoading(true);
      // Simulate API fetch delay
      setTimeout(() => {
        const data = generateMockBureauData();
        setBureauLoans(data.loans);
        setCibilScore(data.cibilScore);
        setBureauFetched(true);
        setLoading(false);
        toast.success('Bureau data loaded successfully');
      }, 2000);
    } else {
      setLoading(false);
    }
  }, [auth.isAuthenticated]);

  const handleRefresh = () => {
    setBureauFetched(false);
    setLoading(true);
    setTimeout(() => {
      const data = generateMockBureauData();
      setBureauLoans(data.loans);
      setCibilScore(data.cibilScore);
      setBureauFetched(true);
      setLoading(false);
    }, 1500);
  };

  const handleConfirm = async () => {
    if (profile.ownHouse && !profile.houseValue) {
      toast.error('Please enter your property value');
      return;
    }
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 800));
    router.push('/dashboard');
  };

  const totalDebt = bureau.loans.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi = bureau.loans.reduce((s, l) => s + l.emi, 0);
  const hasHL = bureau.loans.some((l) => l.accountType === 'Home Loan');

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, #25F0C0 100%)',
                animation: 'spin 1.5s linear infinite',
              }}
            />
            <div className="absolute inset-2 rounded-full bg-black flex items-center justify-center">
              <div className="w-8 h-8 text-mint font-black text-sm">F∞</div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-text font-semibold text-lg">Fetching Bureau Data</p>
            <p className="text-muted text-sm mt-1">Connecting to CIBIL, Experian & CRIF...</p>
          </div>
          <div className="flex gap-2">
            {['CIBIL', 'Experian', 'CRIF', 'Equifax'].map((b) => (
              <span key={b} className="text-xs px-2 py-1 rounded-full border border-border text-muted animate-pulse">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-black text-white">Bureau Review</h1>
            <p className="text-muted text-sm mt-1">
              Verify and edit your loan data before we run the analysis
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </motion.div>

        {/* Score + summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border p-6 mb-6"
          style={{ background: 'rgba(12, 31, 26, 0.7)' }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score ring */}
            <div className="flex-shrink-0">
              <CibilScoreRing score={bureau.cibilScore} size={160} />
            </div>

            {/* Details */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-bold text-white">
                  {auth.user?.name?.split(' ')[0]}'s Credit Profile
                </h2>
              </div>
              <CibilScoreBar score={bureau.cibilScore} className="mb-4" />
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-faint rounded-xl p-3 text-center">
                  <div className="text-xs text-muted mb-1">Active Loans</div>
                  <div className="text-xl font-bold text-text">{bureau.loans.length}</div>
                </div>
                <div className="bg-faint rounded-xl p-3 text-center">
                  <div className="text-xs text-muted mb-1">Total Debt</div>
                  <div className="text-xl font-bold text-mint">{formatInrShort(totalDebt)}</div>
                </div>
                <div className="bg-faint rounded-xl p-3 text-center">
                  <div className="text-xs text-muted mb-1">Monthly EMI</div>
                  <div className="text-xl font-bold text-amber">{formatInrShort(totalEmi)}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loan cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
            Loan Accounts
            <span className="text-xs text-muted font-normal">
              (tap to edit if any values are incorrect)
            </span>
          </h3>
          <div className="space-y-3">
            {bureau.loans.map((loan, i) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onUpdate={(updates) => updateLoan(loan.id, updates)}
                index={i}
              />
            ))}
          </div>
        </motion.div>

        {/* Profile Questions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border p-6 mb-6"
          style={{ background: 'rgba(12, 31, 26, 0.7)' }}
        >
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-mint" />
            Property & Profile
            <span className="text-xs text-muted font-normal ml-1">— helps unlock better strategies</span>
          </h3>

          <div className="space-y-5">
            {/* Monthly Income */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-text">Monthly Net Income</div>
                <div className="text-xs text-muted">Post-tax take-home</div>
              </div>
              <div className="relative flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                <input
                  type="number"
                  value={profile.income || ''}
                  onChange={(e) => setProfile({ income: parseInt(e.target.value) || 0 })}
                  placeholder="75000"
                  className="w-36 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right"
                />
              </div>
            </div>

            {/* Own House */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-muted" />
                  Do you own a house / property?
                </div>
                <div className="text-xs text-muted">Enables LAP strategies</div>
              </div>
              <YesNoToggle
                value={profile.ownHouse}
                onChange={(v) => setProfile({ ownHouse: v })}
              />
            </div>

            {/* House value */}
            {profile.ownHouse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-between gap-4 ml-4 pl-4 border-l border-border"
              >
                <div>
                  <div className="text-sm font-medium text-text">
                    Property Market Value {hasHL && <span className="text-red text-xs ml-1">*required</span>}
                  </div>
                  <div className="text-xs text-muted">Current market value (approx.)</div>
                </div>
                <div className="relative flex-shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                  <input
                    type="number"
                    value={profile.houseValue || ''}
                    onChange={(e) => setProfile({ houseValue: parseInt(e.target.value) || 0 })}
                    placeholder="5000000"
                    className="w-40 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right"
                  />
                </div>
              </motion.div>
            )}

            {/* Shop/commercial */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-muted" />
                  Do you own a shop / commercial property?
                </div>
                <div className="text-xs text-muted">For business loan strategies</div>
              </div>
              <YesNoToggle
                value={profile.hasShop}
                onChange={(v) => setProfile({ hasShop: v })}
              />
            </div>

            {profile.hasShop && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-between gap-4 ml-4 pl-4 border-l border-border"
              >
                <div className="text-sm text-text">Shop / Commercial Property Value</div>
                <div className="relative flex-shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                  <input
                    type="number"
                    value={profile.shopValue || ''}
                    onChange={(e) => setProfile({ shopValue: parseInt(e.target.value) || 0 })}
                    placeholder="3000000"
                    className="w-40 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right"
                  />
                </div>
              </motion.div>
            )}

            {/* Other property */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-text">Any other property / land?</div>
                <div className="text-xs text-muted">Agricultural / residential / industrial</div>
              </div>
              <YesNoToggle
                value={profile.hasOtherProp}
                onChange={(v) => setProfile({ hasOtherProp: v })}
              />
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 justify-between"
        >
          <Button variant="ghost" onClick={() => router.push('/auth')}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            loading={confirming}
            onClick={handleConfirm}
          >
            Confirm & Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
