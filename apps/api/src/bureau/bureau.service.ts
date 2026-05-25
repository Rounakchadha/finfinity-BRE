import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Loan {
  type: string;
  lender: string;
  outstanding: number;
  emi: number;
  rate: number;
  tenure: number;      // original tenure in months
  remaining: number;   // remaining months
  startDate: string;
  status: 'ACTIVE' | 'CLOSED' | 'OVERDUE';
  dpd: number;         // Days Past Due (0 = current)
}

export interface CreditCard {
  bank: string;
  limit: number;
  outstanding: number;
  utilization: number; // percentage
  dpd: number;
}

export interface BureauData {
  pan: string;
  userId: string;
  cibilScore: number;
  scoreVersion: string;
  fetchedAt: string;
  expiresAt: string;
  personalInfo: {
    name: string;
    dob?: string;
    addresses: string[];
    employmentType?: string;
    monthlyIncome?: number;
  };
  loans: Loan[];
  creditCards: CreditCard[];
  summary: {
    totalLoans: number;
    activeLoans: number;
    totalOutstanding: number;
    totalEmi: number;
    totalCreditLimit: number;
    totalCcOutstanding: number;
    missedPayments: number;
    inquiriesLast6Months: number;
    oldestAccount: string;
  };
  enquiries: Array<{
    date: string;
    purpose: string;
    lender: string;
    amount: number;
  }>;
}

/**
 * BureauService — fetches and caches credit bureau data.
 *
 * DEMO MODE: Uses seeded deterministic mock data based on PAN hash.
 *
 * PRODUCTION INTEGRATION POINTS:
 * 1. CIBIL (TransUnion): https://api.cibil.com — requires empanelment
 *    - POST /consumer-credit-report with PAN + consent
 *    - Response: ConsumerCreditReport object
 *
 * 2. Experian India: https://api.experian.co.in
 *    - Similar REST API with PAN + mobile OTP consent
 *
 * 3. Equifax India: https://api.equifax.co.in
 *    - REST API, requires separate empanelment
 *
 * To switch to real API:
 * - Inject HttpService from @nestjs/axios
 * - Replace generateMockBureau() calls with real API calls
 * - Keep the same BureauData interface for compatibility
 * - Redis caching logic remains unchanged
 */
@Injectable()
export class BureauService {
  private readonly logger = new Logger(BureauService.name);

  // In-memory cache for demo (Redis in production — see below)
  private readonly cache = new Map<string, { data: BureauData; expiresAt: Date }>();

  // Cache TTL: 1 hour (matches CIBIL API rate limit windows)
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {}

  async fetchBureauData(pan: string, userId: string): Promise<BureauData> {
    // 1. Check cache first (Redis in production)
    const cached = await this.getCachedBureau(userId);
    if (cached) {
      this.logger.log(`Cache HIT for userId=${userId} (PAN=${pan})`);
      return cached;
    }

    this.logger.log(`Cache MISS for userId=${userId} — fetching bureau data`);

    let bureauData: BureauData;

    const isDemoMode = this.configService.get<string>('DEMO_MODE') !== 'false';

    if (isDemoMode) {
      // DEMO: Generate deterministic mock data
      bureauData = this.generateMockBureau(pan, userId);
    } else {
      // PRODUCTION: Call real bureau API
      // bureauData = await this.callCibilApi(pan, userId);
      // bureauData = await this.callExperianApi(pan, userId);
      //
      // For now, fall back to mock even in non-demo mode
      // Remove this fallback when real API is integrated:
      bureauData = this.generateMockBureau(pan, userId);
      this.logger.warn('Real bureau API not configured — using mock data');
    }

    // 2. Store in cache
    await this.cacheBureauData(userId, bureauData);

    return bureauData;
  }

  async getCachedBureau(userId: string): Promise<BureauData | null> {
    // PRODUCTION REDIS IMPLEMENTATION:
    // const client = this.redisService.getClient();
    // const key = `bureau:${userId}`;
    // const cached = await client.get(key);
    // if (!cached) return null;
    // return JSON.parse(cached) as BureauData;

    // In-memory demo cache:
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    return entry.data;
  }

  private async cacheBureauData(userId: string, data: BureauData): Promise<void> {
    // PRODUCTION REDIS IMPLEMENTATION:
    // const client = this.redisService.getClient();
    // const key = `bureau:${userId}`;
    // const ttlSeconds = this.CACHE_TTL_MS / 1000;
    // await client.setex(key, ttlSeconds, JSON.stringify(data));

    // In-memory demo cache:
    this.cache.set(userId, {
      data,
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS),
    });
  }

  /**
   * generateMockBureau — produces seeded, deterministic bureau data from PAN.
   *
   * The same PAN always produces the same CIBIL score and loan portfolio.
   * This mirrors the logic in the frontend HTML file for consistency.
   *
   * Algorithm:
   * - Hash PAN characters to derive seed values
   * - Use seed to deterministically pick CIBIL range (poor/fair/good/excellent)
   * - Generate 1-4 loans with seeded amounts, rates, and tenures
   * - Generate 0-2 credit cards
   */
  generateMockBureau(pan: string, userId: string = 'demo'): BureauData {
    const seed = this.hashPan(pan);

    // Derive CIBIL score from seed (300–900 range)
    const scoreRange = seed % 4;
    let cibilScore: number;
    if (scoreRange === 0) {
      cibilScore = 580 + (seed % 80);   // Poor: 580–659
    } else if (scoreRange === 1) {
      cibilScore = 660 + (seed % 80);   // Fair: 660–739
    } else if (scoreRange === 2) {
      cibilScore = 740 + (seed % 60);   // Good: 740–799
    } else {
      cibilScore = 800 + (seed % 50);   // Excellent: 800–849
    }

    // Generate loans
    const numLoans = 1 + (seed % 4); // 1–4 loans
    const loans: Loan[] = [];
    const lenders = [
      'HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra',
      'IDFC First', 'YES Bank', 'IndusInd Bank', 'Punjab National Bank', 'Bank of Baroda',
    ];
    const loanTypes = [
      { type: 'Home Loan', baseRate: 8.5, baseAmount: 3000000, baseTenure: 240 },
      { type: 'Personal Loan', baseRate: 13.0, baseAmount: 300000, baseTenure: 36 },
      { type: 'Car Loan', baseRate: 9.5, baseAmount: 700000, baseTenure: 60 },
      { type: 'Education Loan', baseRate: 10.5, baseAmount: 1000000, baseTenure: 84 },
      { type: 'Business Loan', baseRate: 14.0, baseAmount: 500000, baseTenure: 48 },
    ];

    for (let i = 0; i < numLoans; i++) {
      const loanSeed = (seed + i * 137) % 1000;
      const loanTypeInfo = loanTypes[loanSeed % loanTypes.length];
      const lender = lenders[(loanSeed * 7 + i * 13) % lenders.length];

      const rate = loanTypeInfo.baseRate + (loanSeed % 30) * 0.1; // ±3% variance
      const amount = loanTypeInfo.baseAmount * (0.7 + (loanSeed % 60) * 0.01); // ±30%
      const tenure = loanTypeInfo.baseTenure;
      const elapsed = Math.floor(tenure * (0.1 + (loanSeed % 50) * 0.01)); // 10–59% elapsed
      const remaining = tenure - elapsed;

      // Calculate EMI using standard formula: P * r * (1+r)^n / ((1+r)^n - 1)
      const monthlyRate = rate / 100 / 12;
      const emi = Math.round(
        amount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
        (Math.pow(1 + monthlyRate, tenure) - 1),
      );

      // Simplified outstanding = remaining EMIs × EMI (approximate)
      const outstanding = Math.round(emi * remaining * 0.95);

      const dpd = cibilScore < 650 && loanSeed % 5 === 0 ? (loanSeed % 90) : 0;

      const startMonthsAgo = elapsed + (loanSeed % 12);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - startMonthsAgo);

      loans.push({
        type: loanTypeInfo.type,
        lender,
        outstanding,
        emi,
        rate: Math.round(rate * 10) / 10,
        tenure,
        remaining,
        startDate: startDate.toISOString().split('T')[0],
        status: dpd > 30 ? 'OVERDUE' : 'ACTIVE',
        dpd,
      });
    }

    // Generate credit cards
    const numCCs = seed % 3; // 0–2 credit cards
    const creditCards: CreditCard[] = [];
    const ccBanks = ['HDFC Bank', 'ICICI Bank', 'SBI Cards', 'Axis Bank', 'Citibank', 'Amex'];

    for (let i = 0; i < numCCs; i++) {
      const ccSeed = (seed + i * 89 + 41) % 1000;
      const limit = 50000 + (ccSeed % 20) * 25000; // 50k–550k
      const utilization = 10 + (ccSeed % 70);       // 10–79%
      const outstanding = Math.round(limit * utilization / 100);
      const dpd = cibilScore < 650 && ccSeed % 4 === 0 ? (ccSeed % 60) : 0;

      creditCards.push({
        bank: ccBanks[(ccSeed * 3 + i * 7) % ccBanks.length],
        limit,
        outstanding,
        utilization,
        dpd,
      });
    }

    // Compute summary
    const totalEmi = loans.reduce((sum, l) => sum + l.emi, 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + l.outstanding, 0);
    const totalCcOutstanding = creditCards.reduce((sum, c) => sum + c.outstanding, 0);
    const totalCreditLimit = creditCards.reduce((sum, c) => sum + c.limit, 0);
    const missedPayments = loans.filter(l => l.dpd > 0).length + creditCards.filter(c => c.dpd > 0).length;

    const fetchedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.CACHE_TTL_MS).toISOString();

    return {
      pan,
      userId,
      cibilScore,
      scoreVersion: 'CIBIL Score Version 2.0',
      fetchedAt,
      expiresAt,
      personalInfo: {
        name: `User (${pan.slice(0, 5)})`,
        addresses: ['Mumbai, Maharashtra'],
        employmentType: seed % 3 === 0 ? 'SALARIED' : 'SELF_EMPLOYED',
        monthlyIncome: 50000 + (seed % 10) * 10000,
      },
      loans,
      creditCards,
      summary: {
        totalLoans: loans.length,
        activeLoans: loans.filter(l => l.status === 'ACTIVE').length,
        totalOutstanding,
        totalEmi,
        totalCreditLimit,
        totalCcOutstanding,
        missedPayments,
        inquiriesLast6Months: seed % 5,
        oldestAccount: loans.length > 0 ? loans[0].startDate : 'N/A',
      },
      enquiries: Array.from({ length: seed % 4 }, (_, i) => {
        const eDate = new Date();
        eDate.setMonth(eDate.getMonth() - i - 1);
        return {
          date: eDate.toISOString().split('T')[0],
          purpose: ['Personal Loan', 'Home Loan', 'Credit Card'][i % 3],
          lender: lenders[(seed + i * 11) % lenders.length],
          amount: [200000, 3000000, 100000][i % 3],
        };
      }),
    };
  }

  /**
   * Simple deterministic hash of PAN string.
   * Returns a number between 0–9999.
   */
  private hashPan(pan: string): number {
    let hash = 0;
    const upper = pan.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      hash = (hash * 31 + upper.charCodeAt(i)) % 10000;
    }
    return Math.abs(hash);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTION API STUBS — uncomment and implement when ready
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PRODUCTION: Call CIBIL (TransUnion) API
   * Requires: empanelment with TransUnion CIBIL, credentials, and RBI compliance
   *
   * private async callCibilApi(pan: string, userId: string): Promise<BureauData> {
   *   const response = await this.httpService.post(
   *     `${this.configService.get('CIBIL_API_URL')}/v2/consumer-credit-report`,
   *     {
   *       pan,
   *       consent: true,
   *       consentTimestamp: new Date().toISOString(),
   *     },
   *     {
   *       headers: {
   *         'X-API-Key': this.configService.get('CIBIL_API_KEY'),
   *         'X-Client-ID': this.configService.get('CIBIL_CLIENT_ID'),
   *       },
   *     },
   *   ).toPromise();
   *
   *   return this.transformCibilResponse(response.data, pan, userId);
   * }
   */

  /**
   * PRODUCTION: Call Experian India API
   * Requires: empanelment with Experian India
   *
   * private async callExperianApi(pan: string, userId: string): Promise<BureauData> {
   *   const response = await this.httpService.post(
   *     `${this.configService.get('EXPERIAN_API_URL')}/credit-report`,
   *     { pan, reportType: 'DETAILED' },
   *     {
   *       headers: {
   *         Authorization: `Bearer ${this.configService.get('EXPERIAN_API_KEY')}`,
   *       },
   *     },
   *   ).toPromise();
   *
   *   return this.transformExperianResponse(response.data, pan, userId);
   * }
   */
}
