// ─────────────────────────────────────────────────────────────
// FINFINITY BRE ENGINE — Core TypeScript Types
// ─────────────────────────────────────────────────────────────

export type LoanType = 'hl' | 'car' | 'pl' | 'cc' | 'bl' | 'od' | 'lap' | 'topup' | 'bt';
export type EmploymentType = 'salaried' | 'self';
export type PropertyType = 'residential' | 'commercial';

export interface BureauLoan {
  id: number;
  type: LoanType;
  label: string;
  lender: string;
  account: string;
  outstanding: number;
  sanction: number;
  rate: number;           // annual % (e.g. 9.5)
  emi: number;
  tenureElapsed: number;  // months paid
  tenureTotal: number;    // original tenure in months
  tenureRemaining: number;
  dpd: number;            // days past due (0 = clean)
  isActive: boolean;
  utilization?: number;   // for credit cards (%)
}

export interface UserProfile {
  name: string;
  pan: string;
  mobile: string;
  income: number;
  employment: EmploymentType;
  // Properties
  ownHouse: boolean;
  houseValue: number;
  houseUnderHL: boolean;
  hasShop: boolean;
  shopValue: number;
  shopType: PropertyType;
  hasOtherProp: boolean;
  otherPropValue: number;
  otherPropType: PropertyType;
}

export interface LoanFees {
  pf: number;  // processing fee
  fc: number;  // foreclosure charge
}

export interface BREInput {
  bureau: BureauLoan[];
  profile: UserProfile;
  loanFees: Record<number, LoanFees>;  // keyed by loan id
  assumptions: {
    investReturn: number;   // default 12
    fdReturn: number;       // default 7
    inflationRate: number;  // default 6
  };
  cibilScore?: number;
}

export type StrategyTag =
  | 'URGENT'
  | 'BEST SAVINGS'
  | 'RATE REDUCTION'
  | 'PARTIAL RELIEF'
  | 'SELF-EMPLOYED'
  | 'UNLOCK EQUITY'
  | 'COMMERCIAL EQUITY'
  | 'WEALTH CREATION'
  | 'EMI RELIEF';

export type ConflictGroup = 'hl_action' | 'cc_action' | 'pl_action' | 'bl_action';

export interface Strategy {
  id: number;
  tag: StrategyTag;
  tagClass: string;
  priority: number;
  icon: string;
  title: string;
  // From side (current state)
  fromLabel: string;
  fromRate: number;
  fromBal: number;
  fromEMI: number;
  // To side (recommended)
  toLabel: string;
  toRate: number;
  toTenure: number;
  newEMI: number;
  // Savings
  totalSaving: number;
  emiSaving: number;
  annualSaving: number;
  lumpAvail: number;
  // Meta
  reason: string;
  eligibility: string;
  taxBenefit: boolean;
  taxNote?: string;
  note?: string;
  recommendation?: string;
  // Conflict management
  conflictGroup?: ConflictGroup;
  supersedes?: string[];
  // Transfer cost details (for BT strategies)
  loanId?: number;
  transferCost?: number;
  netSaving?: number;
  breakEvenMonths?: number;
  // Investment strategy extras
  isInvestmentStrategy?: boolean;
  lumpAmt?: number;
  corpus?: number;
  interestCost?: number;
  netGain?: number;
  // Warning
  isWarning?: boolean;
}

export interface TopupEligibility {
  maxPctOfSanction: number;
  maxTopup: number;
  ltvCap: number;
  eligibleTopup: number;
  topupRate: number;
  pctOfSanction: number;
}

export interface LapEligibility {
  ltvPct: number;
  maxLoan: number;
  eligible: number;
}

export interface LenderFeeDefaults {
  pfRate: number;
  pf: number;
  fcRate: number;
  fc: number;
}

export interface BREOutput {
  strategies: Strategy[];
  cibilScore: number;
  totalDebt: number;
  totalEMI: number;
  emiRatio: number;
  highestRate: number;
  loansCount: number;
}
