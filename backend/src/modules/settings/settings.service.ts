import { Injectable } from "@nestjs/common";
import { RequestUser } from "../../shared/auth.types";
import { SupabaseDataService } from "../../shared/supabase-data.service";
import { CreateActionTypeDto } from "./dto/create-action-type.dto";
import { CreatePipelineStageDto } from "./dto/create-pipeline-stage.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateActionTypeDto } from "./dto/update-action-type.dto";
import { UpdatePipelineStageDto } from "./dto/update-pipeline-stage.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly supabaseData: SupabaseDataService) {}

  private db(accessToken: string) {
    return this.supabaseData.dbForToken(accessToken);
  }

  async getMe(accessToken: string, user: RequestUser) {
    const { data: existing } = await this.db(accessToken)
      .from("users")
      .select("id, email, full_name, role, created_at")
      .eq("id", user.id)
      .maybeSingle();
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.full_name,
        role: existing.role
      };
    }
    const { data, error } = await this.db(accessToken)
      .from("users")
      .insert({
        id: user.id,
        email: user.email ?? `${user.id}@legalytics.local`,
        full_name: "Usuario",
        role: user.role
      })
      .select("id, email, full_name, role")
      .single();
    if (error) {
      return { id: user.id, email: user.email ?? "", name: "Usuario", role: user.role };
    }
    return { id: data.id, email: data.email, name: data.full_name, role: data.role };
  }

  async updateMe(accessToken: string, user: RequestUser, dto: UpdateProfileDto) {
    await this.getMe(accessToken, user);
    const patch: Record<string, string> = {};
    if (dto.name) patch.full_name = dto.name;
    if (dto.email) patch.email = dto.email;
    const { data, error } = await this.db(accessToken)
      .from("users")
      .update(patch)
      .eq("id", user.id)
      .select("id, email, full_name, role")
      .single();
    if (error) {
      return { id: user.id, email: dto.email ?? user.email ?? "", name: dto.name ?? "Usuario", role: user.role };
    }
    return {
      id: data.id,
      email: data.email,
      name: data.full_name,
      role: data.role
    };
  }

  async listUsers(accessToken: string) {
    const { data } = await this.db(accessToken).from("users").select("id, email, full_name, role").order("created_at", { ascending: false });
    return (data ?? []).map((item) => ({
      id: item.id,
      email: item.email,
      name: item.full_name,
      role: item.role
    }));
  }

  async createUser(accessToken: string, dto: CreateUserDto) {
    const { data: existing } = await this.db(accessToken)
      .from("users")
      .select("id, email, full_name, role")
      .ilike("email", dto.email)
      .maybeSingle();
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.full_name,
        role: existing.role
      };
    }
    const { data, error } = await this.db(accessToken)
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        email: dto.email,
        full_name: dto.name,
        role: dto.role,
        password: dto.password
      })
      .select("id, email, full_name, role")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      email: data.email,
      name: data.full_name,
      role: data.role
    };
  }

  async updateUser(accessToken: string, id: string, dto: UpdateUserDto) {
    const patch: Record<string, string> = {};
    if (dto.name) patch.full_name = dto.name;
    if (dto.email) patch.email = dto.email;
    if (dto.role) patch.role = dto.role;
    if (dto.password) patch.password = dto.password;
    const { data } = await this.db(accessToken)
      .from("users")
      .update(patch)
      .eq("id", id)
      .select("id, email, full_name, role")
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.full_name,
      role: data.role
    };
  }

  async listActionTypes(accessToken: string) {
    const { data, error } = await this.db(accessToken).from("action_types").select("id, name, created_at").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.created_at
    }));
  }

  async createActionType(accessToken: string, dto: CreateActionTypeDto) {
    const { data, error } = await this.db(accessToken)
      .from("action_types")
      .insert({ name: dto.name })
      .select("id, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at
    };
  }

  async updateActionType(accessToken: string, id: string, dto: UpdateActionTypeDto) {
    const { data } = await this.db(accessToken)
      .from("action_types")
      .update({ name: dto.name })
      .eq("id", id)
      .select("id, name, created_at")
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at
    };
  }

  async deleteActionType(accessToken: string, id: string) {
    await this.db(accessToken).from("action_types").delete().eq("id", id);
    return { success: true };
  }

  async listPipelineStages(accessToken: string) {
    const { data, error } = await this.db(accessToken).from("pipeline_stages").select("id, name, position, created_at").order("position");
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      order: item.position,
      createdAt: item.created_at
    }));
  }

  async createPipelineStage(accessToken: string, dto: CreatePipelineStageDto) {
    const { data, error } = await this.db(accessToken)
      .from("pipeline_stages")
      .insert({ name: dto.name, position: dto.order })
      .select("id, name, position, created_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      name: data.name,
      order: data.position,
      createdAt: data.created_at
    };
  }

  async updatePipelineStage(accessToken: string, id: string, dto: UpdatePipelineStageDto) {
    const patch: Record<string, string | number> = {};
    if (dto.name) patch.name = dto.name;
    if (dto.order) patch.position = dto.order;
    const { data } = await this.db(accessToken)
      .from("pipeline_stages")
      .update(patch)
      .eq("id", id)
      .select("id, name, position, created_at")
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      order: data.position,
      createdAt: data.created_at
    };
  }

  async deletePipelineStage(accessToken: string, id: string) {
    await this.db(accessToken).from("pipeline_stages").delete().eq("id", id);
    return { success: true };
  }
}
