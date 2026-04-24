import { Global, Module } from "@nestjs/common";
import { SupabaseDataService } from "./supabase-data.service";

@Global()
@Module({
  providers: [SupabaseDataService],
  exports: [SupabaseDataService]
})
export class DataModule {}
