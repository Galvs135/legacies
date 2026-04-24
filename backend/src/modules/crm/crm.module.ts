import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [NotificationModule],
  providers: [CrmService],
  controllers: [CrmController]
})
export class CrmModule {}
