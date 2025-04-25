import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, string>) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @Post('token')
  @UseGuards(JwtGuard)
  refreshToken(@Body('token') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const accessToken = this.authService.refreshAccessToken(refreshToken);
      return accessToken;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
