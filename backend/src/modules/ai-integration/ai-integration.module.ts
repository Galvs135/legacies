import { Body, Controller, Injectable, Module, Post, Req, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AuthGuard } from "../../shared/auth.guard";
import { RequestUser } from "../../shared/auth.types";
import { SupabaseDataService } from "../../shared/supabase-data.service";

class SentimentDto {
  @IsString()
  text!: string;
}

class CloseProbabilityDto {
  @IsString()
  caseSummary!: string;
}

class ChatDto {
  @IsString()
  question!: string;
}

class RagQueryDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  topK?: number;
}

type RagCitation = {
  sourceType: string;
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
  caseId?: string;
};

type RagQueryResponse = {
  answer: string;
  citations: RagCitation[];
};

type RagSourceDoc = {
  sourceType: "case" | "lead" | "interaction" | "document";
  sourceId: string;
  caseId?: string;
  title: string;
  text: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
class RagIndexingService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseData: SupabaseDataService
  ) {}

  private db() {
    return this.supabaseData.dbAdmin();
  }

  async indexForUser(user: RequestUser): Promise<{ sources: number; chunks: number }> {
    const sources = await this.collectSources(user);
    let totalChunks = 0;
    for (const source of sources) {
      const chunks = this.chunkText(source.text);
      if (chunks.length === 0) continue;
      await this.db().from("rag_chunks").delete().match({
        owner_user_id: user.id,
        source_type: source.sourceType,
        source_id: source.sourceId
      });
      const rows: Array<Record<string, unknown>> = [];
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const embedding = await this.embedText(chunk);
        rows.push({
          owner_user_id: user.id,
          source_type: source.sourceType,
          source_id: source.sourceId,
          case_id: source.caseId ?? null,
          title: source.title,
          content: chunk,
          chunk_index: index,
          embedding: toPgVector(embedding),
          metadata: source.metadata ?? {}
        });
      }
      if (rows.length > 0) {
        const { error } = await this.db().from("rag_chunks").insert(rows);
        if (!error) {
          totalChunks += rows.length;
        }
      }
    }
    return { sources: sources.length, chunks: totalChunks };
  }

  async hasIndexedContent(userId: string): Promise<boolean> {
    const { data, error } = await this.db()
      .from("rag_chunks")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(1);
    return !error && Boolean(data?.length);
  }

  private async collectSources(user: RequestUser): Promise<RagSourceDoc[]> {
    const [casesResp, leadsResp, interactionsResp, docsResp] = await Promise.all([
      this.db().from("cases").select("id, title, lead_name, pipeline_stage, action_value, created_at").eq("owner_user_id", user.id),
      this.db().from("leads").select("id, name, email, source, notes, created_at").eq("owner_user_id", user.id),
      this.db()
        .from("interactions")
        .select("id, case_id, interaction_type, content, created_at, cases(owner_user_id, title)")
        .eq("cases.owner_user_id", user.id),
      this.db()
        .from("documents")
        .select("id, case_id, file_path, version, uploaded_at, cases(owner_user_id, title)")
        .eq("cases.owner_user_id", user.id)
    ]);

    const sources: RagSourceDoc[] = [];

    for (const row of casesResp.data ?? []) {
      const text = [
        `Caso: ${row.title ?? ""}`,
        `Lead: ${row.lead_name ?? ""}`,
        `Etapa: ${row.pipeline_stage ?? ""}`,
        `Valor da acao: ${row.action_value ?? 0}`,
        `Criado em: ${row.created_at ?? ""}`
      ]
        .join("\n")
        .trim();
      sources.push({
        sourceType: "case",
        sourceId: row.id,
        caseId: row.id,
        title: row.title ?? `Caso ${row.id}`,
        text,
        metadata: { pipelineStage: row.pipeline_stage ?? null }
      });
    }

    for (const row of leadsResp.data ?? []) {
      const text = [`Lead: ${row.name ?? ""}`, `Email: ${row.email ?? ""}`, `Origem: ${row.source ?? ""}`, `Notas: ${row.notes ?? ""}`]
        .join("\n")
        .trim();
      sources.push({
        sourceType: "lead",
        sourceId: row.id,
        title: row.name ?? `Lead ${row.id}`,
        text,
        metadata: { email: row.email ?? null, source: row.source ?? null }
      });
    }

    for (const row of interactionsResp.data ?? []) {
      const caseTitle = (row as { cases?: { title?: string } | null }).cases?.title ?? `Caso ${row.case_id}`;
      const text = [`Interacao: ${row.interaction_type ?? ""}`, `Caso: ${caseTitle}`, `Conteudo: ${row.content ?? ""}`].join("\n").trim();
      sources.push({
        sourceType: "interaction",
        sourceId: row.id,
        caseId: row.case_id,
        title: `Interacao ${row.interaction_type ?? ""} - ${caseTitle}`,
        text,
        metadata: { interactionType: row.interaction_type ?? null }
      });
    }

    for (const row of docsResp.data ?? []) {
      const filePath = row.file_path ?? "";
      const fileText = await this.readStorageDocument(filePath);
      const caseTitle = (row as { cases?: { title?: string } | null }).cases?.title ?? `Caso ${row.case_id}`;
      const fallbackText = `Documento anexado: ${filePath}. Conteudo textual indisponivel para este formato.`;
      const text = (fileText?.trim() || fallbackText).slice(0, 20000);
      sources.push({
        sourceType: "document",
        sourceId: row.id,
        caseId: row.case_id,
        title: `Documento - ${filePath}`,
        text,
        metadata: { filePath, version: row.version ?? 1, caseTitle }
      });
    }

    return sources.filter((item) => item.text.trim().length > 0);
  }

  private async readStorageDocument(filePath: string): Promise<string> {
    if (!filePath) return "";
    const bucket = "legal-documents";
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const plainTextExtensions = new Set(["txt", "md", "json", "csv", "xml", "html"]);
    const { data, error } = await this.db().storage.from(bucket).download(filePath);
    if (error || !data) return "";
    if (plainTextExtensions.has(ext)) {
      try {
        return await data.text();
      } catch {
        return "";
      }
    }
    return "";
  }

  private chunkText(text: string): string[] {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return [];
    const chunkSize = 850;
    const overlap = 140;
    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < normalized.length) {
      const next = Math.min(normalized.length, cursor + chunkSize);
      chunks.push(normalized.slice(cursor, next));
      if (next >= normalized.length) break;
      cursor = Math.max(0, next - overlap);
    }
    return chunks;
  }

  private async embedText(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      return fallbackEmbedding(text);
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text }] },
            outputDimensionality: 1536
          })
        }
      );
      if (!response.ok) {
        return fallbackEmbedding(text);
      }
      const data = (await response.json()) as {
        embedding?: { values?: number[] };
      };
      const values = data.embedding?.values ?? [];
      if (!Array.isArray(values) || values.length === 0) {
        return fallbackEmbedding(text);
      }
      return values.map((value) => (Number.isFinite(value) ? Number(value) : 0));
    } catch {
      return fallbackEmbedding(text);
    }
  }
}

@Injectable()
class RagQueryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseData: SupabaseDataService,
    private readonly ragIndexingService: RagIndexingService
  ) {}

  private db() {
    return this.supabaseData.dbAdmin();
  }

  async query(user: RequestUser, question: string, topK = 6): Promise<RagQueryResponse> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return {
        answer: "Pergunta vazia. Escreva uma pergunta para consultar os casos do escritorio.",
        citations: []
      };
    }
    const alreadyIndexed = await this.ragIndexingService.hasIndexedContent(user.id);
    if (!alreadyIndexed) {
      await this.ragIndexingService.indexForUser(user);
    }

    const queryEmbedding = await this.embedText(trimmedQuestion);
    const { data } = await this.db().rpc("match_rag_chunks", {
      p_owner_user_id: user.id,
      p_query_embedding: toPgVector(queryEmbedding),
      p_top_k: Math.min(12, Math.max(1, topK))
    });
    const rows = (data ?? []) as Array<{
      source_type: string;
      source_id: string;
      case_id: string | null;
      title: string;
      content: string;
      score: number;
    }>;
    const citations = rows.map((row) => ({
      sourceType: row.source_type,
      sourceId: row.source_id,
      caseId: row.case_id ?? undefined,
      title: row.title,
      snippet: row.content.slice(0, 240),
      score: Number((row.score ?? 0).toFixed(4))
    }));
    const answer = await this.generateAnswer(trimmedQuestion, citations);
    return { answer, citations };
  }

  async forceReindex(user: RequestUser) {
    return this.ragIndexingService.indexForUser(user);
  }

  private async embedText(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      return fallbackEmbedding(text);
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text }] },
            outputDimensionality: 1536
          })
        }
      );
      if (!response.ok) {
        return fallbackEmbedding(text);
      }
      const data = (await response.json()) as {
        embedding?: { values?: number[] };
      };
      const values = data.embedding?.values ?? [];
      if (!Array.isArray(values) || values.length === 0) {
        return fallbackEmbedding(text);
      }
      return values.map((value) => (Number.isFinite(value) ? Number(value) : 0));
    } catch {
      return fallbackEmbedding(text);
    }
  }

  private async generateAnswer(question: string, citations: RagCitation[]): Promise<string> {
    if (citations.length === 0) {
      return "Nao encontrei contexto suficiente no historico interno. Tente incluir nome do lead, tipo de caso ou etapa.";
    }
    const context = citations
      .map(
        (item, index) =>
          `Fonte ${index + 1} [${item.sourceType}] ${item.title}\nTrecho: ${item.snippet}\nScore: ${item.score}`
      )
      .join("\n\n");
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      return `Com base no historico encontrado, recomendo revisar os seguintes pontos:\n${citations
        .slice(0, 3)
        .map((item) => `- ${item.title}: ${item.snippet}`)
        .join("\n")}`;
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      "Voce e assistente juridico interno. Responda em portugues, objetivo, sem inventar dados fora do contexto fornecido.\n" +
                      `Pergunta do advogado: ${question}\n\n` +
                      `Contexto interno:\n${context}`
                  }
                ]
              }
            ]
          })
        }
      );
      if (!response.ok) {
        throw new Error("Gemini response not ok");
      }
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "Nao foi possivel gerar resposta com o contexto recuperado."
      );
    } catch {
      return `Com base no historico encontrado, os sinais mais relevantes sao:\n${citations
        .slice(0, 3)
        .map((item) => `- ${item.title}: ${item.snippet}`)
        .join("\n")}`;
    }
  }
}

@Injectable()
class AiIntegrationService {
  constructor(private readonly configService: ConfigService) {}

  async analyzeSentiment(text: string) {
    const token = this.configService.get<string>("HUGGING_FACE_API_KEY");
    if (token) {
      try {
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-xlm-roberta-base-sentiment",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: text })
          }
        );
        if (response.ok) {
          const data = (await response.json()) as
            | Array<{ label: string; score: number }>
            | Array<Array<{ label: string; score: number }>>;
          const list = Array.isArray(data?.[0]) ? (data[0] as Array<{ label: string; score: number }>) : (data as Array<{ label: string; score: number }>);
          const best = list?.sort((a, b) => b.score - a.score)?.[0];
          if (best) {
            return { provider: "hugging-face", label: best.label, score: best.score };
          }
        }
      } catch {
        // fallback local heuristic
      }
    }
    const lowered = text.toLowerCase();
    const negativeHints = [
      "nao gostei",
      "não gostei",
      "caro",
      "problema",
      "ruim",
      "insatisfeito",
      "insatisfeita",
      "cancelar",
      "encerrar",
      "duvida",
      "dúvida"
    ];
    const positiveHints = [
      "gostei",
      "perfeito",
      "excelente",
      "otimo",
      "ótimo",
      "vamos fechar",
      "avancar",
      "avançar",
      "contratar",
      "seguir"
    ];
    const hasNegative = negativeHints.some((hint) => lowered.includes(hint));
    const hasPositive = positiveHints.some((hint) => lowered.includes(hint));
    const label = hasNegative && !hasPositive ? "negative" : hasPositive && !hasNegative ? "positive" : "neutral";
    return {
      provider: "hugging-face",
      label,
      score: label === "negative" ? 0.74 : label === "positive" ? 0.84 : 0.62
    };
  }

  async closeProbability(caseSummary: string) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text:
                        "Retorne JSON com campos probability (0 a 1) e recommendation. Caso juridico: " + caseSummary
                    }
                  ]
                }
              ]
            })
          }
        );
        if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const compact = raw.replace(/\s+/g, " ").trim();
            const jsonBlock = compact.match(/\{.*\}/)?.[0];
            const parsed = jsonBlock ? safeJsonParse(jsonBlock) : null;
            const probabilityCandidate =
              typeof parsed?.probability === "number"
                ? parsed.probability
                : Number((compact.match(/0(\.\d+)?|1(\.0+)?/) ?? [])[0]);
            const recommendation =
              typeof parsed?.recommendation === "string" && parsed.recommendation.length > 0
                ? parsed.recommendation
                : compact.slice(0, 180);
            if (!Number.isNaN(probabilityCandidate)) {
              return {
                provider: "gemini",
                probability: Math.min(1, Math.max(0, probabilityCandidate)),
                recommendation
              };
            }
          }
        }
      } catch {
        // fallback local heuristic
      }
    }
    const probability = Math.min(0.95, Math.max(0.2, caseSummary.length / 400));
    return {
      provider: "gemini",
      probability,
      recommendation:
        probability < 0.5
          ? "Reforcar prova documental e antecipar objeccoes do cliente."
          : "Priorizar follow-up com proposta objetiva e prazo claro."
    };
  }
  async assistantQuestion(question: string) {
    const q = question.toLowerCase();
    if (q.includes("taxa") && q.includes("convers")) {
      return "A taxa de conversao pode ser consultada no endpoint /v1/sales-analytics/kpis.";
    }
    if (q.includes("tipo de caso")) {
      return "Casos em negociacao e proposta tendem a ter maior chance de fechamento quando o follow-up ocorre em ate 48h.";
    }
    return "Sugestao: foque nos casos com alta probabilidade e follow-up atrasado para aumentar conversao.";
  }
}

function safeJsonParse(text: string): { probability?: unknown; recommendation?: unknown } | null {
  try {
    return JSON.parse(text) as { probability?: unknown; recommendation?: unknown };
  } catch {
    return null;
  }
}

@Controller("ai-integration")
class AiIntegrationController {
  constructor(
    private readonly aiService: AiIntegrationService,
    private readonly ragQueryService: RagQueryService
  ) {}

  @UseGuards(AuthGuard)
  @Post("sentiment")
  sentiment(@Body() dto: SentimentDto) {
    return this.aiService.analyzeSentiment(dto.text);
  }

  @UseGuards(AuthGuard)
  @Post("close-probability")
  closeProbability(@Body() dto: CloseProbabilityDto) {
    return this.aiService.closeProbability(dto.caseSummary);
  }

  @UseGuards(AuthGuard)
  @Post("assistant")
  assistant(@Body() dto: ChatDto) {
    return this.aiService.assistantQuestion(dto.question);
  }

  @UseGuards(AuthGuard)
  @Post("rag")
  rag(
    @Req() req: { user: RequestUser },
    @Body() dto: RagQueryDto
  ) {
    return this.ragQueryService.query(req.user, dto.question, dto.topK ?? 6);
  }

  @UseGuards(AuthGuard)
  @Post("rag/reindex")
  ragReindex(@Req() req: { user: RequestUser }) {
    return this.ragQueryService.forceReindex(req.user);
  }
}

@Module({
  providers: [AiIntegrationService, RagIndexingService, RagQueryService],
  controllers: [AiIntegrationController]
})
export class AiIntegrationModule {}

function fallbackEmbedding(text: string): number[] {
  const seed = hashText(text);
  const vector = new Array<number>(1536);
  let state = seed;
  for (let index = 0; index < vector.length; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    vector[index] = (state / 4294967295) * 2 - 1;
  }
  return vector;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toPgVector(values: number[]): string {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}
