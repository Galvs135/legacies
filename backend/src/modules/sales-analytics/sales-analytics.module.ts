import { Controller, ForbiddenException, Get, Injectable, Module, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "../../shared/auth.guard";
import { SupabaseDataService } from "../../shared/supabase-data.service";
const PDFDocument = require("pdfkit");

@Injectable()
class SalesAnalyticsService {
  constructor(private readonly supabaseData: SupabaseDataService) {}

  private db(accessToken: string) {
    return this.supabaseData.dbForToken(accessToken);
  }

  private async loadCasesAndLeads(accessToken: string) {
    const [casesResp, leadsResp] = await Promise.all([
      this.db(accessToken)
        .from("cases")
        .select("id, owner_user_id, title, pipeline_stage, action_value, estimated_value, close_probability, created_at"),
      this.db(accessToken).from("leads").select("id")
    ]);
    if (casesResp.error) throw new Error(casesResp.error.message);
    if (leadsResp.error) throw new Error(leadsResp.error.message);
    return {
      cases: casesResp.data ?? [],
      leads: leadsResp.data ?? []
    };
  }

  async getKpis(accessToken: string) {
    const { cases, leads } = await this.loadCasesAndLeads(accessToken);
    const wonCases = cases.filter((entry) => entry.pipeline_stage === "fechado").length;
    const totalCases = cases.length || 1;
    const totalInNegotiation = cases
      .filter((entry) => entry.pipeline_stage === "negociacao")
      .reduce((acc, item) => acc + Number(item.action_value ?? item.estimated_value ?? 0), 0);
    return {
      newLeads: leads.length,
      conversionRate: Number((wonCases / totalCases).toFixed(2)),
      totalInNegotiation,
      wonCases,
      lostCases: Math.max(0, totalCases - wonCases)
    };
  }

  async getLawyerPerformance(accessToken: string) {
    const { data, error } = await this.db(accessToken)
      .from("cases")
      .select("owner_user_id, pipeline_stage, action_value, estimated_value");
    if (error) throw new Error(error.message);
    const map = new Map<string, { cases: number; revenue: number }>();
    for (const legalCase of data ?? []) {
      const item = map.get(legalCase.owner_user_id) ?? { cases: 0, revenue: 0 };
      item.cases += 1;
      if (legalCase.pipeline_stage === "fechado") {
        item.revenue += Number(legalCase.action_value ?? legalCase.estimated_value ?? 0);
      }
      map.set(legalCase.owner_user_id, item);
    }
    return Array.from(map.entries()).map(([ownerUserId, value]) => ({ ownerUserId, ...value }));
  }

  async getFunnel(accessToken: string) {
    const [stagesResp, casesResp] = await Promise.all([
      this.db(accessToken).from("pipeline_stages").select("name, position").order("position", { ascending: true }),
      this.db(accessToken).from("cases").select("pipeline_stage")
    ]);
    if (stagesResp.error) throw new Error(stagesResp.error.message);
    if (casesResp.error) throw new Error(casesResp.error.message);
    const counts = new Map<string, number>();
    for (const entry of casesResp.data ?? []) {
      const stage = entry.pipeline_stage as string;
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return (stagesResp.data ?? []).map((stage) => ({
      stage: stage.name,
      total: counts.get(stage.name) ?? 0
    }));
  }

  async exportCsv(accessToken: string) {
    const { data, error } = await this.db(accessToken)
      .from("cases")
      .select("id, owner_user_id, pipeline_stage, action_value, estimated_value, close_probability");
    if (error) throw new Error(error.message);
    const header = "case_id,owner,stage,action_value,close_probability";
    const rows = (data ?? []).map(
      (item) =>
        `${item.id},${item.owner_user_id},${item.pipeline_stage},${Number(item.action_value ?? item.estimated_value ?? 0)},${Number(item.close_probability ?? 0)}`
    );
    return [header, ...rows].join("\n");
  }

  async exportPdf(accessToken: string): Promise<Buffer> {
    const [kpis, casesResp] = await Promise.all([
      this.getKpis(accessToken),
      this.db(accessToken).from("cases").select("title, pipeline_stage, action_value, estimated_value")
    ]);
    if (casesResp.error) throw new Error(casesResp.error.message);
    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 32 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (error: Error) => reject(error));

      doc.fontSize(18).text("Relatorio Legalytics");
      doc.moveDown();
      doc.fontSize(12).text(`Novos leads: ${kpis.newLeads}`);
      doc.text(`Taxa de conversao: ${(kpis.conversionRate * 100).toFixed(1)}%`);
      doc.text(`Valor em negociacao: R$ ${kpis.totalInNegotiation.toFixed(2)}`);
      doc.text(`Casos ganhos/perdidos: ${kpis.wonCases}/${kpis.lostCases}`);
      doc.moveDown();
      for (const entry of casesResp.data ?? []) {
        const value = Number(entry.action_value ?? entry.estimated_value ?? 0);
        doc.text(`${entry.title} - ${entry.pipeline_stage} - R$ ${value.toFixed(2)}`);
      }
      doc.end();
    });
  }
}

@Controller("sales-analytics")
class SalesAnalyticsController {
  constructor(private readonly analyticsService: SalesAnalyticsService) {}

  private getAccessToken(req: { headers: Record<string, string | string[] | undefined> }): string {
    const authorization = req.headers.authorization;
    if (!authorization || Array.isArray(authorization)) {
      throw new ForbiddenException("Missing bearer token.");
    }
    return authorization.replace("Bearer ", "").trim();
  }

  @UseGuards(AuthGuard)
  @Get("kpis")
  getKpis(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.analyticsService.getKpis(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard)
  @Get("funnel")
  getFunnel(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.analyticsService.getFunnel(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard)
  @Get("lawyer-performance")
  getLawyerPerformance(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    return this.analyticsService.getLawyerPerformance(this.getAccessToken(req));
  }

  @UseGuards(AuthGuard)
  @Get("reports/export")
  async exportReports(
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Query("format") format: "csv" | "pdf",
    @Res() res: Response
  ) {
    const accessToken = this.getAccessToken(req);
    if (format === "pdf") {
      const buffer = await this.analyticsService.exportPdf(accessToken);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=relatorio-legalytics.pdf");
      return res.send(buffer);
    }
    const csv = await this.analyticsService.exportCsv(accessToken);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=relatorio-legalytics.csv");
    return res.send(csv);
  }
}

@Module({
  providers: [SalesAnalyticsService],
  controllers: [SalesAnalyticsController]
})
export class SalesAnalyticsModule {}
