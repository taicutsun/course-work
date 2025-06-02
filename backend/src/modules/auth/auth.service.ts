import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/types/user.types';

@Injectable()
export class AuthService {
  private refreshTokens: string[] = [];

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  generateAccessToken(user: UserType): string {
    return this.jwtService.sign(
      { username: user.username, sub: user.id },
      { expiresIn: '7d' },
    );
  }

  generateRefreshToken(user: UserType): string {
    const refreshToken = this.jwtService.sign(
      { username: user.username, sub: user.id },
      {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      },
    );
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
      const payload = this.jwtService.verify<{ username: string; sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        },
      );

      const user = await this.usersService.findOne(payload.username);

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
    username: string,
    pass: string,
  ): Promise<{ user: UserType; accessToken: string }> {
    const user = await this.usersService.findOne(username);

    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }

    const refreshToken = this.generateRefreshToken(user);
    const accessToken = this.generateAccessToken(user);
    return Promise.resolve({ user, accessToken, refreshToken });
  }
}
