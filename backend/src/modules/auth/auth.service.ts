import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { RequestUser } from "../../shared/auth.types";
import { SupabaseDataService } from "../../shared/supabase-data.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseData: SupabaseDataService
  ) {}

  private get secret() {
    return this.configService.get<string>("APP_JWT_SECRET") ?? "legalytics-dev-secret";
  }

  signToken(payload: { id: string; email: string; role: "admin" | "advogado" }) {
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        exp: Date.now() + 1000 * 60 * 60 * 24
      }),
      "utf8"
    ).toString("base64url");
    const signature = createHmac("sha256", this.secret).update(body).digest("base64url");
    return `${body}.${signature}`;
  }

  verifyToken(token: string): RequestUser {
    const [body, signature] = token.split(".");
    if (!body || !signature) throw new UnauthorizedException("Invalid auth token.");
    const expected = createHmac("sha256", this.secret).update(body).digest("base64url");
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new UnauthorizedException("Invalid auth token.");
    }
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      id: string;
      email: string;
      role: "admin" | "advogado";
      exp: number;
    };
    if (!parsed.exp || parsed.exp < Date.now()) {
      throw new UnauthorizedException("Auth token expired.");
    }
    return {
      id: parsed.id,
      email: parsed.email,
      role: parsed.role
    };
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabaseData
      .dbAdmin()
      .from("users")
      .select("id, email, full_name, role, password")
      .ilike("email", email.trim())
      .maybeSingle();
    if (error || !data || data.password !== password) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }
    const role = data.role === "admin" ? "admin" : "advogado";
    const accessToken = this.signToken({ id: data.id, email: data.email, role });
    return {
      accessToken,
      user: {
        id: data.id,
        email: data.email,
        name: data.full_name,
        role
      }
    };
  }
}
