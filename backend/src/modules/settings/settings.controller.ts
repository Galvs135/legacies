import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../shared/auth.guard";
import { RequestUser } from "../../shared/auth.types";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { CreateActionTypeDto } from "./dto/create-action-type.dto";
import { CreatePipelineStageDto } from "./dto/create-pipeline-stage.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateActionTypeDto } from "./dto/update-action-type.dto";
import { UpdatePipelineStageDto } from "./dto/update-pipeline-stage.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  private getAccessToken(req: { headers: Record<string, string | string[] | undefined> }): string {
    const authorization = req.headers.authorization;
    if (!authorization || Array.isArray(authorization)) {
      throw new ForbiddenException("Missing bearer token.");
    }
    return authorization.replace("Bearer ", "").trim();
  }

  @UseGuards(AuthGuard)
  @Get("me")
  getMe(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }) {
    return this.settingsService.getMe(this.getAccessToken(req), req.user);
  }

  @UseGuards(AuthGuard)
  @Patch("me")
  updateMe(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateMe(this.getAccessToken(req), req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Get("users")
  listUsers(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.settingsService.listUsers(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("users")
  createUser(@Req() req: { headers: Record<string, string | string[] | undefined> }, @Body() dto: CreateUserDto) {
    return this.settingsService.createUser(this.getAccessToken(req), dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("users/:id")
  updateUser(
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Param("id") id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.settingsService.updateUser(this.getAccessToken(req), id, dto);
  }

  @UseGuards(AuthGuard)
  @Get("action-types")
  listActionTypes(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.settingsService.listActionTypes(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("action-types")
  createActionType(@Req() req: { headers: Record<string, string | string[] | undefined> }, @Body() dto: CreateActionTypeDto) {
    return this.settingsService.createActionType(this.getAccessToken(req), dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("action-types/:id")
  updateActionType(
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Param("id") id: string,
    @Body() dto: UpdateActionTypeDto
  ) {
    return this.settingsService.updateActionType(this.getAccessToken(req), id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("action-types/:id/delete")
  deleteActionType(@Req() req: { headers: Record<string, string | string[] | undefined> }, @Param("id") id: string) {
    return this.settingsService.deleteActionType(this.getAccessToken(req), id);
  }

  @UseGuards(AuthGuard)
  @Get("pipeline-stages")
  listPipelineStages(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.settingsService.listPipelineStages(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Post("pipeline-stages")
  createPipelineStage(@Req() req: { headers: Record<string, string | string[] | undefined> }, @Body() dto: CreatePipelineStageDto) {
    return this.settingsService.createPipelineStage(this.getAccessToken(req), dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("pipeline-stages/:id")
  updatePipelineStage(
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Param("id") id: string,
    @Body() dto: UpdatePipelineStageDto
  ) {
    return this.settingsService.updatePipelineStage(this.getAccessToken(req), id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @Patch("pipeline-stages/:id/delete")
  deletePipelineStage(@Req() req: { headers: Record<string, string | string[] | undefined> }, @Param("id") id: string) {
    return this.settingsService.deletePipelineStage(this.getAccessToken(req), id);
  }
}
