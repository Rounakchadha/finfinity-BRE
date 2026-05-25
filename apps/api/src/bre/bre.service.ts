import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BureauData, Loan } from '../bureau/bureau.service';

/**
 * Strategy — a financial optimization recommendation produced by the BRE.
 */
export interface Strategy {
  id: string;
  type: StrategyType;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedSavings: {
    monthly: number;
    total: number;
    interestSaved: number;
  };
  currentState: Record<string, any>;
  proposedState: Record<string, any>;
  applicableLenders: LenderOffer[];
  cibilImpact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  eligibilityScore: number; // 0–100
  actionLabel: string;
  metadata: Record<string, any>;
}

export type StrategyType =
  | 'HOME_LOAN_BT'
  | 'PL_BT'
  | 'CC_TO_PL_BT'
  | 'DEBT_CONSOLIDATION'
  | 'EMI_REDUCTION'
  | 'TENURE_REDUCTION'
  | 'TOP_UP_LOAN'
  | 'CC_LIMIT_ENHANCE'
  | 'PREPAYMENT';

export interface LenderOffer {
  lender: string;
  rate: number;
  maxAmount: number;
  tenure: number;
  processingFee: number;
  features: string[];
}

// Lender rate configs (demo — replace with live lender API feeds in production)
const LENDER_CONFIGS: Record<string, LenderOffer[]> = {
  HOME_LOAN_BT: [
    { lender: 'SBI', rate: 8.40, maxAmount: 10000000, tenure: 360, processingFee: 0.50, features: ['No prepayment penalty', 'Flexible EMI'] },
    { lender: 'HDFC Bank', rate: 8.50, maxAmount: 15000000, tenure: 360, processingFee: 0.50, features: ['Home loan top-up available', 'Online account management'] },
    { lender: 'ICICI Bank', rate: 8.60, maxAmount: 10000000, tenure: 360, processingFee: 0.50, features: ['Step-up EMI option', 'Instant approval'] },
    { lender: 'Kotak Mahindra', rate: 8.65, maxAmount: 8000000, tenure: 300, processingFee: 0.25, features: ['Zero prepayment charges', 'Digital process'] },
    { lender: 'Axis Bank', rate: 8.70, maxAmount: 10000000, tenure: 360, processingFee: 1.00, features: ['Special women borrower rates', 'Part-payment allowed'] },
  ],
  PL_BT: [
    { lender: 'HDFC Bank', rate: 10.50, maxAmount: 1500000, tenure: 60, processingFee: 1.50, features: ['Same-day disbursal', 'No collateral'] },
    { lender: 'Bajaj Finance', rate: 11.00, maxAmount: 2500000, tenure: 60, processingFee: 2.00, features: ['Flexi loan option', 'Pre-approved for select customers'] },
    { lender: 'ICICI Bank', rate: 10.65, maxAmount: 2000000, tenure: 60, processingFee: 1.50, features: ['Instant e-approval', 'Minimal documentation'] },
    { lender: 'Axis Bank', rate: 10.49, maxAmount: 1500000, tenure: 60, processingFee: 1.50, features: ['24-hour disbursal', 'No prepayment after 12 months'] },
    { lender: 'Tata Capital', rate: 10.99, maxAmount: 3500000, tenure: 72, processingFee: 2.50, features: ['High ticket personal loans', 'Flexible tenure'] },
  ],
  CC_TO_PL_BT: [
    { lender: 'HDFC Bank', rate: 10.50, maxAmount: 500000, tenure: 48, processingFee: 1.50, features: ['Convert CC dues to PL', 'Structured repayment'] },
    { lender: 'ICICI Bank', rate: 10.65, maxAmount: 500000, tenure: 36, processingFee: 1.00, features: ['No additional documentation', 'Instant for existing customers'] },
    { lender: 'Kotak Mahindra', rate: 10.99, maxAmount: 300000, tenure: 36, processingFee: 1.50, features: ['Online process', 'Flexible repayment'] },
  ],
  DEBT_CONSOLIDATION: [
    { lender: 'HDFC Bank', rate: 11.00, maxAmount: 3000000, tenure: 60, processingFee: 1.50, features: ['Single EMI', 'Simplified management'] },
    { lender: 'Bajaj Finance', rate: 12.00, maxAmount: 3500000, tenure: 60, processingFee: 2.00, features: ['High amount consolidation', 'Flexi option'] },
    { lender: 'Tata Capital', rate: 11.50, maxAmount: 3500000, tenure: 72, processingFee: 2.50, features: ['Long tenure for low EMI', 'Part-payment facility'] },
  ],
};

@Injectable()
export class BREService {
  private readonly logger = new Logger(BREService.name);

  // In-memory strategy cache per user session
  private readonly strategyCache = new Map<string, Strategy[]>();

  /**
   * buildStrategies — main BRE entry point.
   *
   * Analyzes bureau data and generates ranked financial optimization strategies.
   *
   * NOTE: This imports logic from @finfinity/bre-engine when the package is available.
   * The engine package contains the full decision tree, scoring, and ranking algorithms.
   * Here we provide a complete inline implementation that matches the engine interface.
   *
   * PRODUCTION: Uncomment the import below and remove the inline implementation:
   *   import { buildStrategies } from '@finfinity/bre-engine';
   *   const strategies = await buildStrategies(bureau, profile);
   */
  async buildStrategies(
    bureau: BureauData,
    profile: any = {},
    userId: string,
  ): Promise<Strategy[]> {
    this.logger.log(`Building strategies for userId=${userId}`);

    const strategies: Strategy[] = [];
    const monthlyIncome =
      profile?.monthlyIncome || bureau.personalInfo?.monthlyIncome || 50000;

    // ── Rule 1: Home Loan Balance Transfer ─────────────────────────────────
    const homeLoans = bureau.loans.filter(
      l => l.type === 'Home Loan' && l.status === 'ACTIVE',
    );

    for (const hl of homeLoans) {
      if (hl.rate > 9.0 && hl.remaining > 24) {
        const bestOffer = LENDER_CONFIGS.HOME_LOAN_BT[0];
        const rateDiff = hl.rate - bestOffer.rate;

        // Calculate monthly savings
        const monthlyRateOld = hl.rate / 100 / 12;
        const monthlyRateNew = bestOffer.rate / 100 / 12;
        const newEmi = Math.round(
          hl.outstanding * monthlyRateNew * Math.pow(1 + monthlyRateNew, hl.remaining) /
          (Math.pow(1 + monthlyRateNew, hl.remaining) - 1),
        );
        const monthlySavings = hl.emi - newEmi;
        const totalSavings = monthlySavings * hl.remaining;
        const interestOld = hl.emi * hl.remaining - hl.outstanding;
        const interestNew = newEmi * hl.remaining - hl.outstanding;

        strategies.push({
          id: `hl-bt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'HOME_LOAN_BT',
          title: 'Home Loan Balance Transfer',
          description: `Your home loan with ${hl.lender} is at ${hl.rate}% — significantly higher than current market rates of ${bestOffer.rate}%. Transferring could save you ₹${monthlySavings.toLocaleString('en-IN')}/month.`,
          priority: rateDiff > 1.5 ? 'HIGH' : 'MEDIUM',
          estimatedSavings: {
            monthly: monthlySavings,
            total: totalSavings,
            interestSaved: Math.max(0, interestOld - interestNew),
          },
          currentState: {
            lender: hl.lender,
            rate: hl.rate,
            emi: hl.emi,
            outstanding: hl.outstanding,
            remainingTenure: hl.remaining,
          },
          proposedState: {
            lender: bestOffer.lender,
            rate: bestOffer.rate,
            emi: newEmi,
            outstanding: hl.outstanding,
            remainingTenure: hl.remaining,
          },
          applicableLenders: LENDER_CONFIGS.HOME_LOAN_BT.filter(
            o => o.maxAmount >= hl.outstanding,
          ),
          cibilImpact: 'NEUTRAL',
          eligibilityScore: this.calcEligibilityScore(bureau, 'HOME_LOAN_BT'),
          actionLabel: 'Apply for Balance Transfer',
          metadata: { sourceLoandId: `${hl.lender}-${hl.startDate}`, rateDiff },
        });
      }
    }

    // ── Rule 2: Personal Loan Balance Transfer (high-rate PL) ──────────────
    const highRatePls = bureau.loans.filter(
      l => l.type === 'Personal Loan' && l.status === 'ACTIVE' && l.rate > 14,
    );

    for (const pl of highRatePls) {
      if (pl.remaining > 6) {
        const bestOffer = LENDER_CONFIGS.PL_BT[0];
        const monthlyRateNew = bestOffer.rate / 100 / 12;
        const newEmi = Math.round(
          pl.outstanding * monthlyRateNew * Math.pow(1 + monthlyRateNew, pl.remaining) /
          (Math.pow(1 + monthlyRateNew, pl.remaining) - 1),
        );
        const monthlySavings = pl.emi - newEmi;

        strategies.push({
          id: `pl-bt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'PL_BT',
          title: 'Personal Loan Balance Transfer',
          description: `Your personal loan at ${pl.rate}% is above market. Transfer to ${bestOffer.rate}% and save ₹${monthlySavings.toLocaleString('en-IN')}/month for ${pl.remaining} months.`,
          priority: pl.rate > 18 ? 'HIGH' : 'MEDIUM',
          estimatedSavings: {
            monthly: Math.max(0, monthlySavings),
            total: Math.max(0, monthlySavings * pl.remaining),
            interestSaved: Math.max(0, (pl.emi - newEmi) * pl.remaining),
          },
          currentState: { lender: pl.lender, rate: pl.rate, emi: pl.emi, outstanding: pl.outstanding },
          proposedState: { lender: bestOffer.lender, rate: bestOffer.rate, emi: newEmi, outstanding: pl.outstanding },
          applicableLenders: LENDER_CONFIGS.PL_BT.filter(o => o.maxAmount >= pl.outstanding),
          cibilImpact: 'NEUTRAL',
          eligibilityScore: this.calcEligibilityScore(bureau, 'PL_BT'),
          actionLabel: 'Transfer Personal Loan',
          metadata: { sourceLender: pl.lender, rateDiff: pl.rate - bestOffer.rate },
        });
      }
    }

    // ── Rule 3: CC → PL Balance Transfer (high-utilization / high-rate CC) ─
    const highUtilCCs = bureau.creditCards.filter(c => c.utilization > 30);

    if (highUtilCCs.length > 0) {
      const totalCcDebt = highUtilCCs.reduce((s, c) => s + c.outstanding, 0);

      if (totalCcDebt > 20000) {
        const bestOffer = LENDER_CONFIGS.CC_TO_PL_BT[0];
        const ccRate = 36; // Average CC interest rate ~36% per annum
        const monthlyRateCC = ccRate / 100 / 12;
        const monthlyRatePL = bestOffer.rate / 100 / 12;
        const tenure = 24; // Convert to 24-month PL

        const ccMonthlyInterest = Math.round(totalCcDebt * monthlyRateCC);
        const newEmi = Math.round(
          totalCcDebt * monthlyRatePL * Math.pow(1 + monthlyRatePL, tenure) /
          (Math.pow(1 + monthlyRatePL, tenure) - 1),
        );
        const monthlySavings = ccMonthlyInterest - newEmi;

        strategies.push({
          id: `cc-bt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'CC_TO_PL_BT',
          title: 'Credit Card Debt → Personal Loan',
          description: `You have ₹${totalCcDebt.toLocaleString('en-IN')} in credit card dues at ~36% interest. Converting to a personal loan at ${bestOffer.rate}% saves ₹${Math.abs(monthlySavings).toLocaleString('en-IN')}/month and provides a structured repayment schedule.`,
          priority: totalCcDebt > 100000 ? 'HIGH' : 'MEDIUM',
          estimatedSavings: {
            monthly: Math.max(0, monthlySavings),
            total: Math.max(0, monthlySavings * tenure),
            interestSaved: Math.max(0, ccMonthlyInterest * tenure - (newEmi * tenure - totalCcDebt)),
          },
          currentState: {
            cards: highUtilCCs.length,
            totalDebt: totalCcDebt,
            avgUtilization: Math.round(highUtilCCs.reduce((s, c) => s + c.utilization, 0) / highUtilCCs.length),
            effectiveRate: ccRate,
          },
          proposedState: {
            lender: bestOffer.lender,
            rate: bestOffer.rate,
            emi: newEmi,
            tenure,
          },
          applicableLenders: LENDER_CONFIGS.CC_TO_PL_BT.filter(o => o.maxAmount >= totalCcDebt),
          cibilImpact: 'POSITIVE', // Lower utilization improves CIBIL
          eligibilityScore: this.calcEligibilityScore(bureau, 'CC_TO_PL_BT'),
          actionLabel: 'Convert to Personal Loan',
          metadata: { totalCcDebt, numCards: highUtilCCs.length },
        });
      }
    }

    // ── Rule 4: Debt Consolidation (multiple loans) ─────────────────────────
    const activeLoans = bureau.loans.filter(l => l.status === 'ACTIVE');
    if (activeLoans.length >= 3) {
      const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding, 0);
      const totalEmi = activeLoans.reduce((s, l) => s + l.emi, 0);
      const emiRatio = totalEmi / monthlyIncome;

      if (emiRatio > 0.5 && totalOutstanding > 500000) {
        const bestOffer = LENDER_CONFIGS.DEBT_CONSOLIDATION[0];
        const tenure = 60;
        const monthlyRate = bestOffer.rate / 100 / 12;
        const newEmi = Math.round(
          totalOutstanding * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
          (Math.pow(1 + monthlyRate, tenure) - 1),
        );

        strategies.push({
          id: `consolidate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'DEBT_CONSOLIDATION',
          title: 'Debt Consolidation',
          description: `You have ${activeLoans.length} active loans with total EMI of ₹${totalEmi.toLocaleString('en-IN')} (${Math.round(emiRatio * 100)}% of income). Consolidating saves ₹${Math.max(0, totalEmi - newEmi).toLocaleString('en-IN')}/month with one simple EMI.`,
          priority: emiRatio > 0.6 ? 'HIGH' : 'MEDIUM',
          estimatedSavings: {
            monthly: Math.max(0, totalEmi - newEmi),
            total: Math.max(0, (totalEmi - newEmi) * tenure),
            interestSaved: 0, // Varies — show conservative estimate
          },
          currentState: {
            numLoans: activeLoans.length,
            totalEmi,
            totalOutstanding,
            emiRatio: Math.round(emiRatio * 100),
          },
          proposedState: {
            lender: bestOffer.lender,
            rate: bestOffer.rate,
            emi: newEmi,
            tenure,
            singleLoan: true,
          },
          applicableLenders: LENDER_CONFIGS.DEBT_CONSOLIDATION.filter(o => o.maxAmount >= totalOutstanding),
          cibilImpact: 'POSITIVE',
          eligibilityScore: this.calcEligibilityScore(bureau, 'DEBT_CONSOLIDATION'),
          actionLabel: 'Consolidate Loans',
          metadata: { numLoans: activeLoans.length, emiRatio: Math.round(emiRatio * 100) },
        });
      }
    }

    // ── Rule 5: EMI Reduction via Tenure Extension ──────────────────────────
    const highEmiLoans = bureau.loans.filter(
      l => l.status === 'ACTIVE' && l.emi / monthlyIncome > 0.25,
    );

    for (const loan of highEmiLoans.slice(0, 1)) {
      // Extend tenure by 50% if possible
      const extendedTenure = Math.min(loan.remaining + Math.floor(loan.remaining * 0.5), 360);
      const monthlyRate = loan.rate / 100 / 12;
      const newEmi = Math.round(
        loan.outstanding * monthlyRate * Math.pow(1 + monthlyRate, extendedTenure) /
        (Math.pow(1 + monthlyRate, extendedTenure) - 1),
      );

      if (loan.emi - newEmi > 2000) {
        strategies.push({
          id: `emi-reduce-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'EMI_REDUCTION',
          title: 'Reduce EMI via Tenure Extension',
          description: `Extend your ${loan.type} tenure to reduce monthly EMI by ₹${(loan.emi - newEmi).toLocaleString('en-IN')}. Improves monthly cash flow.`,
          priority: 'LOW',
          estimatedSavings: {
            monthly: loan.emi - newEmi,
            total: 0, // Total cost increases — this is cash flow relief
            interestSaved: -(newEmi * extendedTenure - loan.emi * loan.remaining), // negative = extra cost
          },
          currentState: { lender: loan.lender, emi: loan.emi, tenure: loan.remaining },
          proposedState: { lender: loan.lender, emi: newEmi, tenure: extendedTenure },
          applicableLenders: [],
          cibilImpact: 'NEUTRAL',
          eligibilityScore: 80,
          actionLabel: 'Request Tenure Extension',
          metadata: { warning: 'Total interest paid increases — recommended only for cash flow relief' },
        });
      }
    }

    // Sort by priority then by total savings
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    strategies.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.estimatedSavings.total - a.estimatedSavings.total;
    });

    // Cache strategies for simulation lookups
    this.strategyCache.set(userId, strategies);

    this.logger.log(`Generated ${strategies.length} strategies for userId=${userId}`);
    return strategies;
  }

  /**
   * simulateStrategy — "what-if" simulation for a specific strategy.
   *
   * Allows users to tweak parameters (rate, tenure, amount) and see updated projections.
   */
  async simulateStrategy(
    strategyId: string,
    params: {
      newRate?: number;
      newTenure?: number;
      topupAmount?: number;
      targetLender?: string;
    },
    userId: string,
  ): Promise<any> {
    // Find the original strategy from cache
    const userStrategies = this.strategyCache.get(userId);
    const strategy = userStrategies?.find(s => s.id === strategyId);

    if (!strategy) {
      // Return a generic simulation if strategy not in cache
      this.logger.warn(`Strategy ${strategyId} not found in cache for userId=${userId}`);
      return this.genericSimulation(strategyId, params);
    }

    const current = strategy.currentState;
    const outstanding = current.outstanding || current.totalOutstanding || current.totalDebt || 0;
    const rate = params.newRate ?? strategy.proposedState.rate;
    const tenure = params.newTenure ?? strategy.proposedState.tenure ?? current.remainingTenure ?? 60;

    const monthlyRate = rate / 100 / 12;
    const newEmi = outstanding > 0 && monthlyRate > 0
      ? Math.round(
          outstanding * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
          (Math.pow(1 + monthlyRate, tenure) - 1),
        )
      : 0;

    const totalPayable = newEmi * tenure;
    const totalInterest = totalPayable - outstanding;
    const currentEmi = current.emi || current.totalEmi || strategy.proposedState.emi;
    const monthlySavings = currentEmi - newEmi;

    const targetLenderOffer = params.targetLender
      ? strategy.applicableLenders.find(l => l.lender === params.targetLender)
      : null;

    return {
      strategyId,
      strategyType: strategy.type,
      simulation: {
        outstanding,
        rate,
        tenure,
        emi: newEmi,
        totalPayable,
        totalInterest,
        monthlySavings,
        totalSavingsVsCurrent: monthlySavings * tenure,
      },
      lenderDetails: targetLenderOffer ?? (strategy.applicableLenders[0] || null),
      breakeven: {
        months: monthlySavings > 0 && outstanding > 0
          ? Math.ceil((outstanding * 0.01) / monthlySavings) // ~1% processing fee payback
          : null,
        description: monthlySavings > 0
          ? `Processing fee recovered in ~${Math.ceil((outstanding * 0.01) / Math.max(monthlySavings, 1))} months`
          : 'No monthly savings at these parameters',
      },
      warnings: this.generateWarnings(strategy.type, params, monthlySavings),
    };
  }

  private genericSimulation(strategyId: string, params: any): any {
    const rate = params.newRate ?? 10.5;
    const tenure = params.newTenure ?? 60;
    const amount = params.topupAmount ?? 500000;
    const monthlyRate = rate / 100 / 12;
    const emi = Math.round(
      amount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
      (Math.pow(1 + monthlyRate, tenure) - 1),
    );
    return {
      strategyId,
      simulation: { outstanding: amount, rate, tenure, emi, totalPayable: emi * tenure, totalInterest: emi * tenure - amount },
      warnings: ['Strategy details not found — showing generic simulation'],
    };
  }

  private generateWarnings(type: StrategyType, params: any, monthlySavings: number): string[] {
    const warnings: string[] = [];
    if (monthlySavings < 0) warnings.push('These parameters result in higher EMI than current');
    if (params.newTenure && params.newTenure > 240) warnings.push('Very long tenure — total interest cost increases significantly');
    if (type === 'EMI_REDUCTION') warnings.push('Tenure extension increases total interest paid');
    if (params.newRate && params.newRate > 18) warnings.push('Rate seems high — verify with lender');
    return warnings;
  }

  private calcEligibilityScore(bureau: BureauData, strategyType: string): number {
    let score = 100;
    if (bureau.cibilScore < 650) score -= 40;
    else if (bureau.cibilScore < 700) score -= 20;
    else if (bureau.cibilScore < 750) score -= 10;

    const missedPayments = bureau.summary?.missedPayments || 0;
    score -= Math.min(missedPayments * 10, 30);

    const inquiries = bureau.summary?.inquiriesLast6Months || 0;
    if (inquiries > 3) score -= 15;
    else if (inquiries > 1) score -= 5;

    return Math.max(0, Math.min(100, score));
  }
}
