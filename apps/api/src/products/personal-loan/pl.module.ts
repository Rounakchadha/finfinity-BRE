import { Module } from '@nestjs/common';
import { PersonalLoanController } from './pl.controller';
import { PersonalLoanService } from './pl.service';

/**
 * PersonalLoanModule
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          PARTNER INTEGRATION POINT — PERSONAL LOAN              ║
 * ║                                                                  ║
 * ║  When your PL lending partner provides their own NestJS module,  ║
 * ║  replace this entire module with theirs:                         ║
 * ║                                                                  ║
 * ║  import { PartnerPLModule } from '@partner/personal-loan';       ║
 * ║                                                                  ║
 * ║  The rest of the application (BRE, AI, bureau) remains intact.  ║
 * ║  Only this module is swapped out.                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Module({
  controllers: [PersonalLoanController],
  providers: [PersonalLoanService],
  exports: [PersonalLoanService],
})
export class PersonalLoanModule {}
