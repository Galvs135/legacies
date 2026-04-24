import { Injectable } from "@nestjs/common";

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

@Injectable()
export class DataStoreService {
  users: AppUser[] = [
    { id: "u-admin", email: "admin@legalytics.local", name: "Admin", role: "admin" },
    { id: "u-adv-1", email: "adv1@legalytics.local", name: "Advogado 1", role: "advogado" }
  ];

  leads: Lead[] = [];
  cases: LegalCase[] = [];
  interactions: Interaction[] = [];
  actionTypes: ActionType[] = [];
  pipelineStages: StageConfig[] = [];
  conversations: Conversation[] = [];
  conversationMessages: ConversationMessage[] = [];

  seedIfNeeded() {
    if (this.cases.length > 0 && this.pipelineStages.length > 0 && this.actionTypes.length > 0) {
      return;
    }
    const now = new Date().toISOString();
    if (this.pipelineStages.length === 0) {
      this.pipelineStages.push(
        { id: crypto.randomUUID(), name: "prospeccao", order: 1, createdAt: now },
        { id: crypto.randomUUID(), name: "qualificacao", order: 2, createdAt: now },
        { id: crypto.randomUUID(), name: "proposta", order: 3, createdAt: now },
        { id: crypto.randomUUID(), name: "negociacao", order: 4, createdAt: now },
        { id: crypto.randomUUID(), name: "fechado", order: 5, createdAt: now }
      );
    }
    if (this.actionTypes.length === 0) {
      this.actionTypes.push(
        { id: crypto.randomUUID(), name: "Trabalhista", createdAt: now },
        { id: crypto.randomUUID(), name: "Civel", createdAt: now },
        { id: crypto.randomUUID(), name: "Consumidor", createdAt: now }
      );
    }
    const defaultActionType = this.actionTypes[0];
    this.cases.push(
      {
        id: crypto.randomUUID(),
        ownerUserId: "u-adv-1",
        leadName: "ACME Ltda",
        clientName: "ACME Ltda",
        title: "Revisao contratual trabalhista",
        stage: "negociacao",
        actionTypeId: defaultActionType.id,
        actionTypeName: defaultActionType.name,
        actionValue: 35000,
        closeProbability: 0.68,
        openedAt: now,
        createdAt: now
      },
      {
        id: crypto.randomUUID(),
        ownerUserId: "u-adv-1",
        leadName: "Joao Silva",
        clientName: "Joao Silva",
        title: "Acao de indenizacao",
        stage: "proposta",
        actionTypeId: defaultActionType.id,
        actionTypeName: defaultActionType.name,
        actionValue: 18000,
        closeProbability: 0.52,
        openedAt: now,
        createdAt: now
      }
    );

    if (this.conversations.length === 0) {
      const firstCase = this.cases[0];
      this.conversations.push({
        id: crypto.randomUUID(),
        caseId: firstCase.id,
        clientName: firstCase.clientName,
        status: "open"
      });
      const conv = this.conversations[0];
      this.conversationMessages.push(
        {
          id: crypto.randomUUID(),
          conversationId: conv.id,
          from: "cliente",
          content: "Doutor, estou em duvida se seguimos com o processo.",
          sentAt: now
        },
        {
          id: crypto.randomUUID(),
          conversationId: conv.id,
          from: "advogado",
          content: "Vamos avaliar os riscos e definir o melhor passo.",
          sentAt: now
        }
      );
    }
  }
}
