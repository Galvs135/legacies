# Legalytics - CRM e Analise de Vendas para Advocacia

Implementacao funcional do projeto descrito em `prompt_projeto_advocacia.md` com:

- Backend em NestJS (arquitetura modular)
- Frontend em React + TypeScript (Vite)
- Modelagem SQL para Supabase/PostgreSQL com RLS
- Integracoes de IA (Hugging Face + Gemini) via servicos
- Estrutura para notificacoes, WebSocket, cron e analiticos

## Estrutura

- `backend`: API NestJS
- `frontend`: aplicacao React
- `supabase/migrations`: schema inicial e politicas RLS

## Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

Variaveis de ambiente esperadas:

- `PORT` (default: 3000)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `HUGGING_FACE_API_KEY`
- `GEMINI_API_KEY`

Endpoints principais:

- `GET /v1/health`
- `GET /v1/auth/me`
- `GET /v1/sales-analytics/kpis`
- `GET /v1/sales-analytics/funnel`
- `GET /v1/sales-analytics/lawyer-performance`
- `GET /v1/sales-analytics/reports/export?format=csv|pdf`
- `POST /v1/ai-integration/sentiment`
- `POST /v1/ai-integration/close-probability`
- `POST /v1/ai-integration/assistant`
- `POST /v1/crm/leads`
- `POST /v1/crm/cases`
- `GET /v1/crm/cases`
- `PATCH /v1/crm/cases/:id/stage`
- `GET /v1/crm/pipeline`

Documentacao Swagger em:

- `http://localhost:3000/docs`

## Autenticacao

- Em producao: enviar `Authorization: Bearer <supabase_access_token>`.
- Em desenvolvimento rapido: enviar headers `x-user-id` e `x-user-role` (`admin` ou `advogado`).

## Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

Variavel esperada:

- `VITE_API_BASE_URL` (default: `http://localhost:3000/v1`)

## Supabase

Execute a migration:

`supabase/migrations/001_legalytics_init.sql`

Ela cria as tabelas:

- `users`
- `clients`
- `leads`
- `cases`
- `interactions`
- `documents`

E politicas RLS iniciais.

## Proximos passos recomendados

1. Persistir CRM e analiticos diretamente no banco Supabase (hoje o runtime usa store em memoria).
2. Adicionar envio real de email (SendGrid/Supabase) no modulo de notificacoes.
3. Incluir autentificacao frontend (login/logout) e rotas protegidas com token.
4. Adicionar testes e2e (pipeline + IA + CRM + exportacao).
