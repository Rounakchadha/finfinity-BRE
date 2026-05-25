import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  pan: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile must be 10 digits' })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Mobile must be 10 digits' })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 6, { message: 'OTP must be 4–6 digits' })
  otp: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP to mobile',
    description:
      'Initiates OTP-based login. Stores user info linked to PAN. ' +
      'In DEMO_MODE, OTP is always 1234. In production, sends SMS via gateway.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ success: boolean; message: string }> {
    return this.authService.sendOtp(dto.pan, dto.mobile, dto.name);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and get JWT',
    description: 'Verifies OTP. Returns JWT access token and user profile on success.',
  })
  @ApiResponse({ status: 200, description: 'JWT token and user profile' })
  @ApiResponse({ status: 401, description: 'Invalid OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<{ accessToken: string; user: any }> {
    return this.authService.verifyOtp(dto.mobile, dto.otp);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req): Promise<any> {
    return this.authService.getMe(req.user.userId);
  }
}
