import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../shared/auth.guard";
import { RequestUser } from "../../shared/auth.types";
import { Roles } from "../../shared/roles.decorator";
import { RolesGuard } from "../../shared/roles.guard";
import { CrmService } from "./crm.service";
import { CreateCaseDto } from "./dto/create-case.dto";
import { CreateInteractionDto } from "./dto/create-interaction.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { MoveCaseStageDto } from "./dto/move-case-stage.dto";
import { UpdateCaseProbabilityDto } from "./dto/update-case-probability.dto";

@Controller("crm")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  private getAccessToken(req: { headers: Record<string, string | string[] | undefined> }): string {
    const authorization = req.headers.authorization;
    if (!authorization || Array.isArray(authorization)) {
      throw new ForbiddenException("Missing bearer token.");
    }
    return authorization.replace("Bearer ", "").trim();
  }

  @UseGuards(AuthGuard)
  @Post("leads")
  createLead(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }, @Body() dto: CreateLeadDto) {
    return this.crmService.createLead(this.getAccessToken(req), req.user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Get("leads")
  listLeads(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.crmService.listLeads(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard)
  @Post("cases")
  createCase(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }, @Body() dto: CreateCaseDto) {
    return this.crmService.createCase(this.getAccessToken(req), req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Get("cases")
  listCases(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }) {
    return this.crmService.listCases(this.getAccessToken(req), req.user);
  }

  @UseGuards(AuthGuard)
  @Get("cases/:id")
  getCase(@Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> }, @Param("id") id: string) {
    return this.crmService.getCaseById(this.getAccessToken(req), req.user, id);
  }

  @UseGuards(AuthGuard)
  @Patch("cases/:id/stage")
  moveCase(
    @Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> },
    @Param("id") id: string,
    @Body() dto: MoveCaseStageDto
  ) {
    return this.crmService.moveCase(this.getAccessToken(req), req.user, id, dto.stage);
  }

  @UseGuards(AuthGuard)
  @Patch("cases/:id/probability")
  updateCaseProbability(
    @Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> },
    @Param("id") id: string,
    @Body() dto: UpdateCaseProbabilityDto
  ) {
    return this.crmService.updateCloseProbability(this.getAccessToken(req), req.user, id, dto.closeProbability);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "advogado")
  @Post("cases/:id/interactions")
  addInteraction(
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Param("id") caseId: string,
    @Body() dto: CreateInteractionDto
  ) {
    return this.crmService.addInteraction(this.getAccessToken(req), caseId, dto);
  }

  @UseGuards(AuthGuard)
  @Get("cases/:id/interactions")
  listInteractions(
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Param("id") caseId: string
  ) {
    return this.crmService.listInteractions(this.getAccessToken(req), caseId);
  }

  @UseGuards(AuthGuard)
  @Get("cases/:id/atendimento")
  getAttendance(
    @Req() req: { user: RequestUser; headers: Record<string, string | string[] | undefined> },
    @Param("id") caseId: string
  ) {
    return this.crmService.getAttendance(this.getAccessToken(req), req.user, caseId);
  }

  @UseGuards(AuthGuard)
  @Get("pipeline")
  getPipeline(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.crmService.getPipeline(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard)
  @Get("action-types")
  listActionTypes(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.crmService.listActionTypes(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard)
  @Get("pipeline-stages")
  listPipelineStages(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.crmService.listPipelineStages(this.getAccessToken(req));
  }
}
