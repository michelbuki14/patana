import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  login(@Body() dto: { email: string; password: string }){ return this.auth.validateUser(dto.email, dto.password); }
  @Get('me/:userId')
  me(@Param('userId') userId: string){ return this.auth.me(userId); }
}
