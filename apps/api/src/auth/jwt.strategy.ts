import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  userId: string;
  pan: string;
  mobile: string;
  name: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Extract Bearer token from Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'finfinity-bre-secret-change-in-prod',
      ),
    });
  }

  /**
   * Called after token signature is verified.
   * Return value is attached to req.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Optionally validate user still exists in DB
    const user = await this.usersService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // req.user will be set to this object
    return {
      sub: payload.sub,
      userId: payload.userId,
      pan: payload.pan,
      mobile: payload.mobile,
      name: payload.name,
    };
  }
}
