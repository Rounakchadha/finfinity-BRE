// ─────────────────────────────────────────────────────────────
// FINFINITY BRE ENGINE — Financial Calculators
// Exact port of logic from LoanStrategyOptimizer.html
// DO NOT change these formulas without consulting the BRE head
// ─────────────────────────────────────────────────────────────

export const N = (x: unknown): number => +(x as number) || 0;

export function fmt(n: number): string {
  n = Math.round(n || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function pct(a: number, b: number): string {
  return b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';
}

/** Monthly EMI calculation — standard reducing balance formula */
export function emi(bal: number, rate: number, mo: number): number {
  if (!bal || !mo || bal <= 0) return 0;
  const r = rate / 100 / 12;
  if (!r) return bal / mo;
  return (bal * r * Math.pow(1 + r, mo)) / (Math.pow(1 + r, mo) - 1);
}

/** Total interest paid over tenure */
export function totalInt(bal: number, rate: number, mo: number): number {
  return Math.max(0, emi(bal, rate, mo) * mo - bal);
}

/** Interest saved by switching from old rate to new rate */
export function intSaved(bal: number, rOld: number, rNew: number, mo: number): number {
  return Math.max(0, totalInt(bal, rOld, mo) - totalInt(bal, rNew, mo));
}

/** EMI difference between old and new rate */
export function emiDiff(bal: number, rOld: number, rNew: number, mo: number): number {
  return emi(bal, rOld, mo) - emi(bal, rNew, mo);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Future value of a SIP (Systematic Investment Plan) */
export function sipFV(monthly: number, rateAnnual: number, years: number): number {
  const r = rateAnnual / 100 / 12;
  const n = years * 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/** Future value of a lump sum investment */
export function lumpFV(lump: number, rateAnnual: number, years: number): number {
  return lump * Math.pow(1 + rateAnnual / 100, years);
}

/** Blended interest rate across multiple loans */
export function blendedRate(loans: Array<{ outstanding: number; rate: number }>): number {
  const totalBal = loans.reduce((s, l) => s + l.outstanding, 0);
  if (!totalBal) return 0;
  return loans.reduce((s, l) => s + l.outstanding * l.rate, 0) / totalBal;
}
