// ─────────────────────────────────────────────────────────────
// Top-up Eligibility Engine
// Logic authored by BRE head — do not modify without approval
// ─────────────────────────────────────────────────────────────
import { BureauLoan, TopupEligibility } from './types';
import { N } from './calculators';

export function topupEligibility(
  loan: BureauLoan,
  houseValue: number,
): TopupEligibility | null {
  if (!loan || loan.dpd > 0 || loan.tenureElapsed < 12) return null;
  if (!houseValue || houseValue <= 0) return null; // property value required

  const elapsed = loan.tenureElapsed;
  let maxPctOfSanction: number;

  if (elapsed >= 12 && elapsed < 18)      maxPctOfSanction = 0.10;
  else if (elapsed >= 18 && elapsed < 24) maxPctOfSanction = 0.20;
  else if (elapsed >= 24)                 maxPctOfSanction = 0.30;
  else return null;

  const maxTopup = loan.sanction * maxPctOfSanction;
  const houseVal = N(houseValue);
  const ltv75 = houseVal * 0.75;
  const ltvCap = Math.max(0, ltv75 - loan.outstanding);
  const eligibleTopup = Math.min(maxTopup, ltvCap);

  if (eligibleTopup < 50000) return null;

  const pctOfSanction = eligibleTopup / loan.sanction;
  const topupRate = loan.rate + (pctOfSanction > 0.3 ? 0.5 : 0);

  return { maxPctOfSanction, maxTopup, ltvCap, eligibleTopup, topupRate, pctOfSanction };
}
