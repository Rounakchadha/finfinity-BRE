import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { BureauService, BureauData } from './bureau.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

export class FetchBureauDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, { message: 'Invalid PAN format' })
  pan: string;
}

@ApiTags('bureau')
@Controller('bureau')
export class BureauController {
  constructor(private readonly bureauService: BureauService) {}

  @Post('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch bureau data for a PAN',
    description:
      'Returns credit bureau data including CIBIL score, loan portfolio, and credit history. ' +
      'Data is cached in Redis for 1 hour. In DEMO_MODE, returns seeded mock data. ' +
      'PRODUCTION: Replace mock with actual CIBIL/Experian/Equifax API call.',
  })
  @ApiResponse({ status: 200, description: 'Bureau data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async fetchBureau(
    @Body() dto: FetchBureauDto,
    @Request() req,
  ): Promise<BureauData> {
    return this.bureauService.fetchBureauData(
      dto.pan.toUpperCase(),
      req.user.userId,
    );
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get cached bureau data for a user',
    description: 'Returns previously fetched and cached bureau data for the given userId.',
  })
  @ApiResponse({ status: 200, description: 'Cached bureau data or null' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCachedBureau(
    @Param('userId') userId: string,
  ): Promise<BureauData | null> {
    return this.bureauService.getCachedBureau(userId);
  }
}
