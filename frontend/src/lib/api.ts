import {
  ActionTypeItem,
  AssistantRagResponse,
  AttendancePayload,
  AttendanceView,
  CaseItem,
  CasePayload,
  ConversationItem,
  ConversationMessageItem,
  FunnelItem,
  InteractionItem,
  Kpis,
  LeadPayload,
  PipelineStageItem,
  UserItem
} from "./types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/v1";

async function requestPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Erro ${response.status} em ${path}${body ? `: ${body}` : ""}`);
  }
  return (await response.json()) as T;
}

function getAuthHeaders(): Record<string, string> {
  const accessToken = localStorage.getItem("legalytics-access-token")?.trim();
  if (!accessToken) {
    throw new Error("Sessao nao autenticada. Faca login novamente.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Erro ${response.status} em ${path}${body ? `: ${body}` : ""}`);
  }
  return (await response.json()) as T;
}

async function requestText(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Erro ${response.status} em ${path}${body ? `: ${body}` : ""}`);
  }
  return await response.text();
}

export const api = {
  login: (email: string, password: string) =>
    requestPublic<{ accessToken: string; user: UserItem }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  getKpis: () => request<Kpis>("/sales-analytics/kpis"),
  getFunnel: () => request<FunnelItem[]>("/sales-analytics/funnel"),
  getLawyerPerformance: () => request<Array<{ ownerUserId: string; cases: number; revenue: number }>>("/sales-analytics/lawyer-performance"),
  getCases: () => request<CaseItem[]>("/crm/cases"),
  getCaseById: (caseId: string) => request<CaseItem | null>(`/crm/cases/${caseId}`),
  getCaseAttendance: (caseId: string) => request<AttendanceView | null>(`/crm/cases/${caseId}/atendimento`),
  getCaseInteractions: (caseId: string) => request<InteractionItem[]>(`/crm/cases/${caseId}/interactions`),
  addCaseInteraction: (caseId: string, payload: AttendancePayload) =>
    request<InteractionItem>(`/crm/cases/${caseId}/interactions`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getPipeline: () => request<FunnelItem[]>("/crm/pipeline"),
  getLeads: () =>
    request<Array<{ id: string; ownerUserId: string; source: string; name: string; email: string; notes?: string; createdAt: string }>>(
      "/crm/leads"
    ),
  getCrmActionTypes: () => request<ActionTypeItem[]>("/crm/action-types"),
  getCrmPipelineStages: () => request<PipelineStageItem[]>("/crm/pipeline-stages"),
  createLead: (payload: LeadPayload) =>
    request("/crm/leads", { method: "POST", body: JSON.stringify(payload) }),
  createCase: (payload: CasePayload) =>
    request<CaseItem>("/crm/cases", { method: "POST", body: JSON.stringify(payload) }),
  moveCaseStage: (caseId: string, stage: string) =>
    request(`/crm/cases/${caseId}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) }),
  updateCaseProbability: (caseId: string, closeProbability: number) =>
    request<{ found: boolean; case?: CaseItem }>(`/crm/cases/${caseId}/probability`, {
      method: "PATCH",
      body: JSON.stringify({ closeProbability })
    }),
  getSettingsMe: () => request<UserItem>("/settings/me"),
  updateSettingsMe: (payload: Partial<Pick<UserItem, "name" | "email">>) =>
    request<UserItem>("/settings/me", { method: "PATCH", body: JSON.stringify(payload) }),
  getUsers: () => request<UserItem[]>("/settings/users"),
  createUser: (payload: Pick<UserItem, "name" | "email" | "role"> & { password: string }) =>
    request<UserItem>("/settings/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: Partial<Pick<UserItem, "name" | "email" | "role">> & { password?: string }) =>
    request<UserItem | null>(`/settings/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getActionTypes: () => request<ActionTypeItem[]>("/settings/action-types"),
  createActionType: (name: string) =>
    request<ActionTypeItem>("/settings/action-types", { method: "POST", body: JSON.stringify({ name }) }),
  updateActionType: (id: string, name: string) =>
    request<ActionTypeItem | null>(`/settings/action-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    }),
  deleteActionType: (id: string) => request<{ success: boolean }>(`/settings/action-types/${id}/delete`, { method: "PATCH" }),
  getPipelineStages: () => request<PipelineStageItem[]>("/settings/pipeline-stages"),
  createPipelineStage: (payload: { name: string; order: number }) =>
    request<PipelineStageItem>("/settings/pipeline-stages", { method: "POST", body: JSON.stringify(payload) }),
  updatePipelineStage: (id: string, payload: { name?: string; order?: number }) =>
    request<PipelineStageItem | null>(`/settings/pipeline-stages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deletePipelineStage: (id: string) =>
    request<{ success: boolean }>(`/settings/pipeline-stages/${id}/delete`, { method: "PATCH" }),
  getWhatsappConversations: () => request<ConversationItem[]>("/whatsapp/conversations"),
  getWhatsappMessages: (conversationId: string) =>
    request<ConversationMessageItem[]>(`/whatsapp/conversations/${conversationId}/messages`),
  sendWhatsappMessage: (conversationId: string, content: string) =>
    request<ConversationMessageItem | null>(`/whatsapp/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content })
    }),
  askAssistant: (question: string) =>
    requestText("/ai-integration/assistant", { method: "POST", body: JSON.stringify({ question }) }),
  askAssistantRag: (question: string, topK = 6) =>
    request<AssistantRagResponse>("/ai-integration/rag", {
      method: "POST",
      body: JSON.stringify({ question, topK })
    }),
  reindexRag: () =>
    request<{ sources: number; chunks: number }>("/ai-integration/rag/reindex", {
      method: "POST",
      body: JSON.stringify({})
    }),
  analyzeSentiment: (text: string) =>
    request<{ provider: string; label: string; score: number }>("/ai-integration/sentiment", {
      method: "POST",
      body: JSON.stringify({ text })
    }),
  async exportReport(format: "csv" | "pdf") {
    const response = await fetch(`${apiBase}/sales-analytics/reports/export?format=${format}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error("Falha ao exportar relatorio.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "csv" ? "relatorio-legalytics.csv" : "relatorio-legalytics.pdf";
    link.click();
    URL.revokeObjectURL(url);
  },
  saveProfile(userId: string, role: "admin" | "advogado") {
    localStorage.setItem("legalytics-user-id", userId);
    localStorage.setItem("legalytics-user-role", role);
  },
  getProfile() {
    const storedUserId = localStorage.getItem("legalytics-user-id")?.trim();
    const storedRole = localStorage.getItem("legalytics-user-role")?.trim();
    return {
      userId: storedUserId && storedUserId.length > 0 ? storedUserId : "u-adv-1",
      role: (storedRole === "admin" ? "admin" : "advogado") as "admin" | "advogado"
    };
  },
  clearSession() {
    localStorage.removeItem("legalytics-access-token");
    localStorage.removeItem("legalytics-user-id");
    localStorage.removeItem("legalytics-user-role");
  }
};
