import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

interface User {
  id: string;
  email: string;
  role_id: number;
  created_at: Date;
  updated_at: Date;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(
    @Body() signInDto: Record<string, string>,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Post('token')
  refreshToken(@Req() req: Request): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies['refreshToken'] as string;
    return this.authService.refreshAccessToken(refreshToken);
  }
}
