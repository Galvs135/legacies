import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseDataService {
  private readonly url: string;
  private readonly adminKey: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("SUPABASE_URL");
    const anonKey = this.configService.get<string>("SUPABASE_ANON_KEY");
    if (!url || !anonKey) {
      throw new InternalServerErrorException("Supabase credentials are not configured.");
    }
    this.url = url;
    this.adminKey = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY") ?? anonKey;
  }

  dbForToken(accessToken: string): SupabaseClient {
    return createClient(this.url, this.adminKey);
  }

  dbAdmin(): SupabaseClient {
    return createClient(this.url, this.adminKey);
  }
}
