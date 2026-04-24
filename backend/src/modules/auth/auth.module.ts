import { Global, Module } from "@nestjs/common";
import { AuthGuard } from "../../shared/auth.guard";
import { AuthService } from "./auth.service";
import { AuthController } from "./controllers/auth.controller";
import { HealthController } from "./controllers/health.controller";

@Global()
@Module({
  providers: [AuthService, AuthGuard],
  controllers: [HealthController, AuthController],
  exports: [AuthService, AuthGuard]
})
export class AuthModule {}
