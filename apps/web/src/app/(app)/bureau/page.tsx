'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, RefreshCw, Home, Building2, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { generateMockBureauData, formatInrShort } from '@/lib/mock-bureau';
import { Header } from '@/components/layout/Header';
import { CibilScoreRing, CibilScoreBar } from '@/components/bureau/CibilScoreRing';
import { Button } from '@/components/ui/Button';
import { YesNoToggle } from '@/components/ui/Toggle';

// ─── Loan type icons ───────────────────────────────────────────────────────────
const LOAN_ICONS: Record<string, string> = {
  'Home Loan': '🏠', 'Personal Loan': '💼', 'Auto Loan': '🚗', 'Car Loan': '🚗',
  'Business Loan': '🏢', 'SME Loan': '🏭', 'Education Loan': '🎓',
  'Credit Card': '💳', 'Consumer Durable': '📦',
};

// ─── Read-only loan card (no editable fields per requirement) ─────────────────
function LoanCard({ loan, index }: { loan: ReturnType<typeof useAppStore.getState>['bureau']['loans'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const icon = LOAN_ICONS[loan.accountType] ?? '📋';
  const isHighRate = loan.rate > 18;
  const isDpd = loan.dpd > 0;

  // Generate mock tenure dates based on closureMonths
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth() + loan.closureMonths, 1);
  const totalTenureMonths = Math.round(loan.closureMonths / (1 - loan.outstanding / Math.max(loan.sanctionAmount, 1)));
  const startDate = new Date(today.getFullYear(), today.getMonth() - (isNaN(totalTenureMonths) ? 24 : totalTenureMonths) + loan.closureMonths, 1);

  function fmtDate(d: Date) {
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={[
        'rounded-2xl border overflow-hidden transition-all',
        isDpd ? 'border-red/40 bg-red/5' : 'border-border bg-card',
      ].join(' ')}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{loan.lender}</span>
            <span className="text-xs text-muted">{loan.accountType}</span>
            {isDpd && (
              <span className="text-[10px] bg-red/15 text-red border border-red/30 px-1.5 py-0.5 rounded-md font-bold">
                ⚠️ DPD {loan.dpd}
              </span>
            )}
            {isHighRate && !isDpd && (
              <span className="text-[10px] bg-amber/10 text-amber border border-amber/30 px-1.5 py-0.5 rounded-md font-bold">
                High Rate
              </span>
            )}
          </div>
          <div className="text-xs text-muted mt-0.5">{loan.accountNumber}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-amber">{loan.rate}% p.a.</div>
          <div className="text-xs text-muted">{formatInrShort(loan.emi)}/mo</div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted hover:text-text ml-1 p-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 border-t border-border/50">
        <div className="px-4 py-2 text-center border-r border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wide">Outstanding</div>
          <div className="text-sm font-bold text-red/80">{formatInrShort(loan.outstanding)}</div>
        </div>
        <div className="px-4 py-2 text-center border-r border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wide">Sanction</div>
          <div className="text-sm font-bold text-text">{formatInrShort(loan.sanctionAmount)}</div>
        </div>
        <div className="px-4 py-2 text-center">
          <div className="text-[10px] text-muted uppercase tracking-wide">Tenure Left</div>
          <div className="text-sm font-bold text-mint">{loan.closureMonths} mo</div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-border/50 px-4 py-3 grid grid-cols-2 gap-3"
        >
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Loan Start</div>
            <div className="text-xs font-medium text-text">{fmtDate(startDate)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Loan End</div>
            <div className="text-xs font-medium text-text">{fmtDate(endDate)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Monthly EMI</div>
            <div className="text-xs font-medium text-mint">{formatInrShort(loan.emi)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Rate</div>
            <div className="text-xs font-medium text-amber">{loan.rate}% per annum</div>
          </div>
          {isDpd && (
            <div className="col-span-2 bg-red/10 border border-red/20 rounded-xl px-3 py-2 text-xs text-red flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>This account has Days Past Due ({loan.dpd} days). This may affect your BT eligibility. Contact lender to resolve.</span>
            </div>
          )}
          <div className="col-span-2">
            <div className="flex items-center gap-1 text-[10px] text-muted">
              <Info className="w-3 h-3" />
              Data sourced from CIBIL bureau. Contact your lender if any value is incorrect.
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function BureauPage() {
  const router = useRouter();
  const { auth, bureau, profile, setBureauLoans, setCibilScore, setBureauFetched, setProfile } = useAppStore();
  const [loading, setLoading] = useState(!bureau.fetched);

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/auth');
  }, [auth.isAuthenticated, router]);

  // Fresh bureau fetch — reset property values for every new session
  useEffect(() => {
    if (!bureau.fetched && auth.isAuthenticated) {
      setLoading(true);
      // Reset property values for fresh session
      setProfile({ ownHouse: null, houseValue: 0, hasShop: null, shopValue: 0, hasOtherProp: null, otherPropValue: 0 });
      setTimeout(() => {
        const data = generateMockBureauData();
        setBureauLoans(data.loans);
        setCibilScore(data.cibilScore);
        setBureauFetched(true);
        setLoading(false);
      }, 2200);
    } else {
      setLoading(false);
    }
  }, [auth.isAuthenticated]);

  const handleRefresh = () => {
    setBureauFetched(false);
    setLoading(true);
    setProfile({ ownHouse: null, houseValue: 0, hasShop: null, shopValue: 0 });
    setTimeout(() => {
      const data = generateMockBureauData();
      setBureauLoans(data.loans);
      setCibilScore(data.cibilScore);
      setBureauFetched(true);
      setLoading(false);
    }, 1500);
  };

  const handleConfirm = () => {
    const hasHL = bureau.loans.some(l => l.accountType === 'Home Loan');
    const hasLAP = bureau.loans.some(l => l.accountType === 'LAP');
    // Property value required if HL or LAP exists
    if ((hasHL || hasLAP) && !profile.houseValue) {
      toast.error('Please enter your property value — required for top-up eligibility');
      return;
    }
    // If they said they own property, need the value
    if (profile.ownHouse && !profile.houseValue) {
      toast.error('Please enter your property market value');
      return;
    }
    router.push('/dashboard');
  };

  const totalDebt = bureau.loans.reduce((s, l) => s + l.outstanding, 0);
  const totalEmi = bureau.loans.reduce((s, l) => s + l.emi, 0);
  const hasHL = bureau.loans.some(l => l.accountType === 'Home Loan');
  const hasLAP = bureau.loans.some(l => l.accountType === 'LAP');
  const highestRate = bureau.loans.length > 0 ? Math.max(...bureau.loans.map(l => l.rate)) : 0;

  // ─── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-faint" />
            <div className="absolute inset-0 rounded-full border-4 border-t-mint border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-black flex items-center justify-center text-mint font-black text-sm">F∞</div>
          </div>
          <div className="text-center">
            <p className="text-text font-semibold text-lg">Fetching Bureau Data</p>
            <p className="text-muted text-sm mt-1">Connecting to CIBIL, Experian & CRIF...</p>
          </div>
          <div className="flex gap-2">
            {['CIBIL', 'Experian', 'CRIF', 'Equifax'].map(b => (
              <span key={b} className="text-xs px-2 py-1 rounded-full border border-border text-muted animate-pulse">{b}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-10">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/auth')} className="text-muted hover:text-text transition-colors p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Bureau Review</h1>
            <p className="text-sm text-muted">Verify your credit profile before we run the analysis</p>
          </div>
          <button onClick={handleRefresh} className="text-muted hover:text-mint transition-colors p-2 rounded-xl hover:bg-faint">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Score card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border p-5 mb-5" style={{ background: 'rgba(12,31,26,0.8)' }}>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex-shrink-0">
              <CibilScoreRing score={bureau.cibilScore} size={140} />
            </div>
            <div className="flex-1 w-full">
              <h2 className="text-base font-bold text-white mb-2">{auth.user?.name}'s Credit Profile</h2>
              <CibilScoreBar score={bureau.cibilScore} className="mb-3" />
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Active Loans', value: bureau.loans.length, color: 'text-text' },
                  { label: 'Total Debt', value: formatInrShort(totalDebt), color: 'text-red/80' },
                  { label: 'Monthly EMI', value: formatInrShort(totalEmi), color: 'text-amber' },
                  { label: 'Highest Rate', value: `${highestRate}%`, color: highestRate > 18 ? 'text-red' : 'text-mint' },
                ].map(m => (
                  <div key={m.label} className="bg-faint rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-muted mb-0.5">{m.label}</div>
                    <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loan accounts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text text-sm">Loan Accounts <span className="text-muted font-normal">({bureau.loans.length})</span></h3>
            <span className="text-xs text-muted">Tap ▾ to see details</span>
          </div>
          <div className="space-y-2.5">
            {bureau.loans.map((loan, i) => (
              <LoanCard key={loan.id} loan={loan} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Property & Income section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border p-5 mb-5" style={{ background: 'rgba(12,31,26,0.8)' }}>
          <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-mint" />
            Income & Property
            <span className="text-xs text-muted font-normal ml-1">— unlocks better strategies</span>
          </h3>

          <div className="space-y-4">
            {/* Income */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-text">Monthly Net Income</div>
                <div className="text-xs text-muted">Post-tax take-home</div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                <input type="number" value={profile.income || ''} onChange={e => setProfile({ income: parseInt(e.target.value) || 0 })}
                  placeholder="75000"
                  className="w-36 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right" />
              </div>
            </div>

            {/* Property section — smart based on whether HL exists */}
            {(hasHL || hasLAP) ? (
              /* Home loan detected — directly ask for property value */
              <div className="space-y-3">
                <div className="bg-mint/5 border border-mint/20 rounded-xl px-3 py-2 text-xs text-muted flex items-start gap-2">
                  <Home className="w-3.5 h-3.5 text-mint mt-0.5 flex-shrink-0" />
                  <span>Home Loan detected — property value required to compute top-up eligibility (75% LTV basis).</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-text">
                      Property Market Value <span className="text-red text-xs">*required</span>
                    </div>
                    <div className="text-xs text-muted">Current market value of your home</div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                    <input type="number" value={profile.houseValue || ''} onChange={e => setProfile({ houseValue: parseInt(e.target.value) || 0, ownHouse: true })}
                      placeholder="8500000"
                      className="w-40 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right" />
                  </div>
                </div>
                {/* Also ask about other property */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-text">Do you own any other property?</div>
                    <div className="text-xs text-muted">Second home, commercial, shop, etc.</div>
                  </div>
                  <YesNoToggle value={profile.hasShop} onChange={v => setProfile({ hasShop: v })} />
                </div>
                {profile.hasShop && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center justify-between gap-4 ml-4 pl-4 border-l border-border">
                    <div>
                      <div className="text-sm text-text">Other Property Value</div>
                      <div className="text-xs text-muted">Approx. current market value</div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                      <input type="number" value={profile.shopValue || ''} onChange={e => setProfile({ shopValue: parseInt(e.target.value) || 0 })}
                        placeholder="3000000"
                        className="w-40 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right" />
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              /* No home loan — ask if they own property */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-text flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-muted" />
                      Do you own a property?
                    </div>
                    <div className="text-xs text-muted">Home, flat, shop, or any real estate</div>
                  </div>
                  <YesNoToggle value={profile.ownHouse} onChange={v => setProfile({ ownHouse: v, houseValue: v ? profile.houseValue : 0 })} />
                </div>
                {profile.ownHouse && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 ml-4 pl-4 border-l border-border">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm text-text">Property Market Value</div>
                        <div className="text-xs text-muted">Current approx. value</div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                        <input type="number" value={profile.houseValue || ''} onChange={e => setProfile({ houseValue: parseInt(e.target.value) || 0 })}
                          placeholder="5000000"
                          className="w-40 bg-faint border border-border rounded-xl pl-7 pr-3 py-2 text-sm text-text focus:outline-none focus:border-mint/50 text-right" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/auth')}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <Button variant="primary" size="lg" onClick={handleConfirm}>
            Confirm & Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
