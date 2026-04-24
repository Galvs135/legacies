import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./modules/auth/auth.module";
import { CrmModule } from "./modules/crm/crm.module";
import { SalesAnalyticsModule } from "./modules/sales-analytics/sales-analytics.module";
import { AiIntegrationModule } from "./modules/ai-integration/ai-integration.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { WhatsAppModule } from "./modules/whatsapp/whatsapp.module";
import { DataModule } from "./shared/data.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DataModule,
    AuthModule,
    CrmModule,
    SettingsModule,
    WhatsAppModule,
    SalesAnalyticsModule,
    AiIntegrationModule,
    NotificationModule
  ]
})
export class AppModule {}
