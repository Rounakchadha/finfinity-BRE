import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

interface OtpRecord {
  otp: string;
  pan: string;
  mobile: string;
  name: string;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory OTP store for demo. In production: use Redis with TTL.
  private readonly otpStore = new Map<string, OtpRecord>();

  // Max failed attempts before lockout
  private readonly MAX_ATTEMPTS = 5;
  // OTP validity window (5 minutes)
  private readonly OTP_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async sendOtp(
    pan: string,
    mobile: string,
    name: string,
  ): Promise<{ success: boolean; message: string }> {
    const isDemoMode = this.configService.get<string>('DEMO_MODE') === 'true';

    // Generate OTP
    const otp = isDemoMode
      ? '1234' // Fixed demo OTP — NEVER use in production
      : this.generateSecureOtp();

    const record: OtpRecord = {
      otp,
      pan: pan.toUpperCase(),
      mobile,
      name,
      expiresAt: new Date(Date.now() + this.OTP_TTL_MS),
      attempts: 0,
    };

    // Store keyed by mobile number
    this.otpStore.set(mobile, record);

    if (isDemoMode) {
      this.logger.log(`[DEMO] OTP for ${mobile}: ${otp} (PAN: ${pan})`);
    } else {
      // PRODUCTION: Integrate SMS gateway here
      // Example with AWS SNS:
      //   await this.snsClient.publish({
      //     PhoneNumber: `+91${mobile}`,
      //     Message: `Your Finfinity OTP is ${otp}. Valid for 5 minutes. Do not share.`,
      //   }).promise();
      //
      // Example with MSG91:
      //   await this.msg91Service.sendOtp(mobile, otp);
      //
      // Example with Twilio:
      //   await this.twilioClient.messages.create({
      //     body: `Your Finfinity OTP is ${otp}`,
      //     from: process.env.TWILIO_FROM,
      //     to: `+91${mobile}`,
      //   });
      this.logger.log(`OTP generated for ${mobile} (SMS gateway not configured)`);
    }

    return {
      success: true,
      message: isDemoMode
        ? 'OTP sent (Demo mode: use 1234)'
        : `OTP sent to +91${mobile.slice(0, 2)}XXXXXXXX${mobile.slice(-2)}`,
    };
  }

  async verifyOtp(
    mobile: string,
    otp: string,
  ): Promise<{ accessToken: string; user: any }> {
    const record = this.otpStore.get(mobile);

    if (!record) {
      throw new UnauthorizedException(
        'No OTP request found for this mobile. Please request a new OTP.',
      );
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      this.otpStore.delete(mobile);
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    // Increment attempt counter
    record.attempts += 1;

    // Check max attempts (brute-force protection)
    if (record.attempts > this.MAX_ATTEMPTS) {
      this.otpStore.delete(mobile);
      throw new UnauthorizedException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // Verify OTP
    if (record.otp !== otp.trim()) {
      const remaining = this.MAX_ATTEMPTS - record.attempts;
      throw new UnauthorizedException(
        `Invalid OTP. ${remaining} attempts remaining.`,
      );
    }

    // OTP valid — clean up store
    this.otpStore.delete(mobile);

    // Upsert user in our store (creates if new, returns existing if not)
    const user = await this.usersService.upsertUser({
      pan: record.pan,
      mobile: record.mobile,
      name: record.name,
    });

    // Build JWT payload
    const payload = {
      sub: user.id,
      userId: user.id,
      pan: user.pan,
      mobile: user.mobile,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user.id} authenticated successfully`);

    return {
      accessToken,
      user: {
        id: user.id,
        pan: user.pan,
        mobile: user.mobile,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  async getMe(userId: string): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      pan: user.pan,
      mobile: user.mobile,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  /**
   * Generates a cryptographically random 6-digit OTP.
   * Used in production mode. Do not use Math.random() for OTPs.
   */
  private generateSecureOtp(): string {
    const { randomInt } = require('crypto');
    return String(randomInt(100000, 999999));
  }
}
