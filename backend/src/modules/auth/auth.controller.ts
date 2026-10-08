import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { getRequestContext } from '../../common/request-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@Req() req: Request) {
    return req.user;
  }

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, getRequestContext(req));
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, getRequestContext(req));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto, getRequestContext(req));
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: LogoutDto, @Req() req: Request) {
    return this.auth.logout(dto, getRequestContext(req));
  }
}
