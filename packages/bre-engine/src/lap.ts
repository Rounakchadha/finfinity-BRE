// ─────────────────────────────────────────────────────────────
// LAP (Loan Against Property) Eligibility Engine
// ─────────────────────────────────────────────────────────────
import { LapEligibility } from './types';

export function lapEligibility(
  propValue: number,
  existingMortgage = 0,
  isCommercial = false,
): LapEligibility {
  const ltvPct = isCommercial ? 0.55 : 0.65;
  const maxLoan = propValue * ltvPct;
  const eligible = Math.max(0, maxLoan - existingMortgage);
  return { ltvPct, maxLoan, eligible };
}
