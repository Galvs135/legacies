export type Kpis = {
  newLeads: number;
  conversionRate: number;
  totalInNegotiation: number;
  wonCases: number;
  lostCases: number;
};

export type FunnelItem = { stage: string; total: number };

export type CaseItem = {
  id: string;
  ownerUserId: string;
  leadName: string;
  clientName: string;
  title: string;
  actionTypeId: string;
  actionTypeName: string;
  actionValue: number;
  stage: string;
  closeProbability: number;
  openedAt: string;
  createdAt: string;
  canDrag?: boolean;
};

export type LeadPayload = {
  name: string;
  email: string;
  source: "website" | "referral" | "social" | "other";
  notes?: string;
};

export type CasePayload = {
  leadName: string;
  clientName: string;
  actionTypeId: string;
  actionValue: number;
  closeProbability: number;
  ownerUserId?: string;
};

export type InteractionKind = "email" | "meeting" | "call" | "note" | "whatsapp";

export type InteractionItem = {
  id: string;
  caseId: string;
  kind: InteractionKind;
  content: string;
  sentiment?: "positive" | "neutral" | "negative";
  createdAt: string;
};

export type AttendancePayload = {
  kind: InteractionKind;
  content: string;
  sentiment?: "positive" | "neutral" | "negative";
};

export type AttendanceView = {
  case: CaseItem;
  client: { name: string };
  interactions: InteractionItem[];
};

export type ActionTypeItem = {
  id: string;
  name: string;
  createdAt: string;
};

export type PipelineStageItem = {
  id: string;
  name: string;
  order: number;
  createdAt: string;
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "advogado";
};

export type ConversationItem = {
  id: string;
  caseId: string;
  clientName: string;
  status: "open" | "closed";
  lastMessageAt?: string;
};

export type ConversationMessageItem = {
  id: string;
  conversationId: string;
  from: "cliente" | "advogado";
  content: string;
  sentAt: string;
};

export type AssistantCitation = {
  sourceType: string;
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
  caseId?: string;
};

export type AssistantRagResponse = {
  answer: string;
  citations: AssistantCitation[];
};
