import { Module } from '@nestjs/common';
import { PersonalLoanModule } from './personal-loan/pl.module';
import { BureauModule } from '../bureau/bureau.module';

/**
 * ProductsModule — umbrella module for all financial product sub-modules.
 *
 * Current sub-modules:
 *   - PersonalLoanModule: PL eligibility, application, BT
 *
 * Future sub-modules to add:
 *   - HomeLoanModule: HL origination, BT
 *   - CreditCardModule: CC application, limit enhancement
 *   - LoanAgainstPropertyModule: LAP origination
 *   - InsuranceModule: Term, health insurance recommendations
 *
 * PARTNER INTEGRATION NOTE:
 * Each sub-module is an isolated integration point.
 * When a partner provides their own module/SDK, replace the corresponding
 * sub-module entirely without touching other product modules.
 */
@Module({
  imports: [
    BureauModule,
    PersonalLoanModule,
    // HomeLoanModule,        // TODO: Add when HL partner is ready
    // CreditCardModule,      // TODO: Add when CC partner is ready
    // InsuranceModule,       // TODO: Add when insurance partner is ready
  ],
  exports: [PersonalLoanModule],
})
export class ProductsModule {}
