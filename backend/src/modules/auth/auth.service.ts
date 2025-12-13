import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

interface User {
  id: string;
  email: string;
  password?: string;
  role_id: number;
  created_at: Date;
  updated_at: Date;
}

interface JwtPayload {
  email: string;
  sub: string;
}

@Injectable()
export class AuthService {
  private refreshTokens: string[] = [];

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  generateAccessToken(user: User): string {
    const payload: JwtPayload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  generateRefreshToken(user: User): string {
    const payload: JwtPayload = { email: user.email, sub: user.id };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: '7d',
    });
    this.refreshTokens.push(refreshToken);

    return refreshToken;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    if (!this.refreshTokens.includes(refreshToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      const payload = this.jwtService.verify<{ email: string; sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        },
      );

      const user = await this.usersService.findOne(payload.email);

      if (!user) {
        // noinspection ExceptionCaughtLocallyJS
        throw new UnauthorizedException('User not found');
      }

      return { accessToken: this.generateAccessToken(user) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signIn(
    email: string,
    pass: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.usersService.validateUser(email, pass);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshToken = this.generateRefreshToken(user);
    const accessToken = this.generateAccessToken(user);
    return { user, accessToken, refreshToken };
  }
}
