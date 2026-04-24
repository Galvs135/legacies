import { Body, Controller, ForbiddenException, Get, Injectable, Module, Param, Post, Req, UseGuards } from "@nestjs/common";
import { IsString } from "class-validator";
import { AuthGuard } from "../../shared/auth.guard";
import { RequestUser } from "../../shared/auth.types";
import { SupabaseDataService } from "../../shared/supabase-data.service";

class SendMessageDto {
  @IsString()
  content!: string;
}

@Injectable()
class WhatsAppService {
  constructor(private readonly supabaseData: SupabaseDataService) {}

  private db(accessToken: string) {
    return this.supabaseData.dbForToken(accessToken);
  }

  private async assertConversationAccess(accessToken: string, user: RequestUser, conversationId: string) {
    const { data, error } = await this.db(accessToken)
      .from("whatsapp_conversations")
      .select("id, case_id, owner_user_id, client_name, status, created_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    if (user.role !== "admin" && data.owner_user_id !== user.id) {
      throw new ForbiddenException("Insufficient role.");
    }
    return data;
  }

  async listConversations(accessToken: string, user: RequestUser) {
    const query = this.db(accessToken)
      .from("whatsapp_conversations")
      .select("id, case_id, owner_user_id, client_name, status, created_at")
      .order("created_at", { ascending: false });
    if (user.role !== "admin") {
      query.eq("owner_user_id", user.id);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const conversations = data ?? [];
    if (conversations.length === 0) {
      return [];
    }
    const ids = conversations.map((item) => item.id);
    const { data: messages } = await this.db(accessToken)
      .from("whatsapp_messages")
      .select("conversation_id, sent_at")
      .in("conversation_id", ids)
      .order("sent_at", { ascending: false });
    const lastByConversation = new Map<string, string>();
    for (const msg of messages ?? []) {
      if (!lastByConversation.has(msg.conversation_id)) {
        lastByConversation.set(msg.conversation_id, msg.sent_at);
      }
    }
    return conversations.map((item) => ({
      id: item.id,
      caseId: item.case_id,
      clientName: item.client_name,
      status: item.status,
      lastMessageAt: lastByConversation.get(item.id)
    }));
  }

  async listMessages(accessToken: string, user: RequestUser, conversationId: string) {
    const conversation = await this.assertConversationAccess(accessToken, user, conversationId);
    if (!conversation) {
      return [];
    }
    const { data, error } = await this.db(accessToken)
      .from("whatsapp_messages")
      .select("id, conversation_id, from_role, content, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      conversationId: item.conversation_id,
      from: item.from_role,
      content: item.content,
      sentAt: item.sent_at
    }));
  }

  async sendLawyerMessage(accessToken: string, user: RequestUser, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.assertConversationAccess(accessToken, user, conversationId);
    if (!conversation) return null;
    const { data, error } = await this.db(accessToken)
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        from_role: "advogado",
        content: dto.content
      })
      .select("id, conversation_id, from_role, content, sent_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      conversationId: data.conversation_id,
      from: data.from_role,
      content: data.content,
      sentAt: data.sent_at
    };
  }
}

@Controller("whatsapp")
class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  private getAccessToken(req: { headers: Record<string, string | string[] | undefined> }): string {
    const authorization = req.headers.authorization;
    if (!authorization || Array.isArray(authorization)) {
      throw new ForbiddenException("Missing bearer token.");
    }
    return authorization.replace("Bearer ", "").trim();
  }

  @UseGuards(AuthGuard)
  @Get("conversations")
  listConversations(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }) {
    return this.whatsappService.listConversations(this.getAccessToken(req), req.user);
  }

  @UseGuards(AuthGuard)
  @Get("conversations/:id/messages")
  listMessages(
    @Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> },
    @Param("id") conversationId: string
  ) {
    return this.whatsappService.listMessages(this.getAccessToken(req), req.user, conversationId);
  }

  @UseGuards(AuthGuard)
  @Post("conversations/:id/messages")
  sendMessage(
    @Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> },
    @Param("id") conversationId: string,
    @Body() dto: SendMessageDto
  ) {
    return this.whatsappService.sendLawyerMessage(this.getAccessToken(req), req.user, conversationId, dto);
  }
}

@Module({
  providers: [WhatsAppService],
  controllers: [WhatsAppController]
})
export class WhatsAppModule {}
