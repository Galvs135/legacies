import { Injectable, Logger, Module } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SupabaseDataService } from "../../shared/supabase-data.service";

@WebSocketGateway({
  cors: { origin: "*" }
})
class NotificationGateway {
  @WebSocketServer()
  private readonly server!: Server;

  broadcast(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(private readonly supabaseData: SupabaseDataService, private readonly gateway: NotificationGateway) {}

  notifyLeadHighProbability(leadId: string, probability: number) {
    if (probability >= 0.7) {
      this.gateway.broadcast("lead.highProbability", { leadId, probability });
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scanPendingFollowUps() {
    const { data, error } = await this.supabaseData.dbAdmin().from("cases").select("id").neq("pipeline_stage", "fechado");
    const pending = error ? 0 : (data ?? []).length;
    this.logger.log(`Follow-up scan completed. Pending cases: ${pending}`);
    this.gateway.broadcast("followup.scan", { pending, at: new Date().toISOString() });
  }
}

@Module({
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService]
})
export class NotificationModule {}
