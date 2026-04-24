import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RequestUser } from "../../shared/auth.types";
import { PipelineStage } from "../../shared/types";
import { SupabaseDataService } from "../../shared/supabase-data.service";
import { NotificationService } from "../notification/notification.module";
import { CreateCaseDto } from "./dto/create-case.dto";
import { CreateInteractionDto } from "./dto/create-interaction.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";

@Injectable()
export class CrmService {
  constructor(
    private readonly supabaseData: SupabaseDataService,
    private readonly notificationService: NotificationService
  ) {}

  private db(token: string) {
    return this.supabaseData.dbForToken(token);
  }

  private ensureCanManageCase(user: RequestUser, ownerUserId: string) {
    if (user.role === "admin" || user.id === ownerUserId) {
      return;
    }
    throw new ForbiddenException("Somente owner do caso ou admin podem alterar etapa.");
  }

  private mapCaseRow(row: any, user: RequestUser) {
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      leadName: row.lead_name ?? row.title,
      clientName: row.lead_name ?? row.title,
      title: row.title,
      actionTypeId: row.action_type_id,
      actionTypeName: row.action_types?.name ?? "Nao definido",
      actionValue: Number(row.action_value ?? row.estimated_value ?? 0),
      stage: row.pipeline_stage,
      closeProbability: Number(row.close_probability ?? 0),
      openedAt: row.opened_at ?? row.created_at,
      createdAt: row.created_at,
      canDrag: user.role === "admin" || user.id === row.owner_user_id
    };
  }

  async createLead(accessToken: string, userId: string, dto: CreateLeadDto) {
    const { data, error } = await this.db(accessToken)
      .from("leads")
      .insert({
        owner_user_id: userId,
        source: dto.source,
        status: "novo",
        interest_level: 1,
        name: dto.name,
        email: dto.email,
        notes: dto.notes ?? null
      })
      .select("id, owner_user_id, source, status, interest_level, name, email, notes, created_at")
      .single();
    if (error) throw new NotFoundException(error.message);
    const score = dto.notes?.length ? Math.min(0.9, dto.notes.length / 200) : 0.35;
    this.notificationService.notifyLeadHighProbability(data.id, score);
    return {
      id: data.id,
      ownerUserId: data.owner_user_id,
      name: data.name,
      email: data.email,
      source: data.source,
      notes: data.notes ?? undefined,
      createdAt: data.created_at
    };
  }

  async listLeads(accessToken: string) {
    const { data, error } = await this.db(accessToken)
      .from("leads")
      .select("id, owner_user_id, source, name, email, notes, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      ownerUserId: row.owner_user_id,
      source: row.source,
      name: row.name ?? "",
      email: row.email ?? "",
      notes: row.notes ?? undefined,
      createdAt: row.created_at
    }));
  }

  async getPipeline(accessToken: string) {
    const [stagesResp, casesResp] = await Promise.all([
      this.db(accessToken).from("pipeline_stages").select("name, position").order("position", { ascending: true }),
      this.db(accessToken).from("cases").select("pipeline_stage")
    ]);
    if (stagesResp.error) throw new NotFoundException(stagesResp.error.message);
    if (casesResp.error) throw new NotFoundException(casesResp.error.message);
    const counts = new Map<string, number>();
    for (const item of casesResp.data ?? []) {
      const stage = item.pipeline_stage as string;
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return (stagesResp.data ?? []).map((stage) => ({
      stage: stage.name,
      total: counts.get(stage.name) ?? 0
    }));
  }

  async createCase(accessToken: string, user: RequestUser, dto: CreateCaseDto) {
    const [{ data: actionType, error: actionTypeError }, { data: stages, error: stageError }] = await Promise.all([
      this.db(accessToken).from("action_types").select("id, name").eq("id", dto.actionTypeId).single(),
      this.db(accessToken).from("pipeline_stages").select("name, position").order("position", { ascending: true }).limit(1)
    ]);
    if (actionTypeError || !actionType) {
      throw new NotFoundException("Tipo de acao nao encontrado.");
    }
    if (stageError) throw new NotFoundException(stageError.message);
    const firstStage = stages?.[0]?.name ?? "prospeccao";
    const ownerUserId = user.role === "admin" && dto.ownerUserId ? dto.ownerUserId : user.id;
    const openedAt = new Date().toISOString();

    const { data, error } = await this.db(accessToken)
      .from("cases")
      .insert({
        owner_user_id: ownerUserId,
        title: `${actionType.name} - ${dto.leadName}`,
        pipeline_stage: firstStage,
        close_probability: dto.closeProbability,
        estimated_value: dto.actionValue,
        lead_name: dto.leadName,
        action_value: dto.actionValue,
        action_type_id: dto.actionTypeId,
        opened_at: openedAt
      })
      .select("id, owner_user_id, title, pipeline_stage, close_probability, estimated_value, lead_name, action_value, action_type_id, opened_at, created_at, action_types(name)")
      .single();
    if (error) throw new NotFoundException(error.message);
    await this.db(accessToken).from("whatsapp_conversations").insert({
      case_id: data.id,
      owner_user_id: ownerUserId,
      client_name: dto.clientName
    });
    return this.mapCaseRow(data, user);
  }

  async moveCase(accessToken: string, user: RequestUser, id: string, stage: PipelineStage) {
    const [{ data: stageExists, error: stageError }, { data: target, error: caseError }] = await Promise.all([
      this.db(accessToken).from("pipeline_stages").select("id").eq("name", stage).maybeSingle(),
      this.db(accessToken).from("cases").select("id, owner_user_id").eq("id", id).maybeSingle()
    ]);
    if (stageError) throw new NotFoundException(stageError.message);
    if (!stageExists) throw new NotFoundException("Etapa nao encontrada.");
    if (caseError) throw new NotFoundException(caseError.message);
    if (!target) return { found: false };
    this.ensureCanManageCase(user, target.owner_user_id);

    const { data, error } = await this.db(accessToken)
      .from("cases")
      .update({ pipeline_stage: stage })
      .eq("id", id)
      .select("id, owner_user_id, title, pipeline_stage, close_probability, estimated_value, lead_name, action_value, action_type_id, opened_at, created_at, action_types(name)")
      .single();
    if (error) throw new NotFoundException(error.message);
    return { found: true, case: this.mapCaseRow(data, user) };
  }

  async updateCloseProbability(accessToken: string, user: RequestUser, id: string, closeProbability: number) {
    const { data: target, error: caseError } = await this.db(accessToken)
      .from("cases")
      .select("id, owner_user_id")
      .eq("id", id)
      .maybeSingle();
    if (caseError) throw new NotFoundException(caseError.message);
    if (!target) return { found: false };
    this.ensureCanManageCase(user, target.owner_user_id);

    const { data, error } = await this.db(accessToken)
      .from("cases")
      .update({ close_probability: closeProbability })
      .eq("id", id)
      .select("id, owner_user_id, title, pipeline_stage, close_probability, estimated_value, lead_name, action_value, action_type_id, opened_at, created_at, action_types(name)")
      .single();
    if (error) throw new NotFoundException(error.message);
    return { found: true, case: this.mapCaseRow(data, user) };
  }

  async listCases(accessToken: string, user: RequestUser) {
    const { data, error } = await this.db(accessToken)
      .from("cases")
      .select("id, owner_user_id, title, pipeline_stage, close_probability, estimated_value, lead_name, action_value, action_type_id, opened_at, created_at, action_types(name)")
      .order("created_at", { ascending: false });
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((row) => this.mapCaseRow(row, user));
  }

  async getCaseById(accessToken: string, user: RequestUser, id: string) {
    const { data, error } = await this.db(accessToken)
      .from("cases")
      .select("id, owner_user_id, title, pipeline_stage, close_probability, estimated_value, lead_name, action_value, action_type_id, opened_at, created_at, action_types(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new NotFoundException(error.message);
    if (!data) return null;
    return this.mapCaseRow(data, user);
  }

  async addInteraction(accessToken: string, caseId: string, dto: CreateInteractionDto) {
    const { data, error } = await this.db(accessToken)
      .from("interactions")
      .insert({
        case_id: caseId,
        interaction_type: dto.kind,
        content: dto.content,
        sentiment: dto.sentiment ?? null
      })
      .select("id, case_id, interaction_type, content, sentiment, created_at")
      .single();
    if (error) throw new NotFoundException(error.message);
    return {
      id: data.id,
      caseId: data.case_id,
      kind: data.interaction_type,
      content: data.content,
      sentiment: data.sentiment ?? undefined,
      createdAt: data.created_at
    };
  }

  async listInteractions(accessToken: string, caseId: string) {
    const { data, error } = await this.db(accessToken)
      .from("interactions")
      .select("id, case_id, interaction_type, content, sentiment, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      caseId: item.case_id,
      kind: item.interaction_type,
      content: item.content,
      sentiment: item.sentiment ?? undefined,
      createdAt: item.created_at
    }));
  }

  async getAttendance(accessToken: string, user: RequestUser, caseId: string) {
    const legalCase = await this.getCaseById(accessToken, user, caseId);
    if (!legalCase) return null;
    const interactions = await this.listInteractions(accessToken, caseId);
    return {
      case: legalCase,
      client: { name: legalCase.clientName },
      interactions
    };
  }

  async listActionTypes(accessToken: string) {
    const { data, error } = await this.db(accessToken).from("action_types").select("id, name, created_at").order("name");
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.created_at
    }));
  }

  async listPipelineStages(accessToken: string) {
    const { data, error } = await this.db(accessToken).from("pipeline_stages").select("id, name, position, created_at").order("position");
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      order: item.position,
      createdAt: item.created_at
    }));
  }
}
