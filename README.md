# GasBot SaaS

Plataforma SaaS de automação via WhatsApp (Meta Cloud API) para distribuidoras de gás, com IA (OpenAI) e backend Supabase.

## Stack

- **Backend:** Node.js + Express + TypeScript
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Banco/Auth:** Supabase
- **IA:** OpenAI
- **Mensageria:** Meta WhatsApp Cloud API
- **Deploy backend:** Railway

## Estrutura do monorepo

```
progeto Gas/
├── backend/          # API Express + TS
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
├── frontend/         # Next.js + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── dashboard/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/globals.css
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── railway.toml
├── package.json      # workspaces
└── README.md
```

## Setup local

### 1. Pré-requisitos
- Node.js >= 20
- npm >= 10

### 2. Instalar dependências (na raiz)
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example backend/.env
```
Edite `backend/.env` com suas chaves reais (Supabase, OpenAI, Meta, etc.).

### 4. Rodar o backend
```bash
npm run dev:backend
```
Backend disponível em http://localhost:3001
- `GET /health` → status
- `GET /webhook` → verificação Meta
- `POST /webhook` → recepção de mensagens

### 5. Rodar o frontend
```bash
npm run dev:frontend
```
Frontend disponível em http://localhost:3000 (página de login em `/login`).

## Build de produção

```bash
npm run build:backend
npm run build:frontend
```

## Deploy

- **Backend:** Railway lê `railway.toml` (build + start + healthcheck em `/health`).
- **Frontend:** recomendado Vercel.

## Webhook do Meta

Para validar o webhook na plataforma Meta:
- URL: `https://<seu-dominio>/webhook`
- Verify token: valor de `META_VERIFY_TOKEN` no `.env`
