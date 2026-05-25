// ─────────────────────────────────────────────────────────────
// Lender-specific Processing Fee & Foreclosure Charge defaults
// Pre-populated, user-editable on the frontend
// ─────────────────────────────────────────────────────────────
import { BureauLoan, LenderFeeDefaults } from './types';

export function getDefaultFees(loan: BureauLoan): LenderFeeDefaults {
  const lender = (loan.lender || '').toLowerCase();
  const out = loan.outstanding || 0;

  let pfRate = 0.005; // 0.5% default
  let fcRate = 0.02;  // 2% default

  if (lender.includes('sbi') || lender.includes('state bank')) {
    pfRate = 0.0035; fcRate = 0.02;
  } else if (lender.includes('hdfc')) {
    pfRate = 0.005; fcRate = 0.03;
  } else if (lender.includes('icici')) {
    pfRate = 0.005; fcRate = 0.025;
  } else if (lender.includes('bajaj')) {
    pfRate = 0.02; fcRate = 0.025;
  } else if (lender.includes('axis')) {
    pfRate = 0.0075; fcRate = 0.02;
  } else if (lender.includes('kotak')) {
    pfRate = 0.005; fcRate = 0.02;
  } else if (lender.includes('tata')) {
    pfRate = 0.015; fcRate = 0.02;
  } else if (lender.includes('poonawalla') || lender.includes('piramal')) {
    pfRate = 0.02; fcRate = 0.02;
  } else if (lender.includes('fullerton')) {
    pfRate = 0.02; fcRate = 0.025;
  } else if (lender.includes('hero')) {
    pfRate = 0.025; fcRate = 0.025;
  } else if (lender.includes('aditya') || lender.includes('birla') || lender.includes('abfl')) {
    pfRate = 0.02; fcRate = 0.02;
  } else if (lender.includes('idfc')) {
    pfRate = 0.02; fcRate = 0.02;
  } else if (lender.includes('chola') || lender.includes('cholamandalam')) {
    pfRate = 0.025; fcRate = 0.025;
  } else if (lender.includes('indus') || lender.includes('indusind')) {
    pfRate = 0.02; fcRate = 0.02;
  }

  const pf = Math.min(Math.max(Math.round(out * pfRate), 2000), 25000);
  const fc = Math.round(out * fcRate);

  return { pfRate, pf, fcRate, fc };
}
