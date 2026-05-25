import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface LenderEligibility {
  lender: string;
  eligible: boolean;
  maxAmount: number;
  offeredAmount: number;
  rate: number;
  tenure: number;  // months
  emi: number;
  processingFee: number;
  processingFeeAmount: number;
  disbursalTimeline: string;
  features: string[];
  requiredDocuments: string[];
  rejectionReason?: string;
}

export interface EligibilityResult {
  userId: string;
  eligible: boolean;
  eligibleLenders: LenderEligibility[];
  ineligibleLenders: LenderEligibility[];
  maxApprovedAmount: number;
  bestRate: number;
  eligibilitySummary: {
    cibilScore: number;
    emiRatio: number;
    incomeAdequate: boolean;
    creditHealthy: boolean;
    recommendation: string;
  };
  checkedAt: string;
}

export interface ApplicationResult {
  applicationId: string;
  referenceNumber: string;
  lender: string;
  amount: number;
  rate: number;
  tenure: number;
  emi: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  message: string;
  nextSteps: string[];
  expectedDisbursal?: string;
  isDemoMode: boolean;
}

// Demo lender configuration
// PRODUCTION: Replace with live lender API feeds / NBFC partner configs
interface LenderConfig {
  name: string;
  minCibil: number;
  minIncome: number;
  maxEmiRatio: number;
  baseRate: number;
  maxRate: number;
  maxAmount: number;
  minAmount: number;
  maxTenure: number;
  minTenure: number;
  processingFee: number;
  disbursalTimeline: string;
  features: string[];
}

const LENDER_CONFIGS: LenderConfig[] = [
  {
    name: 'HDFC Bank',
    minCibil: 700,
    minIncome: 25000,
    maxEmiRatio: 0.55,
    baseRate: 10.50,
    maxRate: 21.00,
    maxAmount: 4000000,
    minAmount: 50000,
    maxTenure: 60,
    minTenure: 12,
    processingFee: 1.5,
    disbursalTimeline: 'Same day for existing customers, 2–3 days for new',
    features: ['Flexi loan option', 'Part-payment allowed after 12 months', 'Online account management', 'No prepayment charges after 12 months'],
  },
  {
    name: 'ICICI Bank',
    minCibil: 700,
    minIncome: 25000,
    maxEmiRatio: 0.55,
    baseRate: 10.65,
    maxRate: 22.00,
    maxAmount: 5000000,
    minAmount: 50000,
    maxTenure: 60,
    minTenure: 12,
    processingFee: 1.5,
    disbursalTimeline: '24–48 hours',
    features: ['Instant e-approval', 'No collateral required', 'Minimal documentation', 'Overdraft facility available'],
  },
  {
    name: 'Bajaj Finance',
    minCibil: 680,
    minIncome: 20000,
    maxEmiRatio: 0.60,
    baseRate: 11.00,
    maxRate: 32.00,
    maxAmount: 4000000,
    minAmount: 30000,
    maxTenure: 84,
    minTenure: 6,
    processingFee: 2.0,
    disbursalTimeline: '24 hours',
    features: ['Pre-approved for Bajaj Card holders', 'Flexi loan — pay interest only on used amount', 'No-cost EMI available', 'Maximum loan tenure up to 84 months'],
  },
  {
    name: 'Axis Bank',
    minCibil: 700,
    minIncome: 25000,
    maxEmiRatio: 0.55,
    baseRate: 10.49,
    maxRate: 22.00,
    maxAmount: 4000000,
    minAmount: 50000,
    maxTenure: 60,
    minTenure: 12,
    processingFee: 1.5,
    disbursalTimeline: '24–48 hours',
    features: ['24-hour disbursal for priority customers', 'Doorstep service available', 'Instant loan on app for existing customers'],
  },
  {
    name: 'Tata Capital',
    minCibil: 700,
    minIncome: 20000,
    maxEmiRatio: 0.60,
    baseRate: 10.99,
    maxRate: 35.00,
    maxAmount: 5000000,
    minAmount: 75000,
    maxTenure: 72,
    minTenure: 12,
    processingFee: 2.5,
    disbursalTimeline: '2–4 business days',
    features: ['High ticket personal loans', 'Flexible repayment schedule', 'Top-up available after 12 months'],
  },
  {
    name: 'Kotak Mahindra Bank',
    minCibil: 720,
    minIncome: 30000,
    maxEmiRatio: 0.50,
    baseRate: 10.99,
    maxRate: 24.00,
    maxAmount: 4000000,
    minAmount: 50000,
    maxTenure: 60,
    minTenure: 12,
    processingFee: 1.5,
    disbursalTimeline: '24–72 hours',
    features: ['Instant approval for Kotak account holders', 'Online tracking', 'No guarantor required'],
  },
  {
    name: 'IDFC First Bank',
    minCibil: 680,
    minIncome: 20000,
    maxEmiRatio: 0.60,
    baseRate: 10.75,
    maxRate: 36.00,
    maxAmount: 4000000,
    minAmount: 20000,
    maxTenure: 60,
    minTenure: 6,
    processingFee: 2.0,
    disbursalTimeline: '24 hours',
    features: ['Competitive rates for good profiles', 'Completely digital process', 'Pre-closure allowed anytime'],
  },
];

const STANDARD_DOCUMENTS = [
  'PAN Card',
  'Aadhaar Card',
  'Last 3 months salary slips',
  'Last 6 months bank statements',
  'Form 16 (last 2 years)',
  'Employment letter / offer letter',
];

@Injectable()
export class PersonalLoanService {
  private readonly logger = new Logger(PersonalLoanService.name);

  // Simple in-memory application store
  private readonly applications = new Map<string, ApplicationResult>();

  /**
   * checkEligibility — evaluates PL eligibility across all configured lenders.
   *
   * Scoring model:
   * 1. Hard filters: CIBIL score, minimum income, EMI ratio
   * 2. Soft scoring: rate determination within lender range
   * 3. Amount calculation: min(requested, lender max, income multiplier)
   *
   * PARTNER INTEGRATION:
   * Replace this entire method with a call to the partner's eligibility API:
   *
   * const response = await this.httpService.post(
   *   `${partnerApiUrl}/eligibility`,
   *   { pan, bureau, income },
   *   { headers: { Authorization: `Bearer ${partnerApiKey}` } }
   * ).toPromise();
   * return this.transformPartnerResponse(response.data);
   */
  async checkEligibility(
    bureau: any,
    profile: any = {},
    requestedAmount?: number,
    requestedTenure?: number,
    userId: string = 'demo',
  ): Promise<EligibilityResult> {
    const cibilScore = bureau.cibilScore || 700;
    const monthlyIncome = profile?.monthlyIncome || bureau.personalInfo?.monthlyIncome || 50000;
    const currentEmi = bureau.summary?.totalEmi || 0;
    const emiRatio = currentEmi / monthlyIncome;
    const missedPayments = bureau.summary?.missedPayments || 0;

    // Available EMI capacity (how much new EMI the applicant can support)
    const availableEmiCapacity = Math.max(0, monthlyIncome * 0.5 - currentEmi);

    const eligibleLenders: LenderEligibility[] = [];
    const ineligibleLenders: LenderEligibility[] = [];

    for (const config of LENDER_CONFIGS) {
      const result = this.evaluateLender(
        config,
        cibilScore,
        monthlyIncome,
        emiRatio,
        availableEmiCapacity,
        missedPayments,
        requestedAmount,
        requestedTenure,
      );

      if (result.eligible) {
        eligibleLenders.push(result);
      } else {
        ineligibleLenders.push(result);
      }
    }

    // Sort eligible lenders by offered rate (ascending)
    eligibleLenders.sort((a, b) => a.rate - b.rate);

    const creditHealthy = missedPayments === 0 && emiRatio < 0.5;
    const incomeAdequate = monthlyIncome >= 25000;

    const maxApprovedAmount = eligibleLenders.length > 0
      ? Math.max(...eligibleLenders.map(l => l.offeredAmount))
      : 0;

    const bestRate = eligibleLenders.length > 0
      ? Math.min(...eligibleLenders.map(l => l.rate))
      : 0;

    let recommendation: string;
    if (eligibleLenders.length === 0) {
      recommendation = `Not eligible currently. CIBIL score of ${cibilScore} is below minimum requirements, or EMI ratio of ${Math.round(emiRatio * 100)}% is too high. Improve score to 700+ and reduce EMI ratio below 50%.`;
    } else if (eligibleLenders.length >= 5) {
      recommendation = `Excellent profile! ${eligibleLenders.length} lenders are competing for you. Best rate: ${bestRate}%. Compare lenders and negotiate.`;
    } else {
      recommendation = `You qualify with ${eligibleLenders.length} lender(s). Best rate: ${bestRate}%. Consider improving CIBIL to 750+ for more options.`;
    }

    this.logger.log(`Eligibility check for userId=${userId}: ${eligibleLenders.length} eligible, ${ineligibleLenders.length} ineligible`);

    return {
      userId,
      eligible: eligibleLenders.length > 0,
      eligibleLenders,
      ineligibleLenders,
      maxApprovedAmount,
      bestRate,
      eligibilitySummary: {
        cibilScore,
        emiRatio: Math.round(emiRatio * 100),
        incomeAdequate,
        creditHealthy,
        recommendation,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * submitApplication — submits a PL application to a lender.
   *
   * PARTNER INTEGRATION:
   * Replace this with a call to the partner's Loan Origination System (LOS):
   *
   * const response = await this.httpService.post(
   *   `${partnerLosUrl}/applications`,
   *   { lender, amount, tenure, applicantDetails },
   *   { headers: { Authorization: `Bearer ${partnerApiKey}` } }
   * ).toPromise();
   * return { applicationId: response.data.id, referenceNumber: response.data.ref, ... };
   */
  async submitApplication(
    lender: string,
    amount: number,
    tenure: number,
    purpose?: string,
    applicantDetails?: any,
    userId: string = 'demo',
  ): Promise<ApplicationResult> {
    const lenderConfig = LENDER_CONFIGS.find(l => l.name === lender);
    const rate = lenderConfig?.baseRate || 12.0;

    const monthlyRate = rate / 100 / 12;
    const emi = Math.round(
      amount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
      (Math.pow(1 + monthlyRate, tenure) - 1),
    );

    const applicationId = `APP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const referenceNumber = `FIN-PL-${Date.now().toString(36).toUpperCase()}`;

    const expectedDisbursal = new Date();
    expectedDisbursal.setDate(expectedDisbursal.getDate() + 3);

    const result: ApplicationResult = {
      applicationId,
      referenceNumber,
      lender,
      amount,
      rate,
      tenure,
      emi,
      status: 'SUBMITTED',
      message: `Your application for ₹${amount.toLocaleString('en-IN')} Personal Loan with ${lender} has been submitted successfully. Reference: ${referenceNumber}`,
      nextSteps: [
        'You will receive a call from the lender within 24 hours',
        'Keep your documents ready: PAN, Aadhaar, salary slips, bank statements',
        `Expected disbursal: ${expectedDisbursal.toDateString()}`,
        'Track status at: /products/applications',
      ],
      expectedDisbursal: expectedDisbursal.toISOString().split('T')[0],
      isDemoMode: true,
    };

    this.applications.set(applicationId, result);
    this.logger.log(`Application ${applicationId} submitted for userId=${userId} — ₹${amount} PL with ${lender}`);

    return result;
  }

  private evaluateLender(
    config: LenderConfig,
    cibilScore: number,
    monthlyIncome: number,
    emiRatio: number,
    availableEmiCapacity: number,
    missedPayments: number,
    requestedAmount?: number,
    requestedTenure?: number,
  ): LenderEligibility {
    // Hard eligibility checks
    const reasons: string[] = [];

    if (cibilScore < config.minCibil) {
      reasons.push(`CIBIL ${cibilScore} < minimum ${config.minCibil}`);
    }
    if (monthlyIncome < config.minIncome) {
      reasons.push(`Income ₹${monthlyIncome.toLocaleString('en-IN')} < minimum ₹${config.minIncome.toLocaleString('en-IN')}`);
    }
    if (emiRatio > config.maxEmiRatio) {
      reasons.push(`EMI ratio ${Math.round(emiRatio * 100)}% > max ${Math.round(config.maxEmiRatio * 100)}%`);
    }
    if (missedPayments > 2) {
      reasons.push('More than 2 missed payments in credit history');
    }

    if (reasons.length > 0) {
      return {
        lender: config.name,
        eligible: false,
        maxAmount: config.maxAmount,
        offeredAmount: 0,
        rate: 0,
        tenure: 0,
        emi: 0,
        processingFee: config.processingFee,
        processingFeeAmount: 0,
        disbursalTimeline: config.disbursalTimeline,
        features: config.features,
        requiredDocuments: STANDARD_DOCUMENTS,
        rejectionReason: reasons.join('. '),
      };
    }

    // Determine rate based on CIBIL score (within lender's range)
    const scoreRange = 900 - config.minCibil;
    const scoreFactor = Math.max(0, Math.min(1, (cibilScore - config.minCibil) / scoreRange));
    const rate = config.maxRate - (config.maxRate - config.baseRate) * scoreFactor;
    const finalRate = Math.round(rate * 100) / 100;

    // Calculate offered amount
    // Rule: Max EMI should not cause total EMI to exceed maxEmiRatio
    const maxNewEmiAllowed = Math.max(0, monthlyIncome * config.maxEmiRatio - (monthlyIncome * emiRatio));

    const tenure = requestedTenure
      ? Math.min(Math.max(requestedTenure, config.minTenure), config.maxTenure)
      : config.maxTenure;

    const monthlyRate = finalRate / 100 / 12;
    const maxByEmi = monthlyRate > 0
      ? Math.floor(
          maxNewEmiAllowed * (Math.pow(1 + monthlyRate, tenure) - 1) /
          (monthlyRate * Math.pow(1 + monthlyRate, tenure)),
        )
      : 0;

    // Income multiplier: typically 20–30x monthly income
    const incomeMultiplier = cibilScore >= 750 ? 25 : cibilScore >= 700 ? 20 : 15;
    const maxByIncome = monthlyIncome * incomeMultiplier;

    let offeredAmount = Math.min(maxByEmi, maxByIncome, config.maxAmount);

    // If specific amount requested, check if we can offer that
    if (requestedAmount) {
      if (requestedAmount < config.minAmount) {
        offeredAmount = config.minAmount;
      } else if (requestedAmount <= offeredAmount) {
        offeredAmount = requestedAmount;
      }
      // If requested > what we can offer, offeredAmount stays at our max
    }

    offeredAmount = Math.max(config.minAmount, offeredAmount);

    const emi = Math.round(
      offeredAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
      (Math.pow(1 + monthlyRate, tenure) - 1),
    );

    const processingFeeAmount = Math.round(offeredAmount * config.processingFee / 100);

    return {
      lender: config.name,
      eligible: true,
      maxAmount: config.maxAmount,
      offeredAmount,
      rate: finalRate,
      tenure,
      emi,
      processingFee: config.processingFee,
      processingFeeAmount,
      disbursalTimeline: config.disbursalTimeline,
      features: config.features,
      requiredDocuments: STANDARD_DOCUMENTS,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARTNER INTEGRATION STUBS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PARTNER: NBFC/Bank Eligibility API stub
   *
   * private async callPartnerEligibilityApi(
   *   pan: string,
   *   income: number,
   *   bureau: BureauData,
   *   requestedAmount: number,
   * ): Promise<PartnerEligibilityResponse> {
   *   const response = await this.httpService.post(
   *     `${this.configService.get('PARTNER_PL_URL')}/v1/eligibility`,
   *     {
   *       pan,
   *       monthlyIncome: income,
   *       bureauData: bureau,
   *       requestedAmount,
   *       product: 'PERSONAL_LOAN',
   *       channel: 'FINFINITY_BRE',
   *     },
   *     {
   *       headers: {
   *         'X-API-Key': this.configService.get('PARTNER_PL_API_KEY'),
   *         'X-Channel-ID': 'FINFINITY',
   *       },
   *       timeout: 10000,
   *     },
   *   ).toPromise();
   *
   *   return this.transformPartnerEligibilityResponse(response.data);
   * }
   */

  /**
   * PARTNER: Loan Origination System (LOS) stub
   *
   * private async callPartnerLOS(
   *   applicationData: PLApplicationData,
   * ): Promise<PartnerApplicationResponse> {
   *   const response = await this.httpService.post(
   *     `${this.configService.get('PARTNER_LOS_URL')}/v1/applications`,
   *     {
   *       ...applicationData,
   *       referralCode: this.configService.get('PARTNER_REFERRAL_CODE'),
   *       webhookUrl: `${this.configService.get('API_BASE_URL')}/webhooks/partner-los`,
   *     },
   *     {
   *       headers: {
   *         Authorization: `Bearer ${this.configService.get('PARTNER_LOS_TOKEN')}`,
   *         'Content-Type': 'application/json',
   *       },
   *     },
   *   ).toPromise();
   *
   *   return {
   *     applicationId: response.data.applicationId,
   *     referenceNumber: response.data.referenceNumber,
   *     status: response.data.status,
   *     redirectUrl: response.data.redirectUrl, // If partner has their own UI flow
   *   };
   * }
   */
}
