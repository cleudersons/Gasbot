# SutoGas — Roadmap unificado

> Documento único de planejamento. Substitui:
> - `sutogas-pos-semana12-planejamento.md` (já aplicado aqui)
> - `sutogas-landing-planejamento.md` (já aplicado aqui)
> - Pendências da seção 18 + faltantes do `sutogas-planejamento-completo.md`
>
> Última atualização: 2026-05-26
> Branch: `master` (deploy automático)
> Migrations rodadas até: **019**

---

## Estado atual

- **Semanas 9–12** do roadmap original: ✅ concluídas
- **Pós-Semana 12 / Item 1 (Backup de prompt)**: ✅ concluído no commit `ffff4a3`
- **1 cliente real em produção**: Depósito de Congas, plano Premium Fundador
- **4 fundadores reais** (de 50 vagas) — `programa_fundador_config.vagas_usadas = 4`

---

## 🚨 BUG PRIORITÁRIO — Compra não ativa plano

**Reportado em 2026-05-30.** Usuário fez uma compra de plano hoje e a conta não
mudou de free/trial pro plano comprado. Cliente paga mas continua sem acesso ao
recurso correspondente.

**Antes de prosseguir pro Item 9** precisamos diagnosticar e corrigir:

1. Verificar se webhook `pagamento_confirmado` chegou (logs Railway backend +
   tabela `integracao_log` no banco Sutofly)
2. Conferir se o `oferta` (slug) do checkout bate com algum slug ativo em
   `planos.slug` (lookup falha → 400 silencioso pro webhook)
3. Conferir se o email da compra existe em `usuarios.email` (caso não, deveria
   criar agência nova; ver `checkout.route.ts:110-150`)
4. Conferir se `agencias.plano` foi de fato atualizado pra `basico` ou `pro`
5. Se trial recente, conferir se `status_conta` foi pra `ativo` (linha 163 do
   webhook)

**Hipóteses iniciais:**
- (H1) Slug da oferta da Sutofly não bate com slug cadastrado em `/master/planos`
- (H2) Usuário já tinha conta trial e o webhook localizou pelo email mas o
  UPDATE falhou silenciosamente
- (H3) Webhook nem chegou (Sutofly não disparou ou rede falhou)

**Garantia obrigatória do fix:** cliente que paga deve receber acesso ao plano
em < 1 minuto, automaticamente, sem intervenção manual.

---

## Ordem priorizada (do mais ao menos urgente)

| # | Item | Urgência | Tamanho | Bloco |
|---|---|---|---|---|
| 0 | **Email com senha após compra externa** (cliente paga e fica sem acesso) | 🔴 Crítico | P (1h) | Bug |
| 1 | **Cadastro: Nome do depósito + Cidade/Estado** | 🔴 Alto | P (30min) | Dados |
| 2 | **Bug do logout** (NEXTAUTH_URL) | 🔴 Alto | P (15min) | Bug |
| 3 | **Onboarding/tutorial pós-cadastro** | 🔴 Alto | M | Retenção |
| 4 | **Vincular form CADASTRO SUTOGAS ao Mailrelay** (manual no painel) | 🔴 Alto | — | Configuração |
| 5 | **Email transacional** (trial vencendo, cobrança falhou) | 🟡 Médio-Alto | M | Retenção |
| 6 | **Landing page (sutogas.com.br/)** | 🟡 Médio-Alto | M-G | Crescimento |
| 7 | **Cobrança/recorrência** (suspensão por vencimento) | 🟡 Médio | M-G | Operação |
| 8 | **Master `/master/agencias`** (CRUD completo) | 🟡 Médio | M | Operação |
| 9 | **Suporte interno** (chat/ticket) | 🟡 Médio | M-G | Operação |
| 10 | **API pública / Zapier** | 🟢 Baixo | G | Crescimento |
| 11 | **Multi-número WhatsApp Pro** | ⏸️ Paused | G | Só sob demanda |
| 12 | **Performance / fluidez** | 🟡 Em andamento | P-M | Experiência |

---

## Item 0 — Email com senha após compra externa 🔴

### Problema
Em [backend/src/routes/checkout.route.ts:84-124](backend/src/routes/checkout.route.ts#L84-L124), quando alguém compra direto pelo link da Sutofly **sem ter conta prévia**:
- Backend cria agência + usuário com `senhaTemp = Math.random()...`
- A senha vai na resposta JSON (`senha_temporaria: senhaTemp`)
- **Mas ninguém envia essa senha pro cliente.** Ele paga e não tem como entrar.

### Solução
Depende da decisão sobre email transacional (item 5). Duas opções:

**Opção A (rápida — recomendada)**: o `sutogas_webhook.php` da Sutofly que chama nosso `/webhook/checkout` lê a resposta, pega `senha_temporaria` e dispara email pelo próprio sistema da Sutofly (que já está integrado). Tarefa de **integração no PHP**, não no SutoGas. **Confirmar com time Sutofly.**

**Opção B**: SutoGas dispara email direto (precisa setup de Resend/SES ou endpoint da Sutofly). Pode ser feito em paralelo com o item 5.

### Definição de pronto
- Cliente que compra pelo link externo recebe email com: link de acesso, email cadastrado, senha temporária, CTA "Trocar minha senha".

---

## Item 1 — Cadastro: campos faltantes 🔴

### Problema
[Seção 13 do `sutogas-planejamento-completo.md`](sutogas-planejamento-completo.md) prevê 6 campos no cadastro; hoje só tem 5 em [frontend/src/app/cadastro/page.tsx](frontend/src/app/cadastro/page.tsx).

**Faltam:**
- ❌ Nome do depósito
- ❌ Cidade / Estado

### Solução
- Adicionar 2 inputs no formulário de cadastro.
- Migration (se necessário) — provavelmente `agencias.nome` já existe; adicionar `cidade TEXT`, `estado TEXT` (ou `cidade_estado TEXT` único).
- Atualizar API `/api/cadastro` para persistir os novos campos.
- Atualizar `registrarNoMailrelay` para enviar também a cidade (segmentação útil pra campanhas regionais).

---

## Item 2 — Bug do logout 🔴

### Problema
[Seção 9.1 do landing planning](sutogas-landing-planejamento.md): logout redireciona para a URL interna do Railway em vez de `https://sutogas.com.br/login`.

Hoje os 2 `signOut()` ([dashboard/layout.tsx:109](frontend/src/app/dashboard/layout.tsx#L109) e [master/layout.tsx:30](frontend/src/app/master/layout.tsx#L30)) usam `redirectTo: '/login'` (caminho relativo). Deveria funcionar se `NEXTAUTH_URL` está correto.

### Investigação necessária
1. Confirmar `NEXTAUTH_URL=https://sutogas.com.br` no Railway (variável do frontend).
2. Se estiver certo e o bug persistir, mudar pra URL absoluta: `redirectTo: 'https://sutogas.com.br/login'` ou `${process.env.NEXTAUTH_URL}/login`.

---

## Item 3 — Onboarding/tutorial pós-cadastro 🔴

### Problema
Existe `/tutorial` mas não está claro se cobre os 4 passos críticos e se está ligado ao primeiro acesso.

### Auditoria antes de codar
- [ ] Ler [frontend/src/app/tutorial/](frontend/src/app/tutorial/) — entender o que já tem
- [ ] Verificar [dashboard/inicio/page.tsx](frontend/src/app/dashboard/inicio/page.tsx) e `/api/onboarding`

### Os 4 passos críticos
1. **Conectar Z-API ou Meta API** — link pra `/dashboard/conexao` + tooltip do QR Code
2. **Configurar o prompt** — link pra `/dashboard/configuracoes` (aba Agente)
3. **Adicionar pelo menos 1 entregador** — link pra `/dashboard/entregadores`
4. **Fazer um pedido de teste** — instruir o cliente a mandar mensagem (ou usar demo)

### Plano técnico
- Provavelmente sem migration — `agencias` já tem campos suficientes pra derivar progresso
- Modal de boas-vindas no primeiro login (flag `viu_tutorial_inicial BOOLEAN` em `agencias`)
- Checklist persistente já existe em `/inicio` — só melhorar

### Perguntas pendentes ao dono
1. **Vídeo embedado** (YouTube/Vimeo) ou só texto+imagens? Se vídeo, ele grava ou usamos placeholder?
2. Modal de boas-vindas: aparece **uma vez só** (flag) ou **toda vez até completar** os 4 passos?
3. Onboarding **bloqueia acesso** a outras telas até o passo 1 (conexão)? Ou só sugere?

---

## Item 4 — Vincular formulário CADASTRO SUTOGAS ao Mailrelay 🔴

### Problema (configuração — não é código)
[Seção 9.2 do landing planning](sutogas-landing-planejamento.md): o formulário "CADASTRO SUTOGAS" existe na Sutofly com 6 campos e 0 leads, mas:
- ❌ Mailrelay: **Não vinculado**
- ❌ Status: **Desativado**

### O que fazer (manual, no painel Sutofly)
1. Abrir formulário "CADASTRO SUTOGAS" → Editar
2. Vincular ao Mailrelay → selecionar lista "SutoGas Leads" (criar se não existir)
3. Mudar status para **Ativo**
4. Salvar e testar

### Fluxo final
```
Cliente preenche /cadastro no SutoGas
  ↓ Backend cria conta no Supabase
  ↓ POST silencioso para form_submit.php (form_id=6)
  ↓ Sutofly processa → Mailrelay adiciona contato
  ↓ Mailrelay dispara régua de boas-vindas
```

---

## Item 5 — Email transacional 🟡

### Problema
Hoje a SutoGas delega 100% dos emails pra Sutofly/Mailrelay. Funciona pra **régua de marketing** (D+1, D+3, etc.), mas eventos transacionais que dependem de **dados internos do SutoGas** ainda não disparam email.

### Eventos que precisam de email backend-disparado

| Evento | Quando | Hoje |
|---|---|---|
| Trial vence em 2 dias | Job diário | Coberto pela régua Mailrelay D+5 ✅ |
| Trial vencido | Job diário | Coberto pela régua Mailrelay D+7 ✅ |
| Cobrança recorrente falhou | Webhook Asaas | ❌ Falta |
| Senha após compra externa | `/webhook/checkout` | ❌ Falta (Item 0) |
| Renovação confirmada | `/webhook/checkout` | ❌ Falta |
| Notificação D+2 fundador | Job já existente | Só sininho hoje, falta email |

### Decisão arquitetural pendente
- **Opção A — Endpoint na Sutofly**: backend SutoGas chama `https://pay.sutofly.com/email_dispatch.php` (existe?) com `{ tipo, email, vars }`. Sutofly cuida do template. **Mais simples**, depende de confirmação com Sutofly.
- **Opção B — SutoGas dispara direto**: setup Resend ou AWS SES. Independência total, mais flexível. Mais setup.

### Recomendação
**Opção A** se Sutofly suportar. **Opção B com Resend** se não.

### Perguntas ao dono antes de começar
1. **Opção A ou B?**
2. Templates — quem cria? Sutofly tem editor ou precisa HTML?

---

## Item 6 — Landing page 🟡

### Estado atual
[frontend/src/app/page.tsx](frontend/src/app/page.tsx) é uma placeholder simples (logo + "Login" + "Cadastro"). Toda a estrutura de marketing está no [sutogas-landing-planejamento.md](sutogas-landing-planejamento.md) mas **nada foi codado**.

### Plano técnico
Substituir `page.tsx` por uma landing completa.

### Estrutura de componentes
```
frontend/src/components/landing/
├── Hero.tsx              ← seção principal com formulário inline
├── Agitacao.tsx          ← cards de dores
├── Solucao.tsx           ← como funciona (3 passos)
├── Features.tsx          ← grid de funcionalidades
├── PreditivaDestaque.tsx ← bloco especial inteligência preditiva
├── ProvasSocial.tsx      ← depoimentos (placeholder)
├── FAQ.tsx               ← perguntas frequentes
└── CTAFinal.tsx          ← fechamento com formulário
```

### Conteúdo (já 100% escrito no landing planning)
Headlines, subheadlines, cards de agitação, FAQ, copy completa estão na **Seção 7 do landing planning** — só transpor pro JSX.

### Decisões já tomadas
- **Não mencionar preços** na landing — foco em "Testar grátis 7 dias"
- **Headline**: dono vai escolher entre as 3 opções (dor, desejo, transformação)
- **Mobile first** — maioria acessa por celular
- **Paleta**: `#F5721B` laranja fogo + `#1A1A2E` azul noite + `#F8F5F0` creme
- **Formulário do Hero**: Opção A do landing planning (POST direto pra `/api/cadastro` com senha temporária, redireciona pro dashboard) — **melhor conversão**

### Pré-requisitos antes de codar
- [ ] Item 4 (Mailrelay vinculado) pra leads não se perderem
- [ ] Item 1 (cadastro com cidade/estado) — landing também precisa coletar
- [ ] Item 2 (logout) — pra evitar bug aparecer em quem acabou de cadastrar
- [ ] Confirmar com o dono qual headline (A, B ou C)
- [ ] Coletar depoimentos reais — ou seguir com placeholder

### SEO básico
```typescript
export const metadata = {
  title: 'SutoGas — Seu depósito no piloto automático',
  description: 'IA que atende clientes no WhatsApp, organiza entregas e traz clientes de volta automaticamente. Teste grátis por 7 dias.',
  keywords: 'depósito de gás, atendimento WhatsApp, automação, IA, pedidos automáticos',
}
```

### Métricas de sucesso (do landing planning)
| Métrica | Meta mês 1 | Ferramenta |
|---|---|---|
| Visitantes únicos | 500 | Google Analytics |
| Taxa de conversão | 15% | Analytics |
| Leads capturados | 75 | Mailrelay |
| Contas criadas | 50 | Supabase |
| Trial → pago | 20% | Master |

---

## Item 7 — Cobrança/recorrência 🟡

### Problema
Quando `vencimento_plano < hoje` ou cobrança Asaas falha, **nada acontece** no SutoGas. A agência continua atendendo normalmente sem ter pago.

### Plano técnico
- **Migration**: adicionar status `inadimplente` e `suspenso` no enum/check de `agencias.status_conta`
- **Webhook de falha** da Sutofly (`pagamento_falhou`) — atualiza `status_conta = 'inadimplente'` + email (Item 5)
- **Job diário `verificar-vencimento.job.ts`**:
  - Agências com `vencimento_plano + 3 dias < hoje` E status ≠ `cancelado` → suspende
  - `status_conta = 'suspenso'`, `agente_ativo = false`
  - Email + notificação no sininho
- **Banner vermelho** em `/dashboard/minha-conta` se suspenso
- **Backend webhook do WhatsApp**: ignorar mensagens de agências suspensas (já filtra `agente_ativo = false`)

---

## Item 8 — Master `/master/agencias` (CRUD completo) 🟡

### Problema
Hoje tem `/master` e `/master/metricas`, mas não uma página dedicada de gestão de agências.

### Plano técnico
Página `/master/agencias`:
- Tabela: nome, email do dono, whatsapp_dono, plano, status_conta, vencimento, criada_em, ações
- Filtros: status (trial/ativo/inadimplente/suspenso/cancelado), plano, fundador sim/não
- Busca por nome ou email
- Export CSV
- Drawer/modal de detalhe ao clicar:
  - Dados completos
  - "Resetar trial" (zera `trial_inicio` e `trial_atendimentos`)
  - "Suspender / Reativar conta"
  - "Marcar como fundador" (atalho pro que hoje é feito por SQL manual)
  - Histórico de pagamentos (Asaas)

### Migration possível
Auditar se `agencias` tem `nome_dono` e `email_dono` salvos. Se não, adicionar e popular no cadastro.

---

## Item 9 — Suporte interno (chat/ticket) 🟡

### MVP
- **Tabela `tickets`**: `id, agencia_id, autor (cliente|master), assunto, status, prioridade, timestamps`
- **Tabela `ticket_mensagens`**: `id, ticket_id, autor, mensagem, anexos_urls, criado_em`
- **Cliente**: `/dashboard/suporte` — lista + "Novo ticket"
- **Master**: `/master/suporte` — lista filtrável
- Notificação no sininho quando master responde

### V2 (depois)
- Anexos (upload Supabase Storage)
- Categorias (técnico/financeiro/dúvida)
- SLA com email pro master

---

## Item 10 — API pública / Zapier 🟢

### Plano (alta complexidade — sprint dedicada)
- Tabela `api_keys`: `id, agencia_id, key_hash, nome, criada_em, ultima_uso, revogada_em`
- Página `/dashboard/api` — gera/revoga keys + docs
- Endpoints REST `/api/public/v1/`:
  - `GET /pedidos` (lista paginada)
  - `GET /pedidos/:id`
  - `POST /pedidos` (criar pedido externo)
  - `GET /entregadores`, `GET /clientes`
  - Webhook outbound configurável (eventos: pedido_criado, status_mudou, etc.)
- Rate limit por API key
- Docs em Markdown ou Swagger

---

## Item 11 — Multi-número WhatsApp no Pro ⏸️

**Pausado** até alguém pedir. Plano (se virar prioridade):
- Tabela `numeros_whatsapp (id, agencia_id, instance_id, token, nome, ativo)`
- Roteamento: webhook resolve por `instance_id` → carrega agência
- Prompt continua **único por agência** (decidido)
- Painel `/dashboard/conexao` lista até 3 números no Pro
- Enforcement: básico (1) e Pro (3)

---

## Item 12 — Performance / fluidez 🟡

### Diagnóstico (do código existente)
- Layout do dashboard re-renderiza dados a cada navegação (já está em `Promise.all`)
- Sem `loading.tsx`/skeletons → tela parece travada enquanto a página carrega
- Listas grandes (pedidos/clientes) ainda sem paginação — vai pesar com crescimento
- Possível distância geográfica do Supabase (verificar região)

### Plano em 3 ondas

#### 🟢 Onda 1 — Wins rápidos (✅ já feito no commit que adicionou esta seção)
- [x] Componente `PageSkeleton` genérico
- [x] `loading.tsx` em `app/dashboard/` e `app/master/` (cobre todas as subrotas)
- [x] Confirmado: layout usa `Promise.all` e Links da sidebar têm prefetch padrão do Next

#### 🟡 Onda 2 — Verificações sem código
- [ ] Confirmar região do Supabase em **Settings → General**. Se for US, considerar migrar para `sa-east-1` (delicado — só vale se confirmado RTT alto)
- [ ] Olhar **Database → Query Performance** no dashboard Supabase pra ver queries reais lentas
- [ ] Adicionar índices nas colunas mais usadas em filtros (já temos os críticos)

#### 🟡 Onda 3 — Paginação e índices (junto com items 8 e 10)
- [ ] Paginar listas (pedidos, clientes, notificações master) — 20 itens por página com "carregar mais" ou cursor
- [ ] Trocar `count: 'exact'` por `count: 'estimated'` em badges/totais grandes
- [ ] Streaming com `Suspense` em páginas pesadas (cards aparecem conforme ficam prontos)

### Vai escalar?
Hoje a lentidão é arquitetural (não cresce com volume). Mas se não atacar paginação/índices, **com 1.000+ clientes vai piorar feio**. Onda 3 deve sair junto com os items 8 (Master /agencias) e 10 (API pública), que já vão tocar essas áreas.

---

## Anexos — Configurações externas (não-código)

### A. Régua de emails Mailrelay (configurar na Sutofly)

| Trigger | E-mail | Objetivo | Status |
|---------|--------|----------|--------|
| Cadastro | Boas-vindas + tutorial | Ativação | ⏳ Confirmar |
| D+1 | "Conecte seu WhatsApp" | Onboarding | ⏳ Confirmar |
| D+3 | "Seu primeiro pedido chegou?" | Engajamento | ⏳ Confirmar |
| D+5 | "Seu trial acaba em 2 dias" | Conversão | ⏳ Confirmar |
| D+7 | "Trial encerrado — escolha seu plano" | Conversão | ⏳ Confirmar |
| Compra | Confirmação + próximos passos | Retenção | ⏳ Confirmar |
| D+30 | "Como está indo?" | Feedback | ⏳ Confirmar |
| Fundador D+2 | Lembrete de indicação | Indicação | ⏳ Confirmar |

> **SutoGas só envia o contato** via `form_submit.php` (form_id=6). Todas as regras de email são responsabilidade da Sutofly/Mailrelay.

### B. Arquivos PHP do lado Sutofly

Estes arquivos vivem no repositório Sutofly (PHP), não no SutoGas. **Verificar com time Sutofly se existem:**

- ✅ Criar `checkout-sutofly/sutogas_webhook.php` — notifica SutoGas após pagamento
- ⚠️ Modificar `checkout-sutofly/webhook_asaas.php` — adicionar bloco para produtos SutoGas no final
- 🚫 **NUNCA tocar**: `checkout.php`, `email_service.php`, `asaas/`, `config.php`, `cron_carrinho_abandonado.php`

> A Sutofly tem produtos ATIVOS em produção. Qualquer modificação errada derruba o sistema inteiro.

---

## Decisões já tomadas (não revisar)

- **Email D+2 fundador**: backend só cria sininho — email é responsabilidade da Sutofly/Mailrelay
- **Limite de versões de prompt**: 5 (com possibilidade de apagar manualmente)
- **Vídeo de depoimento fundador**: WhatsApp da env `NEXT_PUBLIC_DEMO_WHATSAPP` (mesmo número da demo: +55 34 9 8225-2600)
- **Multi-número no Pro**: mesmo agente, mesmo prompt nos 3 números
- **Notificações master**: broadcast por filtro de plano + fundador, expira em 30 dias
- **Realtime do contador de vagas fundador**: precisa de `ALTER PUBLICATION supabase_realtime ADD TABLE programa_fundador_config;` (já rodado)
- **Formulário do Hero da landing**: Opção A (POST direto pra `/api/cadastro`, cria conta com senha temporária)
- **NUNCA mencionar preços na landing** — foco em "Testar grátis 7 dias"

---

## Convenções do projeto

- **Migrations**: `frontend/supabase/migrations/NNN_descricao.sql`. Numerar sequencialmente. Última = `019`.
- **Backend jobs**: `backend/src/jobs/*.job.ts`, importar em `backend/src/index.ts` como side-effect (setInterval interno).
- **APIs Next.js**: `frontend/src/app/api/.../route.ts`. Helpers: `requireAgenciaId`, `requireMaster` em `@/lib/auth-server`.
- **Commits**: estilo `feat(escopo): descrição` ou `fix(escopo): descrição`. Co-Author `Claude Opus 4.7 <noreply@anthropic.com>`.
- **Deploy**: push em `master` → auto-deploy Railway (frontend + backend).
- **Padrão de modais**: componente `@/components/Modal`.
- **Cores principais**: `#F5721B` laranja fogo, `#1A1A2E` azul noite, `#F8F5F0` creme.

---

## Stack técnica (referência rápida)

| Camada | Tecnologia | Status |
|--------|-----------|--------|
| Backend | Node.js + Express + TypeScript (porta 3001) | ✅ Railway |
| Frontend | Next.js 14 App Router + Tailwind | ✅ Railway |
| Banco | Supabase | ✅ |
| WhatsApp | Meta API Oficial + Z-API | ✅ |
| IA | OpenAI GPT-4o-mini | ✅ |
| Checkout | Sutofly (PHP) | ✅ Integrado |
| Email marketing | Mailrelay via Sutofly Form | ⏳ Vincular formulário |
| Pagamento | Asaas (via Sutofly) | ✅ |

### Infra

| Serviço | URL/Detalhe |
|---------|-------------|
| Supabase | hsbrhqftpbzpkwgabqdm.supabase.co |
| GitHub | cleudersons/Gasbot |
| Railway Backend | sutogas-backend-production.up.railway.app |
| Railway Frontend | sutogas.com.br |
| Meta App | GasBot — ID 3108728432671211 |
| Webhook Meta | /webhook verificado e assinado |
| Webhook Z-API | /webhook/zapi |
| Webhook Checkout | /webhook/checkout |

### Credenciais (referência)

| Tipo | Email | Senha |
|------|-------|-------|
| Master | admin@sutogas.com.br | sutogas@master2024 |
| Agência teste | deposito@teste.com.br | deposito@2024 |

**Demo WhatsApp**: 5534982225260 (env `NEXT_PUBLIC_DEMO_WHATSAPP`)
**Cliente real em prod**: Depósito de Congas (ID: 721c2c92-fec4-4e32-b12d-dc8682ec2b9b)

---

## Funcionalidades em produção (referência rápida)

✅ Webhook Meta + Z-API recebe mensagens
✅ Multi-tenancy por phone_number_id e instance_id
✅ Agente GPT-4o-mini com prompt customizável por agência
✅ Token PEDIDO_CONFIRMADO multi-item (com pagamento e valor total)
✅ Salvar pedidos no Supabase
✅ Distribuição de entregadores (4 modos: todos, revezamento, zonas, manual)
✅ Notificar entregadores via WhatsApp
✅ Comandos ACEITO/ENTREGUE pelo WhatsApp
✅ Job 1h → entregue_nao_confirmado
✅ Horário de atendimento + agendamento
✅ Lembretes flexíveis (recorrência por cliente)
✅ Inteligência preditiva de recompra
✅ Relatórios diário/semanal/mensal
✅ Trial 7 dias / 20 atendimentos
✅ Cadastro self-service `/cadastro` + integração Sutofly Form
✅ Dashboard pedidos em tempo real
✅ Configurações com abas + Histórico de prompts (5 versões)
✅ Página de conexão (Z-API + Meta API)
✅ Onboarding básico em `/inicio` (checklist)
✅ Painel Master + Métricas + Planos + Notificações + Fundadores
✅ Página `/dashboard/planos` com fundador toggle
✅ Página `/dashboard/minha-conta` com badge fundador
✅ Página `/dashboard/programa-fundador` (landing da oferta fundador)
✅ Endpoint `/webhook/checkout` (+ criação auto de conta na compra externa)
✅ Campanha Premium Fundador completa (Semana 11)
✅ Pedido ativo + token CONTATAR_ENTREGADOR (Semana 12)
✅ Sininho de notificações + broadcast master por plano/fundador
✅ Formulário de feedback fundador (logado + link público `/f/[token]`)
✅ Job D+2 fundador (cria sininho automático)
✅ Filtro de grupos no webhook (não responde grupos)
✅ Chave PIX no prompt com mensagem separada (fácil copiar)
✅ Marca do gás e taxa de entrega no prompt
✅ Backup/histórico de prompt (5 versões, restaurar/renomear/apagar)
