export type UserRole = "admin" | "advogado";
export type PipelineStage = string;

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type Lead = {
  id: string;
  ownerUserId: string;
  name: string;
  email: string;
  source: string;
  notes?: string;
  stage: PipelineStage;
  createdAt: string;
};

export type LegalCase = {
  id: string;
  ownerUserId: string;
  leadName: string;
  clientName: string;
  title: string;
  stage: PipelineStage;
  actionTypeId: string;
  actionTypeName: string;
  actionValue: number;
  closeProbability: number;
  openedAt: string;
  createdAt: string;
};

export type Interaction = {
  id: string;
  caseId: string;
  kind: "email" | "meeting" | "call" | "note" | "whatsapp";
  content: string;
  sentiment?: "positive" | "neutral" | "negative";
  createdAt: string;
};

export type ActionType = {
  id: string;
  name: string;
  createdAt: string;
};

export type StageConfig = {
  id: string;
  name: string;
  order: number;
  createdAt: string;
};

export type Conversation = {
  id: string;
  caseId: string;
  clientName: string;
  status: "open" | "closed";
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  from: "cliente" | "advogado";
  content: string;
  sentAt: string;
};
