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
import { IsString, IsNotEmpty, IsObject, IsNumber, IsOptional } from 'class-validator';
import { BREService } from './bre.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

export class BREInputDto {
  @IsObject()
  @IsNotEmpty()
  bureau: any; // BureauData from bureau service

  @IsObject()
  @IsOptional()
  profile?: {
    monthlyIncome?: number;
    employmentType?: string;
    city?: string;
    age?: number;
  };
}

export class SimulateDto {
  @IsString()
  @IsNotEmpty()
  strategyId: string;

  @IsObject()
  @IsNotEmpty()
  params: {
    newRate?: number;
    newTenure?: number;
    topupAmount?: number;
    targetLender?: string;
  };
}

@ApiTags('bre')
@Controller('bre')
export class BREController {
  constructor(private readonly breService: BREService) {}

  @Post('strategies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate BRE strategies from bureau data',
    description:
      'Analyzes the user bureau data and generates ranked financial optimization strategies ' +
      '(balance transfers, EMI restructuring, debt consolidation, etc.). ' +
      'Uses the @finfinity/bre-engine package.',
  })
  @ApiResponse({ status: 200, description: 'Array of ranked strategies' })
  async getStrategies(
    @Body() dto: BREInputDto,
    @Request() req,
  ): Promise<any[]> {
    return this.breService.buildStrategies(dto.bureau, dto.profile, req.user.userId);
  }

  @Post('simulate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate a specific strategy with custom parameters',
    description:
      'Runs a "what-if" simulation for a given strategy. ' +
      'E.g., "what if I move my home loan to 8.5% for 20 years?"',
  })
  @ApiResponse({ status: 200, description: 'Simulation result with savings breakdown' })
  async simulateStrategy(
    @Body() dto: SimulateDto,
    @Request() req,
  ): Promise<any> {
    return this.breService.simulateStrategy(dto.strategyId, dto.params, req.user.userId);
  }
}
