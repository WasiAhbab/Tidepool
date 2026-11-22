import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Post('code') @HttpCode(200) challenge(@Body() body: unknown, @Req() req: Request) {
    return this.service.challenge(body, req)
  }
  @Post('verify') @HttpCode(200) verify(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.service.verify(body, res, req)
  }
  @Post('committee') @HttpCode(200) login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.login(body, req, res)
  }
  @Get('session') current(@Req() req: Request) {
    return this.service.current(req)
  }
  @Get('staff') staff(@Req() req: Request) {
    return this.service.staff(req)
  }
  @Get('me') me(@Req() req: Request) {
    return this.service.me(req)
  }
  @Get('profile') profile(@Req() req: Request) {
    return this.service.profile(req)
  }
  @Post('logout') @HttpCode(200) logout(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.logout(body, req, res)
  }
}
