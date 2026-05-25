// ─────────────────────────────────────────────────────────────────────────────
// FINFINITY BRE ENGINE — Comprehensive Strategy Builder
// Logic authored by BRE head. Extended per manager spec.
// Flow: Sort by rate → Secured BT → Top-up check → Unsecured BT → Consolidation
// ─────────────────────────────────────────────────────────────────────────────
import { BureauLoan, Strategy } from '@/store/useAppStore';
import { formatInrShort } from './mock-bureau';

// ─── Extended Strategy type with sub-tags ─────────────────────────────────────
export interface ExtendedStrategy extends Strategy {
  subTag?: 'TOPUP_CONSOLIDATE' | 'TOPUP_INVEST' | 'BT_OD' | 'BT_LENDER' | 'URGENT' | 'WEALTH';
  breakEvenMonths?: number;
  totalCost?: number; // PF + FC in rupees
  isRecommended?: boolean;
}

export interface LoanStrategies {
  loanId: number;
  loan: BureauLoan;
  strategies: ExtendedStrategy[];
  recommended: ExtendedStrategy | null;
}

// ─── Calculators ──────────────────────────────────────────────────────────────
function calcEmi(principal: number, ratePercent: number, months: number): number {
  if (!principal || !months || principal <= 0) return 0;
  const r = ratePercent / 100 / 12;
  if (!r) return Math.round(principal / months);
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

function totalInterest(principal: number, ratePercent: number, months: number): number {
  return Math.max(0, calcEmi(principal, ratePercent, months) * months - principal);
}

function intSaved(principal: number, oldRate: number, newRate: number, months: number): number {
  return Math.max(0, totalInterest(principal, oldRate, months) - totalInterest(principal, newRate, months));
}

function sipFV(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

function lumpFV(lump: number, annualRate: number, years: number): number {
  return Math.round(lump * Math.pow(1 + annualRate / 100, years));
}

// ─── Rate lookups ─────────────────────────────────────────────────────────────
function bestPLRate(cibil: number): number {
  if (cibil >= 780) return 10.49;
  if (cibil >= 750) return 11.50;
  if (cibil >= 720) return 12.99;
  if (cibil >= 700) return 14.00;
  if (cibil >= 680) return 16.00;
  return 18.00;
}

function bestHLRate(cibil: number): number {
  if (cibil >= 750) return 8.50;
  if (cibil >= 720) return 8.65;
  if (cibil >= 700) return 8.75;
  return 9.00;
}

function bestPLLender(cibil: number, excludeLender = ''): string {
  const ranked = [
    { name: 'HDFC Bank', min: 725 }, { name: 'ICICI Bank', min: 720 },
    { name: 'Axis Bank', min: 720 }, { name: 'Kotak Mahindra', min: 720 },
    { name: 'Tata Capital', min: 700 }, { name: 'IDFC First Bank', min: 700 },
    { name: 'Bajaj Finserv', min: 685 }, { name: 'Poonawalla Fincorp', min: 650 },
    { name: 'Fullerton India', min: 600 },
  ];
  return ranked.find(l => cibil >= l.min && l.name !== excludeLender)?.name ?? 'Bajaj Finserv';
}

function bestHLLender(excludeLender = ''): string {
  const opts = ['SBI Home Finance', 'HDFC Bank', 'Kotak Mahindra', 'ICICI Bank', 'Axis Bank', 'PNB Housing'];
  return opts.find(l => l !== excludeLender) ?? 'SBI Home Finance';
}

// ─── Lender fee lookup (pre-populated, user-editable on UI) ───────────────────
interface FeeConfig { pfPct: number; pfMin: number; pfMax: number; fcPct: number; floatingFCFree: boolean }

function getLenderFees(lender: string, loanType: string): FeeConfig {
  const l = lender.toLowerCase();
  // Floating rate home loans: RBI mandates no foreclosure charges
  const isFloatingHL = loanType === 'Home Loan';

  if (l.includes('sbi') || l.includes('state bank'))
    return { pfPct: 0.35, pfMin: 2000, pfMax: 10000, fcPct: isFloatingHL ? 0 : 2, floatingFCFree: isFloatingHL };
  if (l.includes('hdfc'))
    return { pfPct: 0.5, pfMin: 5000, pfMax: 25000, fcPct: isFloatingHL ? 0 : 3, floatingFCFree: isFloatingHL };
  if (l.includes('icici'))
    return { pfPct: 0.5, pfMin: 3500, pfMax: 20000, fcPct: isFloatingHL ? 0 : 2.5, floatingFCFree: isFloatingHL };
  if (l.includes('axis'))
    return { pfPct: 0.75, pfMin: 3999, pfMax: 50000, fcPct: isFloatingHL ? 0 : 2, floatingFCFree: isFloatingHL };
  if (l.includes('kotak'))
    return { pfPct: 0.5, pfMin: 2999, pfMax: 30000, fcPct: isFloatingHL ? 0 : 2, floatingFCFree: isFloatingHL };
  if (l.includes('idfc') || l.includes('first'))
    return { pfPct: 2.0, pfMin: 2999, pfMax: 50000, fcPct: isFloatingHL ? 0 : 2, floatingFCFree: isFloatingHL };
  if (l.includes('bajaj'))
    return { pfPct: 2.0, pfMin: 999, pfMax: 45000, fcPct: 2.5, floatingFCFree: false };
  if (l.includes('tata'))
    return { pfPct: 1.5, pfMin: 999, pfMax: 35000, fcPct: 2.0, floatingFCFree: false };
  if (l.includes('poonawalla'))
    return { pfPct: 2.0, pfMin: 1999, pfMax: 50000, fcPct: 2.0, floatingFCFree: false };
  if (l.includes('fullerton'))
    return { pfPct: 2.0, pfMin: 1999, pfMax: 30000, fcPct: 2.5, floatingFCFree: false };
  if (l.includes('hero'))
    return { pfPct: 2.5, pfMin: 1999, pfMax: 20000, fcPct: 2.5, floatingFCFree: false };
  if (l.includes('aditya') || l.includes('birla') || l.includes('abfl'))
    return { pfPct: 2.0, pfMin: 1999, pfMax: 50000, fcPct: 2.0, floatingFCFree: false };
  if (l.includes('chola') || l.includes('cholamandalam'))
    return { pfPct: 2.5, pfMin: 2999, pfMax: 25000, fcPct: 2.5, floatingFCFree: false };
  if (l.includes('indus'))
    return { pfPct: 2.0, pfMin: 3999, pfMax: 50000, fcPct: 2.0, floatingFCFree: false };
  if (l.includes('piramal'))
    return { pfPct: 2.0, pfMin: 2999, pfMax: 20000, fcPct: 2.0, floatingFCFree: false };
  if (l.includes('yes bank'))
    return { pfPct: 2.0, pfMin: 2999, pfMax: 30000, fcPct: 2.0, floatingFCFree: false };
  // Generic fallback
  return { pfPct: 1.5, pfMin: 2000, pfMax: 25000, fcPct: 2.0, floatingFCFree: isFloatingHL };
}

function calcFees(outstanding: number, lender: string, loanType: string): { pf: number; fc: number; total: number } {
  const f = getLenderFees(lender, loanType);
  const pf = Math.min(Math.max(Math.round(outstanding * f.pfPct / 100), f.pfMin), f.pfMax);
  const fc = f.floatingFCFree ? 0 : Math.round(outstanding * f.fcPct / 100);
  return { pf, fc, total: pf + fc };
}

// Estimate months elapsed (heuristic: proportion of principal repaid)
function estimateTenureElapsed(loan: BureauLoan): number {
  if (!loan.sanctionAmount || !loan.outstanding) return 0;
  const repaidRatio = Math.max(0, Math.min(0.95, 1 - loan.outstanding / loan.sanctionAmount));
  const estimatedTotal = loan.closureMonths / Math.max(0.05, 1 - repaidRatio);
  return Math.round(estimatedTotal * repaidRatio);
}

// ─── TOPUP ELIGIBILITY (secured loan only) ────────────────────────────────────
function topupEligibility(
  loan: BureauLoan,
  houseValue: number,
): { eligible: boolean; amount: number; rate: number; reason?: string } {
  if (!houseValue || houseValue <= 0)
    return { eligible: false, amount: 0, rate: 0, reason: 'Property value not provided' };
  if (loan.dpd > 0)
    return { eligible: false, amount: 0, rate: 0, reason: 'DPD on record — top-up not available' };

  const elapsed = estimateTenureElapsed(loan);
  if (elapsed < 12)
    return { eligible: false, amount: 0, rate: 0, reason: `Only ~${elapsed} months estimated elapsed — need 12` };

  const maxPct = elapsed >= 24 ? 0.30 : elapsed >= 18 ? 0.20 : 0.10;
  const maxTopup = loan.sanctionAmount * maxPct;
  const ltv75 = houseValue * 0.75;
  const ltvCap = Math.max(0, ltv75 - loan.outstanding);
  const amount = Math.min(maxTopup, ltvCap);

  if (amount < 50000)
    return { eligible: false, amount: 0, rate: 0, reason: 'Top-up eligibility below minimum ₹50K' };

  const rate = loan.rate + (amount / loan.sanctionAmount > 0.30 ? 0.5 : 0);
  return { eligible: true, amount, rate };
}

let _strategyIdCounter = 1;
function nextId() { return _strategyIdCounter++; }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BUILDER
// ─────────────────────────────────────────────────────────────────────────────
export function buildLoanStrategies(
  loans: BureauLoan[],
  cibil: number,
  income: number,
  houseValue: number,
  ownHouse: boolean,
): LoanStrategies[] {
  _strategyIdCounter = 1;

  // Sort loans by rate descending — highest cost first
  const sorted = [...loans].sort((a, b) => b.rate - a.rate);
  const hlLoan = loans.find(l => l.accountType === 'Home Loan');
  const totalEmi = loans.reduce((s, l) => s + l.emi, 0);
  const tuHL = hlLoan ? topupEligibility(hlLoan, houseValue) : null;

  const results: LoanStrategies[] = [];

  // ─── Per-loan strategies ────────────────────────────────────────────────────
  for (const loan of sorted) {
    const loanStrats: ExtendedStrategy[] = [];

    // ── CREDIT CARD ──────────────────────────────────────────────────────────
    if (loan.accountType === 'Credit Card') {
      const newRate = bestPLRate(cibil);
      if (newRate < loan.rate) {
        const months = Math.min(loan.closureMonths, 36);
        const toLender = bestPLLender(cibil, loan.lender);
        const newEmi_ = calcEmi(loan.outstanding, newRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, newRate, months);
        const fees = calcFees(loan.outstanding, loan.lender, 'Personal Loan'); // new PL PF
        const netSaved = Math.max(0, saved - fees.pf);
        const breakEven = emiFreed > 0 ? Math.ceil(fees.pf / emiFreed) : 0;

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_LENDER',
          title: `CC → PL at ${newRate}% via ${toLender}`,
          reason: `Credit card at ${loan.rate}% is the most expensive debt you have — compounding daily. A personal loan from ${toLender} at ${newRate}% converts this to fixed-term, saving ${formatInrShort(saved)} in total interest. Monthly payment drops from ${formatInrShort(loan.emi)} to ${formatInrShort(newEmi_)}.`,
          fromLoan: { lender: `${loan.lender} (CC)`, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: `${toLender} PL`, rate: newRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: netSaved,
          conflictsWith: [], fees: { pf: fees.pf / loan.outstanding * 100, fc: 0 },
          eligibility: `CIBIL ${cibil} — ${cibil >= 700 ? `✓ qualifies for ${newRate}% at ${toLender}` : '⚠️ limited — try Fullerton/Poonawalla (min 600)'}. Processing: 2–5 days.`,
          recommendation: `⚡ Highest priority. Every day on CC = ${formatInrShort(Math.round(loan.outstanding * loan.rate / 100 / 365))} extra interest. Break-even on PF: ${breakEven} months.`,
          loanIds: [loan.id], breakEvenMonths: breakEven, totalCost: fees.pf,
        });
      }

      // CC → HL Top-up consolidation (if HL top-up available)
      if (tuHL?.eligible && tuHL.amount >= loan.outstanding && loan.rate > tuHL.rate) {
        const months = Math.min(hlLoan!.closureMonths, 60);
        const newEmi_ = calcEmi(loan.outstanding, tuHL.rate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, tuHL.rate, months);

        loanStrats.push({
          id: nextId(), tag: 'TOPUP', subTag: 'TOPUP_CONSOLIDATE',
          title: `CC → HL Top-up @ ${tuHL.rate}% (close with home equity)`,
          reason: `Use your home loan top-up (${formatInrShort(tuHL.amount)} available at ${tuHL.rate}%) to fully close this credit card. At ${tuHL.rate}% vs ${loan.rate}%, you save ${formatInrShort(saved)} over ${Math.round(months / 12)} years. No processing fee for PL.`,
          fromLoan: { lender: `${loan.lender} (CC)`, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: `${hlLoan!.lender} Top-up`, rate: tuHL.rate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: Math.max(0, saved * 0.95),
          conflictsWith: [], fees: { pf: 0.5, fc: 0 },
          eligibility: `HL top-up eligible (${estimateTenureElapsed(hlLoan!)} months repaid, DPD clean). LTV check: ${formatInrShort(hlLoan!.outstanding + loan.outstanding)} ≤ 75% of ${formatInrShort(houseValue)}. Section 24(b) deduction applies.`,
          recommendation: `If you choose between PL BT and HL top-up for this CC: HL top-up is cheaper (${tuHL.rate}% vs ${bestPLRate(cibil)}%) but adds to secured debt. Choose top-up if you're confident on repayment.`,
          loanIds: [loan.id, hlLoan!.id],
        });
      }
    }

    // ── PERSONAL LOAN ────────────────────────────────────────────────────────
    else if (loan.accountType === 'Personal Loan') {
      const marketRate = bestPLRate(cibil);
      const rateDiff = loan.rate - marketRate;

      // BT to better lender (if rate diff > 1.5%)
      if (rateDiff > 1.5) {
        const toLender = bestPLLender(cibil, loan.lender);
        const months = loan.closureMonths;
        const newEmi_ = calcEmi(loan.outstanding, marketRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, marketRate, months);
        const fees = calcFees(loan.outstanding, loan.lender, 'Personal Loan');
        const netSaved = Math.max(0, saved - fees.total);
        const breakEven = emiFreed > 0 ? Math.ceil(fees.total / emiFreed) : 0;

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_LENDER',
          title: `PL BT: ${loan.lender} ${loan.rate}% → ${toLender} @ ${marketRate}%`,
          reason: `At ${loan.rate}%, you pay ${formatInrShort(Math.round(loan.outstanding * loan.rate / 100 / 12))} interest/month on this loan. ${toLender} offers ${marketRate}% — a ${rateDiff.toFixed(1)}% reduction. On ${formatInrShort(loan.outstanding)} over ${months} months, this saves ${formatInrShort(saved)}.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: toLender, rate: marketRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: netSaved,
          conflictsWith: [],
          fees: { pf: getLenderFees(loan.lender, 'Personal Loan').pfPct, fc: getLenderFees(loan.lender, 'Personal Loan').fcPct },
          eligibility: `CIBIL ${cibil} — ${cibil >= 700 ? `✓ qualifies for ${marketRate}% at ${toLender}` : 'limited options'}. Min 3 EMIs paid. PF: ${formatInrShort(fees.pf)}, FC: ${formatInrShort(fees.fc)}, Total cost: ${formatInrShort(fees.total)}.`,
          recommendation: `Transfer cost: ${formatInrShort(fees.total)} | Break-even: ${breakEven} months | Net saving: ${formatInrShort(netSaved)}. ${netSaved > 50000 ? '✅ Highly recommended.' : netSaved > 0 ? '✅ Worth doing.' : '⚠️ Marginal — negotiate FC waiver first.'}`,
          loanIds: [loan.id], breakEvenMonths: breakEven, totalCost: fees.total,
        });
      }

      // PL → HL Top-up consolidation (if HL top-up available + PL rate > top-up rate)
      if (tuHL?.eligible && tuHL.amount >= loan.outstanding && loan.rate > tuHL.rate) {
        const months = Math.min(hlLoan!.closureMonths, 120);
        const newEmi_ = calcEmi(loan.outstanding, tuHL.rate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, tuHL.rate, months);

        loanStrats.push({
          id: nextId(), tag: 'TOPUP', subTag: 'TOPUP_CONSOLIDATE',
          title: `PL → HL Top-up @ ${tuHL.rate}% (${loan.rate}% → ${tuHL.rate}%)`,
          reason: `Close this ${formatInrShort(loan.outstanding)} personal loan using your home loan top-up at ${tuHL.rate}%. You shift from ${loan.rate}% unsecured debt to ${tuHL.rate}% secured debt — saving ${formatInrShort(saved)} in total interest. EMI drops from ${formatInrShort(loan.emi)} to ${formatInrShort(newEmi_)}/month.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: `${hlLoan!.lender} Top-up`, rate: tuHL.rate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: Math.max(0, saved * 0.92),
          conflictsWith: [], fees: { pf: 0.5, fc: 0 },
          eligibility: `Top-up eligible: ${formatInrShort(tuHL.amount)} available at ${tuHL.rate}%. LTV checked. Section 24(b) deductible if used for property improvement.`,
          recommendation: `Versus PL BT: top-up has no FC on your existing PL. Rate: ${tuHL.rate}% vs PL BT ${marketRate}%. ${tuHL.rate < marketRate ? `✅ Top-up is cheaper by ${(marketRate - tuHL.rate).toFixed(2)}%.` : `PL BT has slightly better rate — prefer BT.`}`,
          loanIds: [loan.id, hlLoan!.id],
        });
      }
    }

    // ── HOME LOAN ────────────────────────────────────────────────────────────
    else if (loan.accountType === 'Home Loan') {
      const marketRate = bestHLRate(cibil);
      const rateDiff = loan.rate - marketRate;

      // Strategy A: HL BT
      if (rateDiff > 0.25 && loan.dpd === 0) {
        const toLender = bestHLLender(loan.lender);
        const months = loan.closureMonths;
        const newEmi_ = calcEmi(loan.outstanding, marketRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, marketRate, months);
        const fees = calcFees(loan.outstanding, loan.lender, 'Home Loan');
        const netSaved = Math.max(0, saved - fees.total);
        const breakEven = emiFreed > 0 ? Math.ceil(fees.total / emiFreed) : 0;

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_LENDER',
          title: `HL BT: ${loan.lender} ${loan.rate}% → ${toLender} @ ${marketRate}%`,
          reason: `Your HL rate of ${loan.rate}% is ${rateDiff.toFixed(2)}% above the current best rate of ${marketRate}%. On ${formatInrShort(loan.outstanding)} with ${Math.round(months / 12)} years remaining, that's ${formatInrShort(saved)} in excess interest. A balance transfer to ${toLender} eliminates this.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: toLender, rate: marketRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: netSaved,
          conflictsWith: [],
          fees: { pf: getLenderFees(loan.lender, 'Home Loan').pfPct, fc: fees.fc > 0 ? getLenderFees(loan.lender, 'Home Loan').fcPct : 0 },
          eligibility: `6 months clean repayment needed. ${loan.dpd === 0 ? '✓ Account is clean.' : '⚠️ DPD on record.'} ${fees.fc === 0 ? 'Floating rate — no foreclosure charge (RBI mandate).' : `FC: ${formatInrShort(fees.fc)}.`} 80C + 24(b) deductions continue after BT.`,
          recommendation: `Transfer cost: ${formatInrShort(fees.total)} | Break-even: ~${breakEven} months | Net saving: ${formatInrShort(netSaved)}. ${breakEven < 24 ? '✅ Excellent ROI — do this.' : '⚠️ Long break-even — negotiate fees first.'}`,
          loanIds: [loan.id], breakEvenMonths: breakEven, totalCost: fees.total,
        });
      }

      // Strategy B: HL Top-up to consolidate high-rate loans
      if (tuHL?.eligible) {
        const consolidatable = loans.filter(l => l.id !== loan.id && l.rate > tuHL.rate && l.outstanding > 0)
          .sort((a, b) => b.rate - a.rate);
        let usedTopup = 0;
        const toClose: BureauLoan[] = [];
        for (const l of consolidatable) {
          if (usedTopup + l.outstanding <= tuHL.amount) { toClose.push(l); usedTopup += l.outstanding; }
        }
        if (toClose.length > 0) {
          const totalOs = toClose.reduce((s, l) => s + l.outstanding, 0);
          const totalOldEmi = toClose.reduce((s, l) => s + l.emi, 0);
          const blendedOld = toClose.reduce((s, l) => s + l.rate * l.outstanding, 0) / totalOs;
          const newTopupMonths = Math.min(loan.closureMonths, 120);
          const newEmi_ = calcEmi(totalOs, tuHL.rate, newTopupMonths);
          const emiFreed = Math.max(0, totalOldEmi - newEmi_);
          const saved = intSaved(totalOs, blendedOld, tuHL.rate, newTopupMonths);
          const loanNames = toClose.map(l => l.accountType).join(' + ');
          const lumpLeft = Math.max(0, tuHL.amount - totalOs);

          loanStrats.push({
            id: nextId(), tag: 'TOPUP', subTag: 'TOPUP_CONSOLIDATE',
            title: `Top-up ${formatInrShort(totalOs)} @ ${tuHL.rate}% → close ${loanNames}`,
            reason: `Your HL has ${estimateTenureElapsed(loan)} months clean repayment — eligible for ${formatInrShort(tuHL.amount)} top-up at ${tuHL.rate}%. Using this to close ${loanNames} (blended rate ${blendedOld.toFixed(1)}%) saves ${formatInrShort(saved)} in interest and frees ${formatInrShort(emiFreed)}/month.${lumpLeft > 0 ? ` ${formatInrShort(lumpLeft)} remaining top-up can be invested.` : ''}`,
            fromLoan: { lender: `${loanNames} @ ${blendedOld.toFixed(1)}%`, rate: +blendedOld.toFixed(1), outstanding: totalOs },
            toLoan: { lender: `${loan.lender} Top-up`, rate: tuHL.rate, amount: totalOs },
            monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
            lumpSumAvailable: lumpLeft, netSaving: Math.max(0, saved * 0.92),
            conflictsWith: [], fees: { pf: 0.5, fc: 0 },
            eligibility: `Top-up eligible: ${formatInrShort(tuHL.amount)} at ${tuHL.rate}%. Covers: ${toClose.map(l => `${l.lender} ${l.accountType} (${formatInrShort(l.outstanding)})`).join(', ')}. LTV capped at 75% of ${formatInrShort(houseValue)}.`,
            recommendation: `Consolidation vs BT: this strategy eliminates ${toClose.length} high-rate loan(s). ${saved > intSaved(loan.outstanding, loan.rate, bestHLRate(cibil), loan.closureMonths) ? '✅ RECOMMENDED over BT — saves more total.' : 'If BT saves more, combine: BT the HL first, then top-up after rate reduction.'}`,
            loanIds: [loan.id, ...toClose.map(l => l.id)],
          });
        }

        // Strategy C: HL Top-up for wealth creation (if top-up > debt)
        const highCostDebt = loans.filter(l => l.id !== loan.id && l.rate > tuHL.rate).reduce((s, l) => s + l.outstanding, 0);
        const investableTopup = Math.max(0, tuHL.amount - highCostDebt);
        if (investableTopup > 200000) {
          const investReturn = 12;
          const years = Math.min(Math.round(loan.closureMonths / 12), 15);
          const corpus = lumpFV(investableTopup, investReturn, years);
          const interestCost = calcEmi(investableTopup, tuHL.rate, loan.closureMonths) * loan.closureMonths - investableTopup;
          const netGain = Math.max(0, corpus - interestCost - investableTopup);

          loanStrats.push({
            id: nextId(), tag: 'TOPUP', subTag: 'TOPUP_INVEST',
            title: `Invest ${formatInrShort(investableTopup)} via HL Top-up (${investReturn}% CAGR)`,
            reason: `After closing high-cost loans, you have ${formatInrShort(investableTopup)} of additional top-up available at ${tuHL.rate}%. Investing this in equity mutual funds at ${investReturn}% CAGR creates a ${years}-year corpus of ${formatInrShort(corpus)} — net gain ${formatInrShort(netGain)} after interest cost of ${formatInrShort(Math.round(interestCost))}.`,
            fromLoan: { lender: `Invest via ${loan.lender} Top-up @ ${tuHL.rate}%`, rate: tuHL.rate, outstanding: investableTopup },
            toLoan: { lender: 'Equity MF / NPS / SGB', rate: investReturn, amount: investableTopup },
            monthlyEmiFreed: 0, totalInterestSaved: 0,
            lumpSumAvailable: investableTopup, netSaving: netGain,
            conflictsWith: [], fees: { pf: 0.5, fc: 0 },
            eligibility: `Borrow at ${tuHL.rate}% (secured), invest at ${investReturn}% (equity). Net arbitrage: ${(investReturn - tuHL.rate).toFixed(1)}% p.a. Works best over 10+ years. HL interest deductible under Sec 24(b).`,
            recommendation: `⚠️ This is an advanced arbitrage strategy. The ${(investReturn - tuHL.rate).toFixed(1)}% spread works over long horizons. Start only after eliminating all high-rate debt. Recommended allocation: 70% equity MF + 30% NPS.`,
            loanIds: [loan.id],
          });
        }
      }
    }

    // ── BUSINESS / SME LOAN ──────────────────────────────────────────────────
    else if (loan.accountType === 'Business Loan' || loan.accountType === 'SME Loan') {
      // Strategy A: BL → Dropline OD
      if (loan.rate > 13 && loan.dpd === 0) {
        const odRate = 11.5;
        const months = loan.closureMonths;
        const newEmi_ = calcEmi(loan.outstanding, odRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, odRate, months);
        const fees = calcFees(loan.outstanding, loan.lender, 'Business Loan');

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_OD',
          title: `${loan.lender} BL → Dropline OD @ ${odRate}%`,
          reason: `Dropline OD charges interest only on drawn amount — not the full ${formatInrShort(loan.outstanding)} sanction. Unlike fixed EMI term loan, you repay and redraw flexibly. Rate ${odRate}% vs current ${loan.rate}%. Annual saving: ${formatInrShort(Math.round(loan.outstanding * (loan.rate - odRate) / 100))}.`,
          fromLoan: { lender: `${loan.lender} BL`, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: 'Dropline OD', rate: odRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: Math.max(0, saved - fees.total),
          conflictsWith: [], fees: { pf: fees.pf / loan.outstanding * 100, fc: fees.fc / loan.outstanding * 100 },
          eligibility: 'Business vintage ≥ 2 years. ITR mandatory. Collateral (property/FD) for large OD. 100% interest deductible as business expense.',
          recommendation: `✅ OD is ideal for variable business cashflows. Interest only on drawn amount. Tax deduction on full interest makes effective rate ~${(odRate * (1 - 0.30)).toFixed(1)}% post-tax (assuming 30% bracket).`,
          loanIds: [loan.id],
        });
      }

      // Strategy B: BL BT to another lender
      const newBLRate = Math.max(12, loan.rate - 2.5);
      if (loan.rate - newBLRate > 1.5) {
        const months = loan.closureMonths;
        const newEmi_ = calcEmi(loan.outstanding, newBLRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, newBLRate, months);

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_LENDER',
          title: `BL BT: ${loan.lender} ${loan.rate}% → Better lender @ ${newBLRate}%`,
          reason: `Business loans from other banks available at ${newBLRate}% for your profile. Moving ${formatInrShort(loan.outstanding)} from ${loan.rate}% saves ${formatInrShort(saved)} over ${Math.round(months / 12)} years.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: 'ICICI / Axis Business Loan', rate: newBLRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: Math.max(0, saved * 0.85),
          conflictsWith: [], fees: { pf: 1.5, fc: 2 },
          eligibility: 'Business vintage ≥ 3 years. Last 2 years ITR filed. Audited financials preferred for > ₹50L.',
          recommendation: `Compare with Dropline OD strategy — OD gives more flexibility if business income varies. BL BT is better for stable, predictable cashflows.`,
          loanIds: [loan.id],
        });
      }
    }

    // ── CAR / AUTO LOAN ──────────────────────────────────────────────────────
    else if (loan.accountType === 'Auto Loan' || loan.accountType === 'Car Loan') {
      // BT if rate > 11%
      if (loan.rate > 11 && loan.dpd === 0) {
        const newRate = 9.25;
        const months = loan.closureMonths;
        const newEmi_ = calcEmi(loan.outstanding, newRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, newRate, months);
        const fees = calcFees(loan.outstanding, loan.lender, 'Auto Loan');

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_LENDER',
          title: `Car Loan BT: ${loan.lender} ${loan.rate}% → SBI/HDFC @ ${newRate}%`,
          reason: `Car loan rates have improved. Moving your ${formatInrShort(loan.outstanding)} outstanding to a bank offering ${newRate}% saves ${formatInrShort(saved)} over ${months} months remaining. EMI drops by ${formatInrShort(emiFreed)}/month.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: 'SBI / HDFC Auto Loan', rate: newRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: Math.max(0, saved - fees.total),
          conflictsWith: [], fees: { pf: fees.pf / loan.outstanding * 100, fc: fees.fc / loan.outstanding * 100 },
          eligibility: `Vehicle must be < 5 years old for BT. Clean repayment track required. PF: ${formatInrShort(fees.pf)}, FC: ${formatInrShort(fees.fc)}.`,
          recommendation: `If EMI savings > monthly FC + PF in 18 months — do it. Break-even: ${emiFreed > 0 ? Math.ceil(fees.total / emiFreed) : 'N/A'} months.`,
          loanIds: [loan.id],
        });
      }

      // Car top-up to help close PL
      const plLoans = loans.filter(l => l.accountType === 'Personal Loan' && l.rate > loan.rate + 2);
      const elapsed = estimateTenureElapsed(loan);
      if (elapsed >= 12 && loan.dpd === 0 && plLoans.length > 0) {
        const maxTopupPct = elapsed >= 24 ? 0.25 : elapsed >= 18 ? 0.15 : 0.10;
        const carTopup = loan.outstanding * maxTopupPct;
        const pl = plLoans[0];
        const topupAmt = Math.min(carTopup, pl.outstanding);
        const topupRate = loan.rate + 0.5;
        if (topupAmt > 30000) {
          const oldPLEmi = calcEmi(topupAmt, pl.rate, pl.closureMonths);
          const newCarEmi = calcEmi(topupAmt, topupRate, loan.closureMonths);
          const emiFreed = Math.max(0, oldPLEmi - newCarEmi);
          const saved = intSaved(topupAmt, pl.rate, topupRate, Math.min(pl.closureMonths, loan.closureMonths));

          loanStrats.push({
            id: nextId(), tag: 'TOPUP', subTag: 'TOPUP_CONSOLIDATE',
            title: `Car top-up ${formatInrShort(topupAmt)} @ ${topupRate}% → partially close ${pl.lender} PL`,
            reason: `Car loan top-up (up to ${(maxTopupPct * 100).toFixed(0)}% of outstanding = ${formatInrShort(carTopup)}) can partially pay your ${pl.lender} PL at ${pl.rate}%. Shifting ${formatInrShort(topupAmt)} from ${pl.rate}% to ${topupRate}% saves ${formatInrShort(saved)}.`,
            fromLoan: { lender: `${pl.lender} PL`, rate: pl.rate, outstanding: topupAmt },
            toLoan: { lender: `${loan.lender} Car Top-up`, rate: topupRate, amount: topupAmt },
            monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
            lumpSumAvailable: 0, netSaving: Math.max(0, saved * 0.9),
            conflictsWith: [], fees: { pf: 0.5, fc: 0 },
            eligibility: `Car loan has ~${elapsed} months repaid. Top-up eligible: ${(maxTopupPct * 100).toFixed(0)}% of outstanding = ${formatInrShort(carTopup)}. Clean DPD required.`,
            recommendation: `Partial solution — reduces PL burden. If HL top-up is available, prefer that (lower rate). Car top-up rate (${topupRate}%) is still lower than PL rate (${pl.rate}%).`,
            loanIds: [loan.id, pl.id],
          });
        }
      }
    }

    // ── EDUCATION LOAN ───────────────────────────────────────────────────────
    else if (loan.accountType === 'Education Loan') {
      if (loan.rate > 10) {
        const newRate = 9.5;
        const months = loan.closureMonths;
        const newEmi_ = calcEmi(loan.outstanding, newRate, months);
        const emiFreed = Math.max(0, loan.emi - newEmi_);
        const saved = intSaved(loan.outstanding, loan.rate, newRate, months);

        loanStrats.push({
          id: nextId(), tag: 'BT', subTag: 'BT_LENDER',
          title: `Education Loan BT @ ${newRate}% (from ${loan.rate}%)`,
          reason: `Education loan BT available at ${newRate}% from PSU banks (SBI, Bank of Baroda). Saves ${formatInrShort(saved)} over ${Math.round(months / 12)} years. Bonus: Section 80E — full interest deductible for 8 years (no limit), making effective rate ~${(newRate * 0.7).toFixed(1)}% post-tax.`,
          fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
          toLoan: { lender: 'SBI Scholar Loan', rate: newRate, amount: loan.outstanding },
          monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
          lumpSumAvailable: 0, netSaving: Math.max(0, saved),
          conflictsWith: [], fees: { pf: 0.5, fc: 0 },
          eligibility: 'BT to PSU banks: original loan docs, fee receipts, income proof required. Moratorium period for students still studying.',
          recommendation: `Section 80E makes this uniquely tax-efficient. Even at ${newRate}%, after tax saving the effective cost is ~${(newRate * 0.7).toFixed(1)}%. Prioritise repayment within 8 years for full 80E benefit.`,
          loanIds: [loan.id],
        });
      }
    }

    // ── SET CONFLICTS within loan strategies ─────────────────────────────────
    // BT strategies conflict with top-up strategies that use the same loan
    loanStrats.forEach((s, i) => {
      loanStrats.forEach((other, j) => {
        if (i !== j && s.loanIds.some(lid => other.loanIds.includes(lid))) {
          if (!s.conflictsWith.includes(other.id)) s.conflictsWith.push(other.id);
          if (!other.conflictsWith.includes(s.id)) other.conflictsWith.push(s.id);
        }
      });
    });

    // ── PICK RECOMMENDED ─────────────────────────────────────────────────────
    let recommended: ExtendedStrategy | null = null;
    if (loanStrats.length > 0) {
      // Prefer consolidation/top-up if it saves 20%+ more than BT, else prefer BT (less hassle)
      const btStrats = loanStrats.filter(s => s.tag === 'BT');
      const topupStrats = loanStrats.filter(s => s.tag === 'TOPUP' && s.subTag !== 'TOPUP_INVEST');
      const bestBT = btStrats.sort((a, b) => b.netSaving - a.netSaving)[0];
      const bestTopup = topupStrats.sort((a, b) => b.netSaving - a.netSaving)[0];

      if (bestTopup && bestBT) {
        recommended = bestTopup.netSaving > bestBT.netSaving * 1.2 ? bestTopup : bestBT;
      } else {
        recommended = loanStrats.filter(s => s.subTag !== 'TOPUP_INVEST')
          .sort((a, b) => b.netSaving - a.netSaving)[0] ?? null;
      }
      if (recommended) recommended.isRecommended = true;
    }

    if (loanStrats.length > 0) {
      results.push({ loanId: loan.id, loan, strategies: loanStrats, recommended });
    }
  }

  // ─── GLOBAL STRATEGIES (not tied to single loan) ──────────────────────────

  // Multi-loan consolidation
  const highRateLoans = loans.filter(l => l.rate > 15 && l.accountType !== 'Home Loan' && l.dpd === 0);
  if (highRateLoans.length >= 2 && !hlLoan) {
    const totalOs = highRateLoans.reduce((s, l) => s + l.outstanding, 0);
    const totalOldEmi = highRateLoans.reduce((s, l) => s + l.emi, 0);
    const consolidateRate = cibil >= 750 ? 13 : cibil >= 700 ? 14.5 : 16;
    const months = 48;
    const newEmi_ = calcEmi(totalOs, consolidateRate, months);
    const emiFreed = Math.max(0, totalOldEmi - newEmi_);
    const blendedOld = highRateLoans.reduce((s, l) => s + l.rate * l.outstanding, 0) / totalOs;
    const saved = intSaved(totalOs, blendedOld, consolidateRate, months);
    const toLender = bestPLLender(cibil, '');

    const globalConsolidate: ExtendedStrategy = {
      id: nextId(), tag: 'CONSOLIDATE',
      title: `Consolidate ${highRateLoans.length} high-rate loans → 1 loan @ ${consolidateRate}%`,
      reason: `You have ${highRateLoans.length} loans with blended rate ${blendedOld.toFixed(1)}%. Consolidating all into a single ${consolidateRate}% loan via ${toLender} saves ${formatInrShort(saved)}, simplifies to 1 EMI, and may improve your CIBIL score by reducing credit utilization.`,
      fromLoan: { lender: `${highRateLoans.length} loans @ avg ${blendedOld.toFixed(1)}%`, rate: +blendedOld.toFixed(1), outstanding: totalOs },
      toLoan: { lender: toLender, rate: consolidateRate, amount: totalOs },
      monthlyEmiFreed: emiFreed, totalInterestSaved: saved,
      lumpSumAvailable: 0, netSaving: Math.max(0, saved * 0.85),
      conflictsWith: [], fees: { pf: 1.5, fc: 2 },
      eligibility: `Total: ${formatInrShort(totalOs)} — within PL limits. CIBIL ${cibil}. DTI must be < 55% of income.`,
      recommendation: `Simplification + savings. A single EMI is easier to manage. Closing multiple accounts may temporarily dip CIBIL score (shorter avg age) then recover in 3–6 months.`,
      loanIds: highRateLoans.map(l => l.id),
    };
    results.push({ loanId: -1, loan: { id: -1, lender: 'Multiple', accountType: 'Multiple Loans', accountNumber: '', sanctionAmount: totalOs, outstanding: totalOs, emi: totalOldEmi, rate: +blendedOld.toFixed(1), dpd: 0, closureMonths: months }, strategies: [globalConsolidate], recommended: globalConsolidate });
  }

  // LAP strategy (if own house, no HL)
  if (ownHouse && !hlLoan && houseValue > 500000) {
    const lapRate = 10.5;
    const ltvPct = 0.65;
    const maxLap = houseValue * ltvPct;
    const highCostLoans = loans.filter(l => l.rate > lapRate && l.dpd === 0);
    const totalHCDebt = highCostLoans.reduce((s, l) => s + l.outstanding, 0);
    if (maxLap > 100000 && highCostLoans.length > 0) {
      const lapAmt = Math.min(maxLap, totalHCDebt);
      const blendedOld = highCostLoans.reduce((s, l) => s + l.rate * l.outstanding, 0) / totalHCDebt;
      const saved = intSaved(totalHCDebt, blendedOld, lapRate, 60);
      const lumpLeft = Math.max(0, maxLap - totalHCDebt);

      const lapStrat: ExtendedStrategy = {
        id: nextId(), tag: 'LAP',
        title: `LAP @ ${lapRate}% on your property — eliminate high-cost debt`,
        reason: `Your property (${formatInrShort(houseValue)}) qualifies for LAP up to ${formatInrShort(maxLap)} (65% LTV). Using ${formatInrShort(lapAmt)} to replace ${blendedOld.toFixed(1)}% blended debt saves ${formatInrShort(saved)} over 5 years. Remaining ${formatInrShort(lumpLeft)} can fund growth.`,
        fromLoan: { lender: `High-cost loans @ ${blendedOld.toFixed(1)}%`, rate: +blendedOld.toFixed(1), outstanding: totalHCDebt },
        toLoan: { lender: 'LAP (HDFC / Axis / Tata)', rate: lapRate, amount: lapAmt },
        monthlyEmiFreed: 0, totalInterestSaved: saved,
        lumpSumAvailable: lumpLeft, netSaving: Math.max(0, saved * 0.85),
        conflictsWith: [], fees: { pf: 1, fc: 2 },
        eligibility: `65% LTV = ${formatInrShort(maxLap)}. Property free of litigation. LAP tenure up to 15 years. Tax deductible under Sec 24(b).`,
        recommendation: `LAP converts expensive unsecured debt into cheap secured debt. At ${lapRate}%, this is cheapest borrowing available without a home loan. Recommended if debt > ₹5L and property is clear.`,
        loanIds: highCostLoans.map(l => l.id),
      };
      results.push({ loanId: -2, loan: { id: -2, lender: 'Property', accountType: 'Property (LAP)', accountNumber: '', sanctionAmount: maxLap, outstanding: 0, emi: 0, rate: lapRate, dpd: 0, closureMonths: 120 }, strategies: [lapStrat], recommended: lapStrat });
    }
  }

  // ── CLOSE LOAN FASTER strategies (per loan, sorted by rate) ─────────────────
  for (const loan of sorted.slice(0, 3)) { // top 3 highest-rate loans
    if (loan.outstanding < 10000 || loan.closureMonths < 3) continue;
    // Recommend monthly prepayment = EMI * 1.5x (pay 50% extra)
    const extraMonthly = Math.round(loan.emi * 0.50);
    const baseTotal = loan.emi * loan.closureMonths;
    // Approximate months saved with extra payment
    const newPrincipal = loan.outstanding;
    const r = loan.rate / 100 / 12;
    const newEmiTotal = loan.emi + extraMonthly;
    // New months = log(newEmiTotal / (newEmiTotal - newPrincipal * r)) / log(1 + r)
    let newMonths = loan.closureMonths;
    if (r > 0) {
      const denom = newEmiTotal - newPrincipal * r;
      if (denom > 0) newMonths = Math.ceil(Math.log(newEmiTotal / denom) / Math.log(1 + r));
    }
    const monthsSaved = Math.max(0, loan.closureMonths - newMonths);
    const interestSavings = Math.max(0, baseTotal - (newEmiTotal * newMonths));

    if (monthsSaved > 0 && interestSavings > 5000) {
      const closeFastStrat: ExtendedStrategy = {
        id: nextId(), tag: 'PARTIAL',
        title: `Close ${loan.lender} ${loan.accountType} ${monthsSaved} months early`,
        reason: `Paying ₹${formatInrShort(extraMonthly)} extra/month (50% more than EMI) on your ${loan.rate}% loan closes it ${monthsSaved} months early, saving ${formatInrShort(Math.round(interestSavings))} in interest. The extra payment goes 100% to principal reduction.`,
        fromLoan: { lender: loan.lender, rate: loan.rate, outstanding: loan.outstanding },
        toLoan: { lender: loan.lender, rate: loan.rate, amount: loan.outstanding },
        monthlyEmiFreed: 0,
        totalInterestSaved: Math.round(interestSavings),
        lumpSumAvailable: 0,
        netSaving: Math.round(interestSavings),
        conflictsWith: [],
        fees: undefined,
        eligibility: `Floating rate loans: extra payments go to principal — no charges. Fixed rate: check your loan agreement. Minimum extra payment: ${formatInrShort(loan.emi * 3)} (3 EMIs at once) for full prepayment benefit.`,
        recommendation: `💡 Start immediately — every month of compounding at ${loan.rate}% is expensive. Extra ₹${formatInrShort(extraMonthly)}/month closes this loan by ${new Date(new Date().getFullYear(), new Date().getMonth() + newMonths).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} vs current ${new Date(new Date().getFullYear(), new Date().getMonth() + loan.closureMonths).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}.`,
        loanIds: [loan.id],
        subTag: undefined,
      };
      // Add to the existing loan group if it exists, or create a new group
      const existingGroup = results.find(g => g.loanId === loan.id);
      if (existingGroup) {
        existingGroup.strategies.push(closeFastStrat);
      } else {
        results.push({ loanId: loan.id, loan, strategies: [closeFastStrat], recommended: closeFastStrat });
      }
    }
  }

  // EMI overload warning
  if (income > 0 && totalEmi / income > 0.65) {
    const emiRatio = Math.round((totalEmi / income) * 100);
    const warnStrat: ExtendedStrategy = {
      id: nextId(), tag: 'PARTIAL',
      title: `⚠️ EMI Overload: ${emiRatio}% of income — critical`,
      reason: `Total EMI ${formatInrShort(totalEmi)}/month = ${emiRatio}% of your income. Healthy maximum is 50%. You have minimal buffer for emergencies. Executing the BT and consolidation strategies above will bring this ratio down.`,
      monthlyEmiFreed: 0, // This is a warning, not an actual action — do not add to wealth totals
      totalInterestSaved: 0, lumpSumAvailable: 0, netSaving: 0,
      conflictsWith: [], fees: undefined,
      eligibility: 'Request tenure extension on HL or largest loan — reduces EMI immediately, increases total interest. Combine with rate reduction.',
      recommendation: `Step 1: Execute highest-impact BT strategy → Step 2: Tenure extension on HL → Step 3: Foreclose smallest loan with any lump sum. Target: EMI < 50% of income (${formatInrShort(Math.round(income * 0.50))}/mo).`,
      loanIds: loans.map(l => l.id),
    };
    results.push({ loanId: -3, loan: { id: -3, lender: 'Overall', accountType: 'EMI Health', accountNumber: '', sanctionAmount: 0, outstanding: totalEmi * 12, emi: totalEmi, rate: 0, dpd: 0, closureMonths: 12 }, strategies: [warnStrat], recommended: warnStrat });
  }

  // ─── Cross-group conflict propagation ─────────────────────────────────────
  const allStrats = results.flatMap(r => r.strategies);
  allStrats.forEach(s => {
    allStrats.forEach(other => {
      if (s.id !== other.id && s.loanIds.some(lid => other.loanIds.includes(lid) && lid > 0)) {
        if (!s.conflictsWith.includes(other.id)) s.conflictsWith.push(other.id);
        if (!other.conflictsWith.includes(s.id)) other.conflictsWith.push(s.id);
      }
    });
  });

  return results;
}
