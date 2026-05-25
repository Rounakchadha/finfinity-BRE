import { Injectable, Logger } from '@nestjs/common';
import { BureauService } from '../bureau/bureau.service';
import { BREService } from '../bre/bre.service';

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'POSITIVE';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    label: string;
    route: string;
  };
  metric?: {
    label: string;
    value: string | number;
    benchmark?: string;
    status: 'GOOD' | 'WARN' | 'BAD';
  };
}

export type InsightType =
  | 'CIBIL_SCORE'
  | 'EMI_RATIO'
  | 'CC_UTILIZATION'
  | 'MISSED_PAYMENT'
  | 'HIGH_RATE_LOAN'
  | 'MULTIPLE_LOANS'
  | 'DEBT_FREE_TIMELINE'
  | 'SAVINGS_OPPORTUNITY'
  | 'CREDIT_ENQUIRY';

interface ChatContext {
  userId?: string;
  bureau?: any;
  strategies?: any[];
  conversationHistory?: Array<{ role: string; content: string }>;
}

/**
 * AIService — AI/ML-powered financial insights and chat.
 *
 * CURRENT IMPLEMENTATION: Rule-based system using financial thresholds.
 * This produces accurate, helpful responses without requiring an LLM.
 *
 * PRODUCTION INTEGRATION — FinGPT / RAG Pipeline:
 * ─────────────────────────────────────────────────
 * 1. FinGPT (open-source financial LLM):
 *    - Fine-tuned on financial news, reports, and advice
 *    - Self-hostable on GPU instance
 *    - Integration: POST to local FinGPT inference endpoint
 *
 * 2. Claude (Anthropic) with RAG:
 *    import Anthropic from '@anthropic-ai/sdk';
 *    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *    const response = await client.messages.create({
 *      model: 'claude-opus-4-5',
 *      max_tokens: 1024,
 *      messages: [
 *        { role: 'user', content: `User financial context: ${JSON.stringify(context)}\n\nQuestion: ${message}` }
 *      ],
 *      system: FINANCIAL_ADVISOR_SYSTEM_PROMPT,
 *    });
 *
 * 3. OpenAI GPT-4 with function calling:
 *    const response = await openai.chat.completions.create({
 *      model: 'gpt-4-turbo',
 *      messages: [...conversationHistory],
 *      tools: breTools,  // BRE strategy tools
 *    });
 *
 * 4. RAG Context (Retrieval-Augmented Generation):
 *    - Vector store: Pinecone / Weaviate / pgvector
 *    - Knowledge base: RBI guidelines, product terms, lender policies
 *    - Retrieval: Embed user query → fetch top-k relevant chunks
 *    - Augment LLM prompt with retrieved context
 *
 * Replace the rule-based methods below with LLM calls when integrating.
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  // Knowledge base for FAQ matching (rule-based NLP)
  private readonly knowledgeBase: Array<{
    patterns: string[];
    answer: string;
    suggestions?: string[];
  }> = [
    {
      patterns: ['cibil', 'credit score', 'improve score', 'score improve', 'credit rating'],
      answer: `Your CIBIL score is the most important factor lenders check. Here's how to improve it:

**Key actions:**
1. **Pay on time** — Set up auto-debit for all EMIs and CC minimum dues. Even one missed payment drops your score by 50–100 points.
2. **Reduce CC utilization below 30%** — If your CC limit is ₹1 lakh, keep outstanding below ₹30,000.
3. **Don't apply for multiple loans simultaneously** — Each hard inquiry reduces your score by 5–10 points.
4. **Maintain a mix of credit** — Having both secured (home/car loan) and unsecured (personal loan, CC) credit helps.
5. **Check your report for errors** — Dispute incorrect entries at cibil.com (free once per year).

Score ranges: <650 Poor | 650–699 Fair | 700–749 Good | 750–799 Very Good | 800+ Excellent`,
      suggestions: ['How do missed payments affect score?', 'How long to improve score by 100 points?'],
    },
    {
      patterns: ['balance transfer', 'bt', 'transfer loan', 'home loan transfer', 'refinance'],
      answer: `A Balance Transfer (BT) moves your existing loan to a new lender offering a lower interest rate.

**When to consider BT:**
- Your current rate is >1% higher than market rates
- You have a good CIBIL score (700+)
- You have significant outstanding (>₹10 lakh for HL, >₹2 lakh for PL)
- Remaining tenure is >2 years

**BT costs to factor in:**
- Processing fee: 0.5–2% of outstanding
- Legal/technical charges (for home loans): ₹5,000–20,000
- Pre-closure penalty at old lender: 0–2%

**Rule of thumb:** BT makes sense if monthly savings > (total switching cost ÷ remaining tenure)

**Example:** ₹50L HL at 9.5% → 8.5% BT saves ~₹3,200/month. Switching cost ~₹50,000. Breakeven = 15 months. ✓ Worth it if staying 3+ more years.`,
      suggestions: ['Calculate my BT savings', 'Which lenders offer best BT rates?', 'What documents needed for BT?'],
    },
    {
      patterns: ['emi', 'equated monthly', 'monthly payment', 'reduce emi'],
      answer: `Your EMI (Equated Monthly Instalment) is calculated as:

**EMI = P × r × (1+r)^n / ((1+r)^n - 1)**
where P = principal, r = monthly rate, n = tenure in months

**Ways to reduce EMI:**
1. **Balance Transfer** to lower rate — reduces EMI without extending tenure (saves money)
2. **Tenure Extension** — same rate, more months, lower EMI (costs more overall)
3. **Part-prepayment** — lump sum reduces principal, then request EMI reduction

**EMI-to-income ratio guidelines:**
- <40% — Healthy, room for more credit if needed
- 40–50% — Manageable but tight
- 50–60% — Stretched, prioritize debt reduction
- >60% — Stress zone, immediate action needed`,
      suggestions: ['Calculate EMI for specific loan', 'Is my EMI too high?'],
    },
    {
      patterns: ['personal loan', 'pl', 'unsecured loan'],
      answer: `Personal loans are unsecured credit — no collateral required.

**Current market rates (2024):**
- Excellent CIBIL (800+): 10.5–12%
- Good CIBIL (750–799): 12–14%
- Fair CIBIL (700–749): 14–18%
- Below 700: 18–24% (or rejected)

**Best uses:** Medical emergency, wedding, home renovation, education, debt consolidation

**Avoid PLs for:** Down payment on another loan, stock market investment, funding losses

**Top PL lenders:** HDFC Bank, ICICI Bank, Bajaj Finance, Axis Bank, Tata Capital

**Documents:** Salary slips (3 months), bank statements (6 months), Form 16, Aadhaar, PAN`,
      suggestions: ['Am I eligible for a personal loan?', 'Personal loan vs top-up loan?'],
    },
    {
      patterns: ['credit card', 'cc', 'credit card debt', 'card outstanding'],
      answer: `Credit cards charge 24–42% annual interest on outstanding dues — the highest cost credit you'll find.

**Best practices:**
- **Always pay full outstanding** by due date — not just minimum
- Minimum payment trap: ₹1L at 36% interest, paying ₹2,500/month = 10+ years to clear
- Keep utilization below 30% per card for CIBIL health

**If you have CC debt:**
1. Stop using the card (or reduce to essentials only)
2. Convert to EMI at 13–18% (better than 36% revolving)
3. Get a Personal Loan at 10–14% to clear CC debt (saves 15–20% interest)
4. Avalanche method: Pay highest-rate card first while paying minimums on others`,
      suggestions: ['Convert CC debt to personal loan', 'Which card should I pay first?'],
    },
    {
      patterns: ['home loan', 'hl', 'housing loan', 'mortgage', 'property loan'],
      answer: `Home loans are the largest and longest financial commitment for most Indians.

**Current market rates (2024):**
- SBI: 8.40–9.15%
- HDFC Bank: 8.50–9.40%
- ICICI Bank: 8.60–9.30%
- Kotak: 8.65–9.25%

**Key home loan tips:**
1. **Floating vs Fixed** — Floating rates track repo rate. Better long-term if RBI cuts rates.
2. **Pre-payment** — No penalty on floating rate loans (RBI mandate). Use bonuses to prepay — saves massive interest.
3. **BT trigger** — If rate difference is 1%+ and remaining tenure is 5+ years, BT saves significantly.
4. **Top-up loan** — Once you've paid 2+ years, you can get a top-up at HL rates for any purpose.

**Tax benefits (80C + 24b):**
- Principal repayment: Up to ₹1.5L/year under 80C
- Interest payment: Up to ₹2L/year under 24(b)`,
      suggestions: ['Calculate home loan BT savings', 'When should I prepay vs invest?'],
    },
    {
      patterns: ['debt consolidation', 'consolidate', 'multiple loans', 'too many emis'],
      answer: `Debt consolidation combines multiple loans into one, typically at a lower rate.

**When it makes sense:**
- You have 3+ loans with different rates and lenders
- Total EMI is >50% of income
- Some loans carry high rates (>15%)
- You want simplified management

**Consolidation options:**
1. **Personal Loan** — Combine multiple PLs / CC debt
2. **Home Loan Top-Up** — If you have HL equity, take top-up at HL rates (cheapest)
3. **Loan Against Property** — Use property equity at 9–12%

**Watch out for:**
- Total repayment might be higher if tenure extends significantly
- Ensure new interest rate is meaningfully lower than weighted average of existing loans

**Calculate weighted average rate:**
Σ(Loan Outstanding × Rate) / Total Outstanding`,
      suggestions: ['Am I a good candidate for consolidation?', 'Compare consolidation vs individual BT'],
    },
    {
      patterns: ['prepay', 'prepayment', 'part payment', 'early repayment', 'foreclose'],
      answer: `Prepayment reduces your principal and can save significant interest.

**Prepayment vs Investing — when to prepay:**
- If loan rate > expected investment returns → prepay
- Home loan @9% vs FD @7% → prepay the loan
- Home loan @8.5% vs equity market (avg 12%) → invest (but depends on risk tolerance)

**Smart prepayment strategy:**
1. Request tenure reduction (not EMI reduction) after prepayment — saves more
2. Prepay in the first half of loan tenure — interest impact is highest early
3. For home loans, prepay before 3 years → saves >30% of total interest

**No prepayment penalty on:**
- All floating rate loans (RBI mandate since 2012)
- Most personal loans after 12 months

**Penalty exists on:**
- Fixed rate loans: typically 2% of outstanding`,
      suggestions: ['Should I prepay or invest my bonus?', 'Calculate prepayment savings'],
    },
  ];

  constructor(
    private readonly bureauService: BureauService,
    private readonly breService: BREService,
  ) {}

  async generateInsights(userId: string): Promise<ProactiveInsight[]> {
    const bureau = await this.bureauService.getCachedBureau(userId);
    const insights: ProactiveInsight[] = [];

    if (!bureau) {
      return [
        {
          id: 'no-data',
          type: 'CIBIL_SCORE',
          severity: 'INFO',
          title: 'Fetch your bureau data',
          message: 'To get personalized insights, please fetch your credit bureau report first.',
          actionable: true,
          action: { label: 'Fetch Bureau Report', route: '/bureau' },
        },
      ];
    }

    const monthlyIncome = bureau.personalInfo?.monthlyIncome || 50000;

    // ── Insight 1: CIBIL Score ──────────────────────────────────────────────
    const score = bureau.cibilScore;
    if (score >= 800) {
      insights.push({
        id: 'cibil-excellent',
        type: 'CIBIL_SCORE',
        severity: 'POSITIVE',
        title: 'Excellent CIBIL Score',
        message: `Your score of ${score} puts you in the top tier. You qualify for the best rates from all lenders. Leverage this to negotiate lower rates on any new loans.`,
        actionable: false,
        metric: { label: 'CIBIL Score', value: score, benchmark: '750+ is Good', status: 'GOOD' },
      });
    } else if (score >= 750) {
      insights.push({
        id: 'cibil-good',
        type: 'CIBIL_SCORE',
        severity: 'POSITIVE',
        title: 'Good CIBIL Score',
        message: `Your score of ${score} is good. You qualify for competitive rates. A few more months of timely payments could push you into the Excellent bracket (800+).`,
        actionable: false,
        metric: { label: 'CIBIL Score', value: score, benchmark: '800+ for best rates', status: 'GOOD' },
      });
    } else if (score >= 700) {
      insights.push({
        id: 'cibil-fair',
        type: 'CIBIL_SCORE',
        severity: 'WARNING',
        title: 'Fair CIBIL Score — Room to Improve',
        message: `Your score of ${score} may result in higher interest rates. Focus on paying all dues on time and reducing CC utilization below 30%. Target: 750+ in 6 months.`,
        actionable: true,
        action: { label: 'View Improvement Tips', route: '/ai/chat' },
        metric: { label: 'CIBIL Score', value: score, benchmark: '750+ for good rates', status: 'WARN' },
      });
    } else {
      insights.push({
        id: 'cibil-poor',
        type: 'CIBIL_SCORE',
        severity: 'CRITICAL',
        title: 'Low CIBIL Score — Urgent Attention Needed',
        message: `Your score of ${score} will result in loan rejections or very high rates. Immediate actions: clear all overdue EMIs, pay CC minimum dues without fail, avoid new credit applications for 6 months.`,
        actionable: true,
        action: { label: 'Get Recovery Plan', route: '/ai/chat' },
        metric: { label: 'CIBIL Score', value: score, benchmark: '700+ minimum', status: 'BAD' },
      });
    }

    // ── Insight 2: EMI-to-Income Ratio ──────────────────────────────────────
    const totalEmi = bureau.summary.totalEmi + (bureau.summary.totalCcOutstanding / 24);
    const emiRatio = totalEmi / monthlyIncome;

    if (emiRatio > 0.75) {
      insights.push({
        id: 'emi-ratio-critical',
        type: 'EMI_RATIO',
        severity: 'CRITICAL',
        title: 'EMI Burden Too High',
        message: `Your EMIs are ${Math.round(emiRatio * 100)}% of your income — dangerously high. Most lenders reject loans when this exceeds 50%. Consider balance transfers to lower rates or consolidating debt to reduce monthly outflow.`,
        actionable: true,
        action: { label: 'View Reduction Strategies', route: '/bre/strategies' },
        metric: { label: 'EMI-to-Income', value: `${Math.round(emiRatio * 100)}%`, benchmark: '<50% recommended', status: 'BAD' },
      });
    } else if (emiRatio > 0.50) {
      insights.push({
        id: 'emi-ratio-warning',
        type: 'EMI_RATIO',
        severity: 'WARNING',
        title: 'EMI Ratio Approaching Limit',
        message: `Your EMIs are ${Math.round(emiRatio * 100)}% of income. Lenders typically allow up to 50%. Limited headroom for new credit. Focus on prepayment or BT to reduce burden.`,
        actionable: true,
        action: { label: 'Optimize EMIs', route: '/bre/strategies' },
        metric: { label: 'EMI-to-Income', value: `${Math.round(emiRatio * 100)}%`, benchmark: '<50% safe', status: 'WARN' },
      });
    } else if (emiRatio < 0.30) {
      insights.push({
        id: 'emi-ratio-good',
        type: 'EMI_RATIO',
        severity: 'POSITIVE',
        title: 'Healthy EMI-to-Income Ratio',
        message: `Your EMI burden is ${Math.round(emiRatio * 100)}% of income — well within safe limits. You have good capacity for additional credit if needed.`,
        actionable: false,
        metric: { label: 'EMI-to-Income', value: `${Math.round(emiRatio * 100)}%`, benchmark: '<50% safe', status: 'GOOD' },
      });
    }

    // ── Insight 3: CC Utilization ───────────────────────────────────────────
    if (bureau.creditCards.length > 0) {
      const totalLimit = bureau.creditCards.reduce((s, c) => s + c.limit, 0);
      const totalUsed = bureau.creditCards.reduce((s, c) => s + c.outstanding, 0);
      const overallUtil = Math.round(totalUsed / totalLimit * 100);

      if (overallUtil > 50) {
        insights.push({
          id: 'cc-utilization-high',
          type: 'CC_UTILIZATION',
          severity: 'WARNING',
          title: 'High Credit Card Utilization',
          message: `You're using ${overallUtil}% of your credit card limit (₹${totalUsed.toLocaleString('en-IN')} of ₹${totalLimit.toLocaleString('en-IN')}). Ideal is <30%. High utilization hurts your CIBIL score and signals financial stress to lenders.`,
          actionable: true,
          action: { label: 'Convert CC Debt to PL', route: '/products/personal-loan' },
          metric: { label: 'CC Utilization', value: `${overallUtil}%`, benchmark: '<30% ideal', status: overallUtil > 75 ? 'BAD' : 'WARN' },
        });
      }
    }

    // ── Insight 4: Missed Payments ──────────────────────────────────────────
    if (bureau.summary.missedPayments > 0) {
      insights.push({
        id: 'missed-payments',
        type: 'MISSED_PAYMENT',
        severity: bureau.summary.missedPayments > 2 ? 'CRITICAL' : 'WARNING',
        title: 'Missed Payments Detected',
        message: `${bureau.summary.missedPayments} account(s) show payment delays. This is the #1 factor damaging your CIBIL score. Set up auto-debit immediately for all EMIs. Clearing overdue amounts can recover 50–100 points over 6 months.`,
        actionable: false,
        metric: { label: 'Accounts with Delays', value: bureau.summary.missedPayments, benchmark: '0 missed payments', status: 'BAD' },
      });
    }

    // ── Insight 5: High Rate Loan Alert ────────────────────────────────────
    const highRateLoans = bureau.loans.filter(l => l.rate > 14 && l.status === 'ACTIVE');
    if (highRateLoans.length > 0) {
      const worst = highRateLoans.sort((a, b) => b.rate - a.rate)[0];
      insights.push({
        id: 'high-rate-loan',
        type: 'HIGH_RATE_LOAN',
        severity: 'WARNING',
        title: 'High Interest Rate Detected',
        message: `Your ${worst.type} with ${worst.lender} is at ${worst.rate}% — above current market rates. With ₹${worst.outstanding.toLocaleString('en-IN')} outstanding, a balance transfer could save significantly every month.`,
        actionable: true,
        action: { label: 'Find Better Rates', route: '/bre/strategies' },
        metric: { label: `${worst.type} Rate`, value: `${worst.rate}%`, benchmark: 'Market rate check', status: 'WARN' },
      });
    }

    // ── Insight 6: Savings Opportunity ─────────────────────────────────────
    const totalSavingsPotential = bureau.loans
      .filter(l => l.status === 'ACTIVE' && l.rate > 9)
      .reduce((total, l) => {
        const rateReduction = Math.max(0, l.rate - 8.5) / 100 / 12;
        return total + rateReduction * l.outstanding;
      }, 0);

    if (totalSavingsPotential > 2000) {
      insights.push({
        id: 'savings-opportunity',
        type: 'SAVINGS_OPPORTUNITY',
        severity: 'INFO',
        title: `Save up to ₹${Math.round(totalSavingsPotential).toLocaleString('en-IN')}/month`,
        message: `Based on your loan portfolio, you could save up to ₹${Math.round(totalSavingsPotential).toLocaleString('en-IN')} per month by optimizing interest rates through balance transfers. See BRE strategies for details.`,
        actionable: true,
        action: { label: 'View Strategies', route: '/bre/strategies' },
        metric: { label: 'Monthly Savings Potential', value: `₹${Math.round(totalSavingsPotential).toLocaleString('en-IN')}`, status: 'GOOD' },
      });
    }

    return insights;
  }

  async chat(
    message: string,
    context: ChatContext,
  ): Promise<{ reply: string; suggestions?: string[] }> {
    const lowerMsg = message.toLowerCase().trim();

    // PRODUCTION: Replace this rule-based matching with LLM call:
    // ─────────────────────────────────────────────────────────────
    // const contextStr = JSON.stringify({
    //   bureau: context.bureau,
    //   strategies: context.strategies,
    //   conversationHistory: context.conversationHistory,
    // });
    // const llmResponse = await this.callFinGPT(message, contextStr);
    // return { reply: llmResponse.text, suggestions: llmResponse.followups };
    // ─────────────────────────────────────────────────────────────

    // Match against knowledge base
    for (const entry of this.knowledgeBase) {
      if (entry.patterns.some(p => lowerMsg.includes(p))) {
        return { reply: entry.answer, suggestions: entry.suggestions };
      }
    }

    // Context-aware responses
    if (context.bureau) {
      const bureau = context.bureau;
      const score = bureau.cibilScore;
      const monthlyIncome = bureau.personalInfo?.monthlyIncome || 50000;
      const totalEmi = bureau.summary?.totalEmi || 0;
      const emiRatio = totalEmi / monthlyIncome;

      if (lowerMsg.includes('my score') || lowerMsg.includes('my cibil')) {
        return {
          reply: `Your CIBIL score is **${score}**. ${
            score >= 800 ? 'Excellent! You qualify for the best rates.' :
            score >= 750 ? 'Good score. A bit more consistency can push you to 800+.' :
            score >= 700 ? 'Fair. Focus on timely payments and lower CC utilization.' :
            'Needs improvement. Please clear any overdue amounts immediately.'
          }`,
          suggestions: ['How to improve my score?', 'What rate can I get with this score?'],
        };
      }

      if (lowerMsg.includes('my emi') || lowerMsg.includes('emi burden')) {
        return {
          reply: `Your total monthly EMI is **₹${totalEmi.toLocaleString('en-IN')}** — that's **${Math.round(emiRatio * 100)}%** of your monthly income. ${
            emiRatio > 0.6 ? 'This is quite high. I recommend exploring balance transfers or debt consolidation to reduce this.' :
            emiRatio > 0.4 ? 'This is manageable but leaves limited room. Monitor closely.' :
            'This is healthy. You have good borrowing headroom.'
          }`,
          suggestions: ['How to reduce my EMI?', 'Balance transfer options?'],
        };
      }

      if (lowerMsg.includes('eligible') || lowerMsg.includes('can i get') || lowerMsg.includes('qualify')) {
        const canGet = score >= 700 && emiRatio < 0.5;
        return {
          reply: `Based on your profile (CIBIL: ${score}, EMI ratio: ${Math.round(emiRatio * 100)}%): ${
            canGet
              ? 'You\'re likely eligible for personal loans and balance transfers. Your score and income ratio are within lender guidelines.'
              : score < 700
              ? 'Your CIBIL score of ' + score + ' may make it difficult. Work on improving it to 700+ first.'
              : 'Your EMI ratio of ' + Math.round(emiRatio * 100) + '% is too high. Lenders prefer under 50%.'
          }`,
          suggestions: ['What documents do I need?', 'Which lender should I approach?'],
        };
      }
    }

    // Greeting / general query
    if (lowerMsg.match(/^(hi|hello|hey|hola|namaste)/)) {
      return {
        reply: `Hi! I'm your Finfinity financial assistant. I can help you with:\n\n• Understanding your CIBIL score\n• Finding balance transfer opportunities\n• Reducing your EMI burden\n• Credit card debt management\n• Home loan optimization\n• Personal loan eligibility\n\nWhat would you like to know?`,
        suggestions: ['How can I improve my CIBIL score?', 'Should I do a balance transfer?', 'How to reduce EMI?'],
      };
    }

    // Fallback
    return {
      reply: `I understand you're asking about "${message}". As your financial assistant, I can help with:\n\n• CIBIL score improvement\n• Balance transfers and refinancing\n• EMI optimization\n• Credit card debt management\n• Loan eligibility\n\nCould you be more specific? Or ask about one of the topics above.`,
      suggestions: ['Explain balance transfer', 'How to improve CIBIL score', 'Am I eligible for a personal loan?'],
    };
  }

  async explainStrategy(
    strategyId: string,
    userId: string,
  ): Promise<{ explanation: string; steps: string[]; faqs: Array<{ q: string; a: string }> }> {
    // Determine strategy type from ID prefix
    const type = strategyId.startsWith('hl-bt') ? 'HOME_LOAN_BT'
      : strategyId.startsWith('pl-bt') ? 'PL_BT'
      : strategyId.startsWith('cc-bt') ? 'CC_TO_PL_BT'
      : strategyId.startsWith('consolidate') ? 'DEBT_CONSOLIDATION'
      : strategyId.startsWith('emi-reduce') ? 'EMI_REDUCTION'
      : 'GENERIC';

    const explanations: Record<string, {
      explanation: string;
      steps: string[];
      faqs: Array<{ q: string; a: string }>;
    }> = {
      HOME_LOAN_BT: {
        explanation: `A Home Loan Balance Transfer moves your existing home loan from your current lender to a new lender offering a lower interest rate. This can save you lakhs in interest over the remaining loan tenure without requiring any new income documentation — your existing loan track record speaks for itself.

The strategy makes sense when: (1) the rate difference is at least 1%, (2) you have significant outstanding balance, and (3) sufficient remaining tenure to recover switching costs.`,
        steps: [
          'Get a foreclosure letter from your current lender',
          'Apply with the new lender and get a sanction letter',
          'Submit property documents to new lender for technical + legal verification',
          'New lender pays off old lender directly (you don\'t handle the money)',
          'Your EMI to new lender starts from the following month',
          'Typical timeline: 3–4 weeks',
        ],
        faqs: [
          { q: 'Will my CIBIL score be impacted?', a: 'Yes, there will be one hard inquiry from the new lender, reducing score by 5–10 points temporarily. Long-term impact is neutral as you\'re not taking new debt.' },
          { q: 'What are the charges?', a: 'New lender: processing fee (0.5–1.5%), legal fee (₹5k–15k), technical valuation (₹5k–10k). Old lender: NIL for floating rate loans (RBI mandate).' },
          { q: 'Can I top up during BT?', a: 'Yes! Most lenders allow a top-up loan simultaneously at the same HL rate, which is cheaper than a personal loan.' },
          { q: 'Will I lose my tax benefits?', a: 'No. Tax deductions under 80C and 24(b) continue uninterrupted regardless of which lender holds the loan.' },
        ],
      },
      CC_TO_PL_BT: {
        explanation: `Converting your credit card outstanding to a Personal Loan dramatically reduces your interest cost. Credit cards charge 24–42% annually on revolving credit. A personal loan for the same amount costs just 10–14%. This strategy also improves your CIBIL score by reducing CC utilization.`,
        steps: [
          'Calculate total CC outstanding across all cards',
          'Check eligibility for personal loan (needs 700+ CIBIL)',
          'Apply for PL equal to total CC debt from your bank or Bajaj Finance',
          'Use PL disbursement to clear CC bills completely',
          'Stop using CCs for non-essential spending until PL is cleared',
          'Set up auto-debit for PL EMI',
        ],
        faqs: [
          { q: 'What about the CC account after clearing?', a: 'Keep the card open but don\'t use it for revolving credit. Available limit improves your CIBIL score (lower utilization).' },
          { q: 'What if I don\'t qualify for a PL?', a: 'Ask your CC bank to convert to an EMI plan at 14–18% — still much better than 36% revolving interest.' },
          { q: 'How much can I save?', a: 'On ₹1 lakh CC debt at 36%, you pay ₹3,000/month in interest alone. A PL at 12% for 24 months has total interest of ~₹13,000 vs ₹72,000+ in CC interest. Massive saving.' },
        ],
      },
      PL_BT: {
        explanation: `Transferring your Personal Loan to a lender offering a lower rate reduces your monthly EMI and total interest burden. Personal loan rates vary widely — from 10.5% to 24%+ — based on lender and your CIBIL score. Shopping for better rates after improving your score is always worthwhile.`,
        steps: [
          'Request current outstanding and foreclosure charges from existing lender',
          'Apply with target lender — most offer instant e-approval',
          'Get disbursement amount (equal to outstanding + foreclosure charge)',
          'Foreclose existing loan using PL disbursement',
          'New EMI starts next month',
          'Timeline: 3–7 working days',
        ],
        faqs: [
          { q: 'Is there a prepayment penalty?', a: 'Most lenders charge 2–4% if you close within 12 months. After 12 months, many waive it. Check your existing loan agreement.' },
          { q: 'Can I increase the loan amount during BT?', a: 'Yes, take a slightly higher amount than outstanding. Use the extra for any urgent need (effectively at PL rates).' },
        ],
      },
      DEBT_CONSOLIDATION: {
        explanation: `Debt consolidation combines all your loans into one single loan. Instead of managing 3–5 different EMIs to different lenders on different dates, you have one EMI, one lender, one due date. Typically done via a large Personal Loan or Home Loan top-up (if you have a home loan). Works best when the consolidated rate is lower than your weighted average rate across all loans.`,
        steps: [
          'List all loans: outstanding amount, rate, remaining EMI',
          'Calculate weighted average interest rate',
          'Apply for consolidation loan equal to total outstanding',
          'Use disbursement to close all individual loans',
          'Set up auto-debit for single consolidated EMI',
        ],
        faqs: [
          { q: 'Will total interest paid be lower?', a: 'Only if new rate is below weighted average rate of existing loans AND you don\'t significantly extend tenure. Calculate both scenarios before deciding.' },
          { q: 'Which is better — consolidation or individual BTs?', a: 'Individual BTs are better if each loan has a clear lower-rate option. Consolidation is better for simplicity and if you\'re struggling to manage multiple EMIs.' },
        ],
      },
      GENERIC: {
        explanation: 'This strategy is designed to optimize your financial position based on your bureau data and income profile. Our BRE engine has identified this as a relevant opportunity for your situation.',
        steps: [
          'Review the strategy details carefully',
          'Compare proposed lender rates',
          'Check your eligibility score',
          'Apply through the Finfinity platform',
          'Track application status in your dashboard',
        ],
        faqs: [
          { q: 'How accurate are the projections?', a: 'Projections are based on publicly available lender rates. Actual offers may vary slightly based on your complete credit profile.' },
        ],
      },
    };

    return explanations[type] || explanations.GENERIC;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTION LLM INTEGRATION STUBS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PRODUCTION: Call FinGPT inference endpoint
   * FinGPT is an open-source financial LLM fine-tuned on financial corpora
   *
   * private async callFinGPT(message: string, context: string): Promise<{ text: string; followups: string[] }> {
   *   const response = await this.httpService.post(
   *     this.configService.get('FINGPT_API_URL'),
   *     {
   *       prompt: this.buildFinGPTPrompt(message, context),
   *       max_length: 512,
   *       temperature: 0.7,
   *     },
   *   ).toPromise();
   *   return { text: response.data.generated_text, followups: [] };
   * }
   */

  /**
   * PRODUCTION: Call Claude API with financial RAG context
   *
   * private async callClaudeWithRAG(message: string, context: string): Promise<string> {
   *   const relevantDocs = await this.ragService.retrieve(message, 3);
   *   const augmentedPrompt = `Context: ${relevantDocs.join('\n')}\n\nUser financial data: ${context}\n\nQuestion: ${message}`;
   *
   *   const client = new Anthropic({ apiKey: this.configService.get('ANTHROPIC_API_KEY') });
   *   const response = await client.messages.create({
   *     model: 'claude-opus-4-5',
   *     max_tokens: 1024,
   *     messages: [{ role: 'user', content: augmentedPrompt }],
   *     system: `You are a certified financial advisor specializing in Indian retail credit products.
   *       Always give specific, actionable advice. Quote actual numbers and rates.
   *       Never give generic advice. Use the user's actual financial data in your response.`,
   *   });
   *   return response.content[0].text;
   * }
   */
}
