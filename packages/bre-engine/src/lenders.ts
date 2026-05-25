// ─────────────────────────────────────────────────────────────
// FINFINITY Partner Lenders — Rate & Fee Configuration
// Update rates periodically via admin panel (Phase 3)
// ─────────────────────────────────────────────────────────────

export interface LenderConfig {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  // Personal Loan
  pl?: { minRate: number; maxRate: number; minTenure: number; maxTenure: number; maxAmount: number };
  // Home Loan
  hl?: { minRate: number; maxRate: number; minTenure: number; maxTenure: number; maxAmount: number };
  // LAP
  lap?: { minRate: number; maxRate: number; ltvPct: number };
  // Fees
  pfPct: number;        // Processing fee % of loan amount
  pfMin: number;        // Minimum PF in ₹
  pfMax: number;        // Maximum PF in ₹
  fcPct: number;        // Foreclosure charge %
  fcFreeAfterMonths: number; // Months after which FC is free
  // Eligibility
  minCibil: number;
  minIncome: number;    // Monthly net income
  salaryOnly: boolean;  // true = salaried only
}

export const LENDERS: LenderConfig[] = [
  {
    id: 'poonawalla',
    name: 'Poonawalla Fincorp Limited',
    shortName: 'Poonawalla',
    pl: { minRate: 9.99, maxRate: 24.00, minTenure: 12, maxTenure: 60, maxAmount: 3000000 },
    pfPct: 0.02, pfMin: 1999, pfMax: 50000,
    fcPct: 0.02, fcFreeAfterMonths: 24,
    minCibil: 650, minIncome: 20000, salaryOnly: false,
  },
  {
    id: 'fullerton',
    name: 'Fullerton India Credit Company',
    shortName: 'Fullerton',
    pl: { minRate: 11.99, maxRate: 36.00, minTenure: 12, maxTenure: 60, maxAmount: 2500000 },
    pfPct: 0.02, pfMin: 1999, pfMax: 30000,
    fcPct: 0.025, fcFreeAfterMonths: 18,
    minCibil: 600, minIncome: 15000, salaryOnly: false,
  },
  {
    id: 'hero',
    name: 'Hero Fincorp',
    shortName: 'Hero',
    pl: { minRate: 14.00, maxRate: 28.00, minTenure: 12, maxTenure: 60, maxAmount: 500000 },
    pfPct: 0.025, pfMin: 1999, pfMax: 20000,
    fcPct: 0.025, fcFreeAfterMonths: 12,
    minCibil: 600, minIncome: 12000, salaryOnly: false,
  },
  {
    id: 'bajaj',
    name: 'Bajaj Finserv',
    shortName: 'Bajaj',
    pl: { minRate: 10.99, maxRate: 35.00, minTenure: 12, maxTenure: 96, maxAmount: 4000000 },
    pfPct: 0.02, pfMin: 999, pfMax: 45000,
    fcPct: 0.025, fcFreeAfterMonths: 12,
    minCibil: 685, minIncome: 22000, salaryOnly: false,
  },
  {
    id: 'tata',
    name: 'Tata Capital',
    shortName: 'Tata Capital',
    pl: { minRate: 10.99, maxRate: 35.00, minTenure: 12, maxTenure: 72, maxAmount: 3500000 },
    pfPct: 0.015, pfMin: 999, pfMax: 35000,
    fcPct: 0.02, fcFreeAfterMonths: 12,
    minCibil: 700, minIncome: 20000, salaryOnly: false,
  },
  {
    id: 'abfl',
    name: 'Aditya Birla Finance Limited',
    shortName: 'ABFL',
    pl: { minRate: 10.50, maxRate: 30.00, minTenure: 12, maxTenure: 84, maxAmount: 5000000 },
    pfPct: 0.02, pfMin: 1999, pfMax: 50000,
    fcPct: 0.02, fcFreeAfterMonths: 18,
    minCibil: 700, minIncome: 25000, salaryOnly: false,
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    shortName: 'Axis',
    pl: { minRate: 10.49, maxRate: 22.00, minTenure: 12, maxTenure: 60, maxAmount: 4000000 },
    hl: { minRate: 8.75, maxRate: 10.50, minTenure: 60, maxTenure: 300, maxAmount: 50000000 },
    pfPct: 0.015, pfMin: 3999, pfMax: 50000,
    fcPct: 0.02, fcFreeAfterMonths: 0,
    minCibil: 725, minIncome: 25000, salaryOnly: false,
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC',
    pl: { minRate: 10.50, maxRate: 24.00, minTenure: 12, maxTenure: 60, maxAmount: 4000000 },
    hl: { minRate: 8.70, maxRate: 9.95, minTenure: 60, maxTenure: 360, maxAmount: 100000000 },
    pfPct: 0.01, pfMin: 4999, pfMax: 25000,
    fcPct: 0.03, fcFreeAfterMonths: 0,
    minCibil: 725, minIncome: 25000, salaryOnly: false,
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    shortName: 'Kotak',
    pl: { minRate: 10.99, maxRate: 24.00, minTenure: 12, maxTenure: 60, maxAmount: 4000000 },
    hl: { minRate: 8.75, maxRate: 9.85, minTenure: 60, maxTenure: 240, maxAmount: 50000000 },
    pfPct: 0.015, pfMin: 2999, pfMax: 30000,
    fcPct: 0.02, fcFreeAfterMonths: 0,
    minCibil: 720, minIncome: 20000, salaryOnly: false,
  },
  {
    id: 'idfc',
    name: 'IDFC First Bank',
    shortName: 'IDFC',
    pl: { minRate: 10.49, maxRate: 36.00, minTenure: 12, maxTenure: 60, maxAmount: 4000000 },
    hl: { minRate: 8.85, maxRate: 10.50, minTenure: 60, maxTenure: 300, maxAmount: 75000000 },
    pfPct: 0.02, pfMin: 2999, pfMax: 50000,
    fcPct: 0.02, fcFreeAfterMonths: 0,
    minCibil: 700, minIncome: 20000, salaryOnly: false,
  },
  {
    id: 'chola',
    name: 'Cholamandalam Investment and Finance',
    shortName: 'Chola',
    pl: { minRate: 14.00, maxRate: 30.00, minTenure: 12, maxTenure: 60, maxAmount: 750000 },
    pfPct: 0.025, pfMin: 2999, pfMax: 25000,
    fcPct: 0.025, fcFreeAfterMonths: 24,
    minCibil: 600, minIncome: 15000, salaryOnly: false,
  },
  {
    id: 'indusind',
    name: 'IndusInd Bank',
    shortName: 'IndusInd',
    pl: { minRate: 10.49, maxRate: 26.00, minTenure: 12, maxTenure: 60, maxAmount: 5000000 },
    hl: { minRate: 8.99, maxRate: 11.00, minTenure: 60, maxTenure: 300, maxAmount: 50000000 },
    pfPct: 0.02, pfMin: 3999, pfMax: 50000,
    fcPct: 0.02, fcFreeAfterMonths: 0,
    minCibil: 720, minIncome: 25000, salaryOnly: false,
  },
  {
    id: 'piramal',
    name: 'Piramal Capital & Housing Finance',
    shortName: 'Piramal',
    pl: { minRate: 12.99, maxRate: 28.00, minTenure: 12, maxTenure: 60, maxAmount: 1000000 },
    hl: { minRate: 9.50, maxRate: 13.00, minTenure: 60, maxTenure: 300, maxAmount: 50000000 },
    pfPct: 0.02, pfMin: 2999, pfMax: 20000,
    fcPct: 0.02, fcFreeAfterMonths: 24,
    minCibil: 650, minIncome: 15000, salaryOnly: false,
  },
];

export function getLender(id: string): LenderConfig | undefined {
  return LENDERS.find(l => l.id === id);
}

/** Best PL rate across all lenders for a given CIBIL score */
export function getBestPLRate(cibil: number): number {
  if (cibil >= 750) return 10.49;
  if (cibil >= 700) return 11.99;
  if (cibil >= 650) return 14.00;
  return 18.00;
}

/** Eligible lenders for a user profile */
export function getEligibleLenders(
  cibil: number,
  income: number,
  isSalaried: boolean,
): LenderConfig[] {
  return LENDERS.filter(l =>
    l.pl &&
    cibil >= l.minCibil &&
    income >= l.minIncome &&
    (!l.salaryOnly || isSalaried),
  );
}
