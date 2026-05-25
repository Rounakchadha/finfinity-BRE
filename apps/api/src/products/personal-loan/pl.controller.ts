import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsObject, IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { PersonalLoanService, EligibilityResult, ApplicationResult } from './pl.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';

export class PLEligibilityDto {
  @IsObject()
  @IsNotEmpty()
  bureau: any; // BureauData

  @IsObject()
  @IsOptional()
  profile?: {
    monthlyIncome?: number;
    employmentType?: 'SALARIED' | 'SELF_EMPLOYED';
    city?: string;
    age?: number;
    companyName?: string;
    yearsEmployed?: number;
  };

  @IsNumber()
  @IsOptional()
  @Min(10000)
  @Max(5000000)
  requestedAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(6)
  @Max(84)
  requestedTenure?: number; // months
}

export class PLApplyDto {
  @IsString()
  @IsNotEmpty()
  lender: string;

  @IsNumber()
  @Min(10000)
  amount: number;

  @IsNumber()
  @Min(6)
  @Max(84)
  tenure: number; // months

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsObject()
  @IsOptional()
  applicantDetails?: {
    name?: string;
    pan?: string;
    mobile?: string;
    email?: string;
  };
}

/**
 * PersonalLoanController
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          PARTNER INTEGRATION POINT — PERSONAL LOAN              ║
 * ║                                                                  ║
 * ║  Replace this module with partner's PL module when ready.       ║
 * ║                                                                  ║
 * ║  The partner module should expose these same routes:             ║
 * ║  POST /products/personal-loan/eligibility                        ║
 * ║  POST /products/personal-loan/apply                              ║
 * ║                                                                  ║
 * ║  And return the same EligibilityResult / ApplicationResult       ║
 * ║  interfaces for BRE + AI modules to function correctly.          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@ApiTags('products')
@Controller('products/personal-loan')
export class PersonalLoanController {
  constructor(private readonly plService: PersonalLoanService) {}

  @Post('eligibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check personal loan eligibility',
    description:
      'Evaluates PL eligibility across multiple lenders based on bureau data and profile. ' +
      'Returns ranked list of eligible lenders with rates and amounts. ' +
      'PARTNER INTEGRATION: Replace this with partner eligibility API.',
  })
  @ApiResponse({ status: 200, description: 'Eligibility results across lenders' })
  async checkEligibility(
    @Body() dto: PLEligibilityDto,
    @Request() req,
  ): Promise<EligibilityResult> {
    return this.plService.checkEligibility(
      dto.bureau,
      dto.profile,
      dto.requestedAmount,
      dto.requestedTenure,
      req.user.userId,
    );
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit personal loan application',
    description:
      'Submits a personal loan application to the selected lender. ' +
      'In DEMO_MODE: returns a mock application reference. ' +
      'PARTNER INTEGRATION: Route this to partner\'s loan origination system (LOS).',
  })
  @ApiResponse({ status: 200, description: 'Application reference and status' })
  async applyForLoan(
    @Body() dto: PLApplyDto,
    @Request() req,
  ): Promise<ApplicationResult> {
    return this.plService.submitApplication(
      dto.lender,
      dto.amount,
      dto.tenure,
      dto.purpose,
      dto.applicantDetails,
      req.user.userId,
    );
  }
}
