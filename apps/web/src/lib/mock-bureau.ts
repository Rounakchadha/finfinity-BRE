import { BureauLoan } from '@/store/useAppStore';

// ─── Indian lender pool ───────────────────────────────────────────────────────

const LENDERS = [
  { name: 'HDFC Bank', types: ['Home Loan', 'Personal Loan', 'Auto Loan', 'Credit Card'] },
  { name: 'ICICI Bank', types: ['Home Loan', 'Personal Loan', 'Business Loan', 'Credit Card'] },
  { name: 'SBI', types: ['Home Loan', 'Personal Loan', 'Auto Loan', 'Education Loan'] },
  { name: 'Axis Bank', types: ['Personal Loan', 'Business Loan', 'Credit Card', 'Home Loan'] },
  { name: 'Bajaj Finserv', types: ['Personal Loan', 'Business Loan', 'Consumer Durable'] },
  { name: 'Tata Capital', types: ['Personal Loan', 'Business Loan', 'Home Loan'] },
  { name: 'Kotak Mahindra', types: ['Personal Loan', 'Home Loan', 'Auto Loan'] },
  { name: 'IndusInd Bank', types: ['Personal Loan', 'Auto Loan', 'Credit Card'] },
  { name: 'Yes Bank', types: ['Personal Loan', 'Business Loan'] },
  { name: 'Fullerton India', types: ['Personal Loan', 'SME Loan'] },
];

const RATE_MAP: Record<string, { min: number; max: number }> = {
  'Home Loan': { min: 8.4, max: 9.8 },
  'Personal Loan': { min: 12, max: 26 },
  'Auto Loan': { min: 9.5, max: 14 },
  'Business Loan': { min: 14, max: 22 },
  'Credit Card': { min: 36, max: 42 },
  'Education Loan': { min: 9, max: 12 },
  'Consumer Durable': { min: 18, max: 24 },
  'SME Loan': { min: 16, max: 20 },
  default: { min: 12, max: 18 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rnd(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function calcEmi(principal: number, ratePercent: number, months: number): number {
  const r = ratePercent / 100 / 12;
  if (r === 0) return Math.round(principal / months);
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

function generateAccountNumber(type: string): string {
  const prefix =
    type === 'Home Loan'
      ? 'HL'
      : type === 'Personal Loan'
      ? 'PL'
      : type === 'Auto Loan'
      ? 'AL'
      : type === 'Credit Card'
      ? 'CC'
      : type === 'Business Loan'
      ? 'BL'
      : 'LN';
  const num = Math.floor(Math.random() * 9000000000 + 1000000000);
  return `${prefix}${num}`;
}

function getDpd(cibilScore: number): number {
  if (cibilScore >= 750) return 0;
  if (cibilScore >= 700) return Math.random() < 0.8 ? 0 : 30;
  if (cibilScore >= 650) return Math.random() < 0.5 ? 0 : rnd(30, 60);
  return rnd(30, 90);
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateMockBureauData(cibilScore?: number): {
  cibilScore: number;
  loans: BureauLoan[];
} {
  const score = cibilScore ?? rnd(620, 800);
  const loanCount = rnd(2, 6);

  // Shuffle lenders
  const shuffled = [...LENDERS].sort(() => Math.random() - 0.5);
  const selectedLenders = shuffled.slice(0, loanCount);

  const loans: BureauLoan[] = selectedLenders.map((lender, i) => {
    const typeIndex = Math.floor(Math.random() * lender.types.length);
    const accountType = lender.types[typeIndex];
    const rates = RATE_MAP[accountType] ?? RATE_MAP.default;
    const rate = rnd(rates.min, rates.max, 2);

    // Sanction amounts based on loan type
    let sanctionAmount: number;
    if (accountType === 'Home Loan') {
      sanctionAmount = rnd(20, 80) * 100000;
    } else if (accountType === 'Business Loan' || accountType === 'SME Loan') {
      sanctionAmount = rnd(10, 50) * 100000;
    } else if (accountType === 'Auto Loan') {
      sanctionAmount = rnd(5, 15) * 100000;
    } else if (accountType === 'Credit Card') {
      sanctionAmount = rnd(1, 5) * 100000;
    } else {
      sanctionAmount = rnd(3, 20) * 100000;
    }

    sanctionAmount = Math.round(sanctionAmount / 10000) * 10000;

    // Outstanding is 30-90% of sanction
    const outstandingRatio = rnd(0.3, 0.9, 2);
    const outstanding = Math.round((sanctionAmount * outstandingRatio) / 1000) * 1000;

    // Tenure
    let closureMonths: number;
    if (accountType === 'Home Loan') {
      closureMonths = rnd(60, 240);
    } else if (accountType === 'Personal Loan' || accountType === 'Business Loan') {
      closureMonths = rnd(12, 60);
    } else if (accountType === 'Auto Loan') {
      closureMonths = rnd(24, 72);
    } else {
      closureMonths = rnd(12, 48);
    }

    const emi = calcEmi(outstanding, rate, closureMonths);
    const dpd = getDpd(score);

    return {
      id: i + 1,
      lender: lender.name,
      accountType,
      accountNumber: generateAccountNumber(accountType),
      sanctionAmount,
      outstanding,
      emi,
      rate,
      dpd,
      closureMonths,
      isEdited: false,
    };
  });

  return { cibilScore: Math.round(score), loans };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatInr(amount: number, short = false): string {
  if (amount === 0) return '₹0';

  if (short) {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInrShort(amount: number): string {
  return formatInr(amount, true);
}

// ─── BRE Calculations ─────────────────────────────────────────────────────────

export interface BREInput {
  loans: BureauLoan[];
  income: number;
  cibilScore: number;
  ownHouse: boolean;
  houseValue: number;
}

export function calcEmiRatio(loans: BureauLoan[], income: number): number {
  if (!income) return 0;
  const totalEmi = loans.reduce((sum, l) => sum + l.emi, 0);
  return Math.round((totalEmi / income) * 100);
}

export function calcTotalDebt(loans: BureauLoan[]): number {
  return loans.reduce((sum, l) => sum + l.outstanding, 0);
}

export function calcMonthlyEmi(loans: BureauLoan[]): number {
  return loans.reduce((sum, l) => sum + l.emi, 0);
}

export function getHighestRateLoan(loans: BureauLoan[]): BureauLoan | null {
  if (!loans.length) return null;
  return loans.reduce((max, l) => (l.rate > max.rate ? l : max));
}

export function calcWeightedAvgRate(loans: BureauLoan[]): number {
  const totalDebt = calcTotalDebt(loans);
  if (!totalDebt) return 0;
  const weighted = loans.reduce((sum, l) => sum + l.rate * l.outstanding, 0);
  return parseFloat((weighted / totalDebt).toFixed(2));
}

export function calcTotalInterestPayable(loans: BureauLoan[]): number {
  return loans.reduce((sum, l) => {
    const totalPay = l.emi * l.closureMonths;
    return sum + (totalPay - l.outstanding);
  }, 0);
}
