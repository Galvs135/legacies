import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../../shared/auth.guard";
import { RequestUser } from "../../../shared/auth.types";
import { AuthService } from "../auth.service";
import { LoginDto } from "../dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  me(@Req() req: { user: RequestUser }) {
    return req.user;
  }
}
