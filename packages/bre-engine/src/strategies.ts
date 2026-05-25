// ─────────────────────────────────────────────────────────────
// FINFINITY BRE ENGINE — Strategy Builder
// Core logic authored by BRE head. Port of LoanStrategyOptimizer.html
// Only enhance, never break existing logic.
// ─────────────────────────────────────────────────────────────
import { BREInput, BREOutput, BureauLoan, Strategy } from './types';
import {
  N, fmt, emi, totalInt, intSaved, sipFV, lumpFV, blendedRate
} from './calculators';
import { topupEligibility } from './topup';
import { lapEligibility } from './lap';
import { getDefaultFees } from './fees';

export function buildStrategies(input: BREInput): BREOutput {
  const { bureau, profile, loanFees, assumptions, cibilScore = 700 } = input;
  const loans = bureau.filter(l => l.isActive && l.outstanding > 0);
  const income = N(profile.income);
  const isSal = profile.employment === 'salaried';
  const houseValue = N(profile.houseValue);
  const strategies: Strategy[] = [];
  let sid = 1;

  const hl  = loans.find(l => l.type === 'hl');
  const cc  = loans.find(l => l.type === 'cc');
  const pl  = loans.find(l => l.type === 'pl');
  const car = loans.find(l => l.type === 'car');
  const bl  = loans.find(l => l.type === 'bl');

  const totalEMI = loans.reduce((s, l) => s + l.emi, 0);
  const emiRatio = income > 0 ? totalEMI / income : 0;

  // Pre-compute top-up eligibility on HL (used across multiple strategies)
  const tuHL = hl ? topupEligibility(hl, houseValue) : null;

  // ── STRATEGY 1: EMI Burden Warning (priority 0) ──
  if (income > 0 && emiRatio > 0.75) {
    const targetEMI = income * 0.50;
    const excessEMI = totalEMI - targetEMI;
    strategies.push({
      id: sid++, tag: 'EMI RELIEF', tagClass: 'badge-amber', priority: 0,
      icon: '⚠️📉', title: 'Reduce EMI Burden — Currently at Critical Level',
      fromLabel: `Current total EMI ${(emiRatio * 100).toFixed(0)}% of income`,
      fromRate: 0, fromBal: 0, fromEMI: Math.round(totalEMI),
      toLabel: 'Target: max 50% of income', toRate: 0, toTenure: 0,
      newEMI: Math.round(targetEMI),
      totalSaving: 0, emiSaving: Math.round(excessEMI), annualSaving: Math.round(excessEMI * 12),
      lumpAvail: 0,
      reason: `Your total EMI is ${fmt(totalEMI)}/month — ${(emiRatio * 100).toFixed(0)}% of net income. This is financially dangerous (>75%). Immediate steps: (1) Use consolidation strategies below, (2) request tenure extension on HL/PL, (3) foreclose smallest loan first.`,
      eligibility: 'Tenure extension typically available on HL and business loans. Tenure extension reduces EMI but increases total interest — combine with rate reduction for best outcome.',
      taxBenefit: false,
      isWarning: true,
    });
  }

  // ── STRATEGY 2: CC → PL Balance Transfer ──
  if (cc && cc.outstanding > 0 && cc.dpd === 0) {
    const newRate = isSal ? 13.5 : 15.0;
    const tenure = 24;
    const newEmi_ = emi(cc.outstanding, newRate, tenure);
    const saving = intSaved(cc.outstanding, cc.rate, newRate, tenure);
    const emiSave = emi(cc.outstanding, cc.rate, Math.min(cc.tenureRemaining, 12)) - newEmi_;
    strategies.push({
      id: sid++, tag: 'URGENT', tagClass: 'badge-red', priority: 1,
      icon: '💳→💼', title: 'Clear Credit Card via Personal Loan BT',
      fromLabel: 'Credit Card', fromRate: cc.rate, fromBal: cc.outstanding, fromEMI: cc.emi,
      toLabel: `Personal Loan BT`, toRate: newRate, toTenure: tenure,
      newEMI: Math.round(newEmi_),
      totalSaving: Math.round(saving),
      emiSaving: Math.round(Math.max(0, emiSave)),
      annualSaving: Math.round(cc.outstanding * (cc.rate - newRate) / 100),
      lumpAvail: 0,
      reason: `Credit card interest at ${cc.rate}% is the most expensive debt — 2–3× higher than a personal loan. Converting to a term loan at ${newRate}% immediately frees up ${fmt(Math.round(Math.max(0, emiSave)))}/month and eliminates revolving interest.`,
      eligibility: 'Eligible if credit score ≥ 700 and income is verified. Process time: 2–5 days.',
      taxBenefit: false,
      conflictGroup: 'cc_action',
    });
  }

  // ── STRATEGY 3: HL Balance Transfer (Rate Reduction) ──
  if (hl && hl.outstanding > 0) {
    const marketRate = 8.5;
    if (hl.rate > marketRate + 0.25) {
      const tenure = hl.tenureRemaining;
      const newEmi_ = emi(hl.outstanding, marketRate, tenure);
      const saving = intSaved(hl.outstanding, hl.rate, marketRate, tenure);

      // Fees
      if (!loanFees[hl.id]) {
        const def = getDefaultFees(hl);
        loanFees[hl.id] = { pf: def.pf, fc: def.fc };
      }
      const fees = loanFees[hl.id];
      const totalTransferCost = fees.pf + fees.fc;
      const netSaving = Math.max(0, saving - totalTransferCost);
      const breakEvenMonths = totalTransferCost > 0 && (hl.emi - newEmi_) > 0
        ? Math.ceil(totalTransferCost / (hl.emi - newEmi_)) : 0;

      strategies.push({
        id: sid++, tag: 'RATE REDUCTION', tagClass: 'badge-blue', priority: 2,
        icon: '🔀🏠', title: `Home Loan Balance Transfer to ${marketRate}%`,
        fromLabel: `${hl.lender} @ ${hl.rate}%`, fromRate: hl.rate, fromBal: hl.outstanding, fromEMI: hl.emi,
        toLabel: `New Lender @ ${marketRate}%`, toRate: marketRate, toTenure: tenure,
        newEMI: Math.round(newEmi_),
        totalSaving: Math.round(saving),
        emiSaving: Math.round(Math.max(0, hl.emi - newEmi_)),
        annualSaving: Math.round(hl.outstanding * (hl.rate - marketRate) / 100),
        lumpAvail: 0,
        reason: `Your current rate ${hl.rate}% is ${(hl.rate - marketRate).toFixed(2)}% above today's best HL rate of ${marketRate}%. On ${fmt(hl.outstanding)}, even a 0.5% saving is ${fmt(hl.outstanding * 0.005)} annually. A BT locks in the saving for all ${Math.round(tenure / 12)} remaining years.`,
        eligibility: '6 months clean repayment required for BT. Processing fee ~0.5–1% of loan. Savings typically exceed BT cost within 12–18 months.',
        taxBenefit: true, taxNote: 'All home loan deductions (80C principal ₹1.5L + 24(b) interest ₹2L) continue uninterrupted after BT.',
        note: `Estimated transfer cost: ${fmt(totalTransferCost)} (PF: ${fmt(fees.pf)} + Foreclosure: ${fmt(fees.fc)}). Break-even: ~${breakEvenMonths} months. Net saving after costs: ${fmt(netSaving)}.`,
        conflictGroup: 'hl_action',
        loanId: hl.id,
        transferCost: totalTransferCost,
        netSaving: Math.round(netSaving),
        breakEvenMonths,
      });
    }
  }

  // ── STRATEGY 4: CC + PL → HL Top-up Consolidation ──
  if (hl && hl.outstanding > 0 && (cc?.outstanding || pl?.outstanding) && tuHL) {
    // Only include loans with rate HIGHER than the top-up rate
    const ccAmt = (cc && cc.outstanding > 0 && cc.rate > tuHL.topupRate) ? cc.outstanding : 0;
    const plAmt = (pl && pl.outstanding > 0 && pl.rate > tuHL.topupRate)
      ? Math.min(pl.outstanding, tuHL.eligibleTopup - ccAmt) : 0;
    const consolidateAmt = Math.min(ccAmt + plAmt, tuHL.eligibleTopup);

    if (consolidateAmt > 50000) {
      const fromLoans = [
        ccAmt > 0 ? `CC ${fmt(ccAmt)} @${cc!.rate}%` : '',
        plAmt > 0 ? `PL ${fmt(plAmt)} @${pl!.rate}%` : '',
      ].filter(Boolean).join(' + ');

      const highCostLoans = [
        ...(ccAmt > 0 ? [{ outstanding: ccAmt, rate: cc!.rate }] : []),
        ...(plAmt > 0 ? [{ outstanding: plAmt, rate: pl!.rate }] : []),
      ];
      const blendedOldRate = blendedRate(highCostLoans);

      const oldEMI_total = (ccAmt > 0 ? emi(ccAmt, cc!.rate, cc!.tenureRemaining) : 0)
        + (plAmt > 0 ? emi(plAmt, pl!.rate, pl!.tenureRemaining) : 0);
      const newTenure = Math.min(hl.tenureRemaining, 120);
      const newEmi_ = emi(consolidateAmt, tuHL.topupRate, newTenure);
      const saving = intSaved(consolidateAmt, blendedOldRate, tuHL.topupRate, newTenure);

      strategies.push({
        id: sid++, tag: 'BEST SAVINGS', tagClass: 'badge-mint', priority: 3,
        icon: '🏠⬆️', title: 'Consolidate High-Cost Loans via HL Top-up',
        fromLabel: fromLoans, fromRate: +blendedOldRate.toFixed(1),
        fromBal: consolidateAmt, fromEMI: Math.round(oldEMI_total),
        toLabel: `Home Loan Top-up @ ${tuHL.topupRate}%`, toRate: tuHL.topupRate, toTenure: newTenure,
        newEMI: Math.round(newEmi_),
        totalSaving: Math.round(saving),
        emiSaving: Math.round(Math.max(0, oldEMI_total - newEmi_)),
        annualSaving: Math.round(consolidateAmt * (blendedOldRate - tuHL.topupRate) / 100),
        lumpAvail: 0,
        reason: `Your home loan has ${hl.tenureElapsed} months of clean repayment — making you eligible for a top-up of up to ${fmt(tuHL.eligibleTopup)} at ${tuHL.topupRate}%. Wiping CC/PL with this saves an enormous amount in interest. Only higher-rate loans (>${tuHL.topupRate}%) are included.`,
        eligibility: `Based on ${hl.tenureElapsed} months repayment track. Eligible for ${(tuHL.maxPctOfSanction * 100).toFixed(0)}% of original sanction. Net eligible top-up: ${fmt(tuHL.eligibleTopup)} after LTV cap of 75%.`,
        taxBenefit: true, taxNote: 'Section 24(b): Top-up interest deductible up to ₹2L p.a. if used for home improvement/repayment.',
        conflictGroup: 'hl_action',
      });
    }
  }

  // ── STRATEGY 5: PL → Car Loan Top-up ──
  if (pl && pl.outstanding > 0 && car && car.outstanding > 0 && car.tenureElapsed >= 12 && car.dpd === 0) {
    const maxTopupPct = car.tenureElapsed >= 24 ? 0.25 : car.tenureElapsed >= 18 ? 0.15 : 0.10;
    const maxTopup = car.outstanding * maxTopupPct;
    const topupAmt = Math.min(pl.outstanding, maxTopup);
    if (topupAmt > 30000) {
      const topupRate = car.rate + 0.5;
      const oldEMI_ = emi(topupAmt, pl.rate, pl.tenureRemaining);
      const newEmi_ = emi(topupAmt, topupRate, car.tenureRemaining);
      const saving = intSaved(topupAmt, pl.rate, topupRate, Math.min(pl.tenureRemaining, car.tenureRemaining));
      strategies.push({
        id: sid++, tag: 'PARTIAL RELIEF', tagClass: 'badge-purple', priority: 6,
        icon: '🚗⬆️', title: 'Partial PL Closure via Car Loan Top-up',
        fromLabel: `PL ${fmt(topupAmt)} @ ${pl.rate}%`, fromRate: pl.rate, fromBal: topupAmt, fromEMI: Math.round(oldEMI_),
        toLabel: `Car Top-up @ ${topupRate}%`, toRate: topupRate, toTenure: car.tenureRemaining,
        newEMI: Math.round(newEmi_),
        totalSaving: Math.round(saving),
        emiSaving: Math.round(Math.max(0, oldEMI_ - newEmi_)),
        annualSaving: Math.round(topupAmt * (pl.rate - topupRate) / 100),
        lumpAvail: 0,
        reason: `Car loan top-up (up to ${(maxTopupPct * 100).toFixed(0)}% of current OS) can partially repay your personal loan, reducing the higher-cost PL burden. Top-up available: ${fmt(maxTopup)}, applied to reduce PL: ${fmt(topupAmt)}.`,
        eligibility: `Car loan has ${car.tenureElapsed} months clean track. Top-up limited to ${(maxTopupPct * 100).toFixed(0)}% of outstanding. Max available: ${fmt(maxTopup)}.`,
        taxBenefit: false,
        conflictGroup: 'pl_action',
      });
    }
  }

  // ── STRATEGY 6: Business Loan → Dropline OD ──
  if (bl && bl.outstanding > 0 && bl.dpd === 0) {
    const odRate = 11.5;
    if (bl.rate > odRate + 1) {
      const tenure = bl.tenureRemaining;
      const newEmi_ = emi(bl.outstanding, odRate, tenure);
      const saving = intSaved(bl.outstanding, bl.rate, odRate, tenure);
      strategies.push({
        id: sid++, tag: 'SELF-EMPLOYED', tagClass: 'badge-purple', priority: 4,
        icon: '🔄🏢', title: 'Shift Business Loan to Dropline Overdraft',
        fromLabel: `Business Loan @ ${bl.rate}%`, fromRate: bl.rate, fromBal: bl.outstanding, fromEMI: bl.emi,
        toLabel: `Dropline OD @ ${odRate}%`, toRate: odRate, toTenure: tenure,
        newEMI: Math.round(newEmi_),
        totalSaving: Math.round(saving),
        emiSaving: Math.round(Math.max(0, bl.emi - newEmi_)),
        annualSaving: Math.round(bl.outstanding * (bl.rate - odRate) / 100),
        lumpAvail: 0,
        reason: `Dropline Overdraft charges interest only on the amount drawn — not the full sanction. Unlike a term loan, you can repay and redraw, aligning perfectly with business cash flows. Rate: ${odRate}% vs your current ${bl.rate}%.`,
        eligibility: 'Business vintage ≥ 2 years. ITR filing required. Property or FD collateral may be needed for large OD limits.',
        taxBenefit: true, taxNote: 'OD interest 100% deductible as business expense under Income Tax Act.',
        conflictGroup: 'bl_action',
      });
    }
  }

  // ── STRATEGY 7: LAP on Owned House (no active HL) ──
  if (profile.ownHouse && !hl && houseValue > 500000) {
    const lap = lapEligibility(houseValue, 0, false);
    if (lap.eligible > 100000) {
      const lapRate = 10.5;
      const tenure = 120;
      const totalHighCostDebt = (pl?.outstanding || 0) + (cc?.outstanding || 0) + (bl?.outstanding || 0);
      const lapAmt = Math.min(lap.eligible, Math.max(totalHighCostDebt, 500000));
      const highCostLoans = [
        ...(pl?.outstanding ? [{ outstanding: pl.outstanding, rate: pl.rate }] : []),
        ...(cc?.outstanding ? [{ outstanding: cc.outstanding, rate: cc.rate }] : []),
        ...(bl?.outstanding ? [{ outstanding: bl.outstanding, rate: bl.rate }] : []),
      ];
      const blendedHigh = highCostLoans.length ? blendedRate(highCostLoans) : 18;
      const saving = totalHighCostDebt > 0 ? intSaved(totalHighCostDebt, blendedHigh, lapRate, 60) : 0;
      strategies.push({
        id: sid++, tag: 'UNLOCK EQUITY', tagClass: 'badge-mint', priority: 5,
        icon: '🏛️', title: 'LAP: Mortgage Your House to Eliminate High-Cost Loans',
        fromLabel: `Mixed High-Cost Loans @ ~${blendedHigh.toFixed(1)}%`, fromRate: blendedHigh,
        fromBal: totalHighCostDebt || lapAmt, fromEMI: 0,
        toLabel: `LAP @ ${lapRate}%`, toRate: lapRate, toTenure: tenure,
        newEMI: Math.round(emi(lapAmt, lapRate, tenure)),
        totalSaving: Math.round(saving),
        emiSaving: 0,
        annualSaving: Math.round(lapAmt * (Math.max(0, blendedHigh - lapRate)) / 100),
        lumpAvail: Math.max(0, lap.eligible - (totalHighCostDebt || 0)),
        reason: `Your owned property (value: ${fmt(houseValue)}) qualifies for a Loan Against Property of up to ${fmt(lap.eligible)} (65% LTV). Using this to replace expensive personal/CC/business loans at ${lapRate}% dramatically reduces your interest burden.`,
        eligibility: `LTV capped at 65% = ${fmt(lap.maxLoan)}. Available: ${fmt(lap.eligible)}. LAP tenure up to 15 years. Property must be free of litigation.`,
        taxBenefit: true, taxNote: 'LAP interest is deductible under Section 24(b) if used for home improvement, else as business expense.',
      });
    }
  }

  // ── STRATEGY 8: LAP on Commercial Property ──
  if (profile.hasShop && profile.shopValue > 300000) {
    const propVal = N(profile.shopValue);
    const isComm = profile.shopType === 'commercial';
    const lap = lapEligibility(propVal, 0, isComm);
    if (lap.eligible > 100000) {
      const lapRate = isComm ? 11.5 : 10.5;
      const tenure = 120;
      strategies.push({
        id: sid++, tag: 'COMMERCIAL EQUITY', tagClass: 'badge-blue', priority: 5,
        icon: '🏢🏛️', title: `LAP / Mortgage on ${isComm ? 'Commercial' : 'Residential'} Property`,
        fromLabel: 'Existing high-cost debt', fromRate: 0, fromBal: 0, fromEMI: 0,
        toLabel: `LAP @ ${lapRate}%`, toRate: lapRate, toTenure: tenure,
        newEMI: Math.round(emi(lap.eligible, lapRate, tenure)),
        totalSaving: 0, emiSaving: 0, annualSaving: 0,
        lumpAvail: lap.eligible,
        reason: `Your ${isComm ? 'commercial shop/office' : 'property'} (${fmt(propVal)}) unlocks up to ${fmt(lap.eligible)} as LAP (${(lap.ltvPct * 100).toFixed(0)}% LTV). This can be used to consolidate high-cost loans or fund business growth at a much lower rate of ${lapRate}%.`,
        eligibility: `LTV: ${(lap.ltvPct * 100).toFixed(0)}% of ${fmt(propVal)} = ${fmt(lap.maxLoan)}. Available: ${fmt(lap.eligible)}.`,
        taxBenefit: true, taxNote: 'Interest deductible as business expense for commercial use.',
      });
    }
  }

  // ── STRATEGY 9: HL Top-up for Lump-sum Investment ──
  if (hl && hl.outstanding > 0 && houseValue > 0 && tuHL) {
    const alreadyUsed = (cc?.outstanding || 0) + (pl?.outstanding || 0);
    if (tuHL.eligibleTopup > alreadyUsed + 200000) {
      const lumpAmt = tuHL.eligibleTopup - alreadyUsed;
      const investReturn = N(assumptions.investReturn);
      const years = Math.round((hl.tenureRemaining || 60) / 12);
      const corpus = lumpFV(lumpAmt, investReturn, Math.min(years, 15));
      const interestCost = emi(lumpAmt, tuHL.topupRate, hl.tenureRemaining) * hl.tenureRemaining - lumpAmt;
      const netGain = corpus - interestCost - lumpAmt;
      strategies.push({
        id: sid++, tag: 'WEALTH CREATION', tagClass: 'badge-green', priority: 7,
        icon: '📈🏠', title: 'Invest Lump-sum via HL Top-up for Wealth Creation',
        fromLabel: `Pay HL Top-up EMI @ ${tuHL.topupRate}%`, fromRate: tuHL.topupRate,
        fromBal: lumpAmt, fromEMI: Math.round(emi(lumpAmt, tuHL.topupRate, hl.tenureRemaining)),
        toLabel: `Equity MF / NPS @ ~${investReturn}%`, toRate: investReturn, toTenure: hl.tenureRemaining,
        newEMI: Math.round(emi(lumpAmt, tuHL.topupRate, hl.tenureRemaining)),
        totalSaving: 0, emiSaving: 0, annualSaving: 0,
        lumpAvail: lumpAmt,
        reason: `After consolidating high-cost loans, you have access to additional top-up of ~${fmt(lumpAmt)}. Investing this at ${investReturn}% over ${Math.min(years, 15)} years creates a corpus of ${fmt(corpus)}, exceeding the interest cost of ${fmt(interestCost)} — net gain: ${fmt(Math.max(0, netGain))}.`,
        eligibility: `Borrow at ${tuHL.topupRate}% (HL top-up) and invest at ~${investReturn}% equity CAGR. Net positive arbitrage only works over long horizon (10+ years).`,
        taxBenefit: true, taxNote: 'HL interest deductible under 24(b). Equity MF long-term gains taxed at 10% (above ₹1L). NPS: 80CCD deduction available.',
        conflictGroup: 'hl_action',
        isInvestmentStrategy: true,
        lumpAmt, corpus, interestCost: Math.round(interestCost), netGain: Math.round(Math.max(0, netGain)),
      });
    }
  }

  // ── Add BT vs Consolidation recommendation notes ──
  const btStrat = strategies.find(s => s.conflictGroup === 'hl_action' && s.tag === 'RATE REDUCTION');
  const consStrat = strategies.find(s => s.conflictGroup === 'hl_action' && s.tag === 'BEST SAVINGS');
  if (btStrat && consStrat) {
    const btNet = btStrat.netSaving ?? btStrat.totalSaving;
    const btWins = btNet > consStrat.totalSaving;
    btStrat.recommendation = btWins
      ? `✅ RECOMMENDED — saves ${fmt(Math.max(0, btNet - consStrat.totalSaving))} more (net of transfer costs) compared to consolidation.`
      : `⚠️ Consolidation saves more total interest. Choose BT only if you prefer keeping existing loans separate.`;
    consStrat.recommendation = !btWins
      ? `✅ RECOMMENDED — eliminates high-cost debt and saves more total interest than a simple BT.`
      : `⚠️ HL Balance Transfer saves more after transfer costs. Choose consolidation if you want to simplify multiple loans into one.`;
  }

  // Sort by priority
  strategies.sort((a, b) => a.priority - b.priority || b.totalSaving - a.totalSaving);

  return {
    strategies,
    cibilScore,
    totalDebt: loans.reduce((s, l) => s + l.outstanding, 0),
    totalEMI,
    emiRatio,
    highestRate: loans.length > 0 ? Math.max(...loans.map(l => l.rate)) : 0,
    loansCount: loans.length,
  };
}
