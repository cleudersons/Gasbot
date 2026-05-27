# 📋 Planejamento — Evolution API + SutoGas
> Documento de referência para Claude Code.
> Consultar antes de qualquer implementação.
> Última atualização: 26/05/2026

---

## 1. VISÃO GERAL

Integrar a **Evolution API** (self-hosted) como provider de WhatsApp no SutoGas,
substituindo/complementando a Z-API e Meta API já existentes.

Cada agência (depósito de gás) terá sua própria instância na Evolution API.
O SutoGas gerencia o ciclo de vida das instâncias: criação, QR code, reconexão e exclusão.

---

## 2. INFRAESTRUTURA DO SERVIDOR

### Servidor atual (Hostinger VPS)
```
Host:      srv1066461.hstgr.cloud
IP:        31.97.92.151
OS:        Ubuntu 24.04
Painel:    EasyPanel (+ Coolify)
Uptime:    124 dias
```

### Recursos após upgrade (KVM 2)
| Recurso | Antes | Depois upgrade |
|---------|-------|----------------|
| CPU | 1 core | 2 cores |
| RAM | 4 GB | 8 GB |
| Disco | 50 GB | 100 GB |
| Banda | 4 TB/mês | 4 TB/mês |

### Capacidade estimada
```
RAM livre após upgrade: ~5 GB
Consumo por instância Evolution: ~120 MB
Instâncias suportadas: ~40 simultâneas confortável / 50 no limite
Meta inicial: 50 instâncias
```

### Serviços rodando no servidor
| Serviço | Status | Função |
|---------|--------|--------|
| evolution-api | ✅ Running | WhatsApp multi-instância |
| evolution-api-db | ✅ Running | Banco da Evolution |
| evolution-api-redis | ✅ Running | Cache/filas |
| n8n | ✅ Running | Automações |

---

## 3. EVOLUTION API — REFERÊNCIA TÉCNICA

### URLs e autenticação
```
URL Base:    https://evolution.envizap.com
Manager:     https://evolution.envizap.com/manager/
API Key:     Coolify → evolution-api → Ambiente → AUTHENTICATION_API_KEY
Versão:      v2.3.0
```

### Header obrigatório em todas as requisições
```
apikey: [AUTHENTICATION_API_KEY]
Content-Type: application/json
```

### Endpoints principais
```
POST   /instance/create                    → criar instância
GET    /instance/connect/{instance}        → gerar QR code
GET    /instance/connectionState/{instance}→ checar status
DELETE /instance/delete/{instance}         → deletar instância
POST   /webhook/set/{instance}             → configurar webhook
POST   /message/sendText/{instance}        → enviar mensagem de texto
POST   /message/sendMedia/{instance}       → enviar mídia
GET    /instance/fetchInstances            → listar todas instâncias
```

### Status possíveis de uma instância
```typescript
type EvolutionStatus =
  | 'open'        // conectado ✅
  | 'connecting'  // aguardando QR scan ⏳
  | 'close'       // desconectado ❌
  | 'refused'     // rejeitado pelo WhatsApp ⛔
```

### Payload criar instância
```json
POST /instance/create
{
  "instanceName": "sutogas-{agencia_id}",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS",
  "webhook": {
    "url": "https://sutogas-backend-production.up.railway.app/webhook/evolution",
    "byEvents": true,
    "base64": false,
    "events": [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE",
      "QRCODE_UPDATED"
    ]
  }
}
```

### Payload enviar mensagem
```json
POST /message/sendText/{instanceName}
{
  "number": "5534999999999",
  "text": "Olá! Como posso ajudar?"
}
```

### Webhook events recebidos pelo SutoGas
```typescript
// Mensagem recebida
{
  event: "MESSAGES_UPSERT",
  instance: "sutogas-{agencia_id}",
  data: {
    key: { remoteJid: "5534999999999@s.whatsapp.net", fromMe: false },
    message: { conversation: "quero um botijão" },
    messageType: "conversation"
  }
}

// Status da conexão mudou
{
  event: "CONNECTION_UPDATE",
  instance: "sutogas-{agencia_id}",
  data: { state: "open" | "close" | "connecting" }
}

// QR Code atualizado
{
  event: "QRCODE_UPDATED",
  instance: "sutogas-{agencia_id}",
  data: { qrcode: { base64: "data:image/png;base64,..." } }
}
```

---

## 4. CREDENCIAIS NECESSÁRIAS (onde encontrar)

```
┌─────────────────────────────────────────────────────────┐
│ CREDENCIAL              │ ONDE ENCONTRAR                 │
├─────────────────────────┼────────────────────────────────┤
│ EVOLUTION_API_URL       │ https://evolution.envizap.com  │
│ EVOLUTION_API_KEY       │ Coolify → evolution-api        │
│                         │ → Ambiente → AUTHENTICATION_   │
│                         │   API_KEY                      │
├─────────────────────────┼────────────────────────────────┤
│ EVOLUTION_WEBHOOK_TOKEN │ Criar um token secreto para    │
│                         │ validar webhooks recebidos     │
│                         │ Ex: evolution-secret-2024      │
├─────────────────────────┼────────────────────────────────┤
│ SSH acesso              │ ssh root@31.97.92.151          │
│                         │ Hostinger → Terminal           │
└─────────────────────────┴────────────────────────────────┘
```

---

## 5. NOMECLATURA DAS INSTÂNCIAS

Padrão obrigatório para identificar instâncias do SutoGas:
```
sutogas-{agencia_id_curto}

Exemplo:
agencia_id: d964cfc4-8590-4417-9a35-445b841d67c7
instanceName: sutogas-d964cfc4
```

Usar apenas os primeiros 8 caracteres do UUID para manter nome curto.

---

## 6. ARQUITETURA DA INTEGRAÇÃO

```
[Cliente WhatsApp]
      ↓ mensagem
[Evolution API — evolution.envizap.com]
      ↓ webhook POST
[SutoGas Backend — /webhook/evolution]
      ↓ identifica agência pelo instanceName
[ai.service.ts — processa com GPT-4o-mini]
      ↓ resposta gerada
[Evolution API — POST /message/sendText/{instance}]
      ↓ entrega
[Cliente WhatsApp]
```

---

## 7. PROVIDER EVOLUTION NO SUTOGAS BACKEND

### Novo arquivo a criar
`backend/src/services/whatsapp/providers/evolution.provider.ts`

```typescript
import fetch from 'node-fetch'

const EVOLUTION_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!

const headers = {
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_KEY,
}

export async function criarInstancia(agenciaId: string): Promise<{ instanceName: string; qrcode?: string }> {
  const instanceName = `sutogas-${agenciaId.slice(0, 8)}`

  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: `${process.env.BACKEND_URL}/webhook/evolution`,
        byEvents: true,
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    }),
  })

  const data = await res.json() as any
  return {
    instanceName,
    qrcode: data?.qrcode?.base64,
  }
}

export async function obterQRCode(instanceName: string): Promise<string | null> {
  const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, { headers })
  const data = await res.json() as any
  return data?.base64 || null
}

export async function checarStatus(instanceName: string): Promise<string> {
  const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, { headers })
  const data = await res.json() as any
  return data?.instance?.state || 'close'
}

export async function enviarMensagem(instanceName: string, numero: string, texto: string): Promise<boolean> {
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: numero, text: texto }),
  })
  return res.ok
}

export async function deletarInstancia(instanceName: string): Promise<boolean> {
  const res = await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers,
  })
  return res.ok
}
```

### Integrar no whatsapp.service.ts existente
Adicionar `evolution` como provider na abstração existente:
```typescript
// whatsapp.service.ts — adicionar ao switch de providers
case 'evolution':
  return enviarMensagem(
    `sutogas-${agenciaId.slice(0, 8)}`,
    numero,
    texto
  )
```

---

## 8. WEBHOOK EVOLUTION — NOVO ENDPOINT

### Arquivo a criar
`backend/src/routes/evolution.route.ts`

```typescript
import express from 'express'
import { processarMensagem } from '../services/ai.service'
import { supabase } from '../lib/supabase'

const router = express.Router()

router.post('/webhook/evolution', async (req, res) => {
  const { event, instance, data } = req.body

  // Extrair agencia_id do instanceName (ex: sutogas-d964cfc4)
  const agenciaIdCurto = instance?.replace('sutogas-', '')
  if (!agenciaIdCurto) return res.status(400).json({ error: 'Instance inválida' })

  // Buscar agência completa pelo prefixo do ID
  const { data: agencia } = await supabase
    .from('agencias')
    .select('*')
    .ilike('id', `${agenciaIdCurto}%`)
    .single()

  if (!agencia) return res.status(404).json({ error: 'Agência não encontrada' })

  // Tratar eventos
  switch (event) {
    case 'MESSAGES_UPSERT': {
      const msg = data?.message
      const remoteJid = data?.key?.remoteJid
      const fromMe = data?.key?.fromMe

      // Ignorar mensagens enviadas pelo próprio bot
      if (fromMe) return res.status(200).json({ ok: true })

      // Extrair número e texto
      const numero = remoteJid?.replace('@s.whatsapp.net', '')
      const texto = msg?.conversation || msg?.extendedTextMessage?.text || ''

      if (!numero || !texto) return res.status(200).json({ ok: true })

      // Processar com IA (mesmo fluxo do Meta API)
      await processarMensagem({ agencia, numero, texto, provider: 'evolution' })
      break
    }

    case 'CONNECTION_UPDATE': {
      const state = data?.state
      // Atualizar status da instância no banco
      await supabase
        .from('agencias')
        .update({ zapi_status: state === 'open' ? 'connected' : 'disconnected' })
        .ilike('id', `${agenciaIdCurto}%`)
      break
    }

    case 'QRCODE_UPDATED': {
      const qrcode = data?.qrcode?.base64
      // Salvar QR code temporariamente para exibir no dashboard
      await supabase
        .from('agencias')
        .update({ evolution_qrcode: qrcode, evolution_qrcode_at: new Date().toISOString() })
        .ilike('id', `${agenciaIdCurto}%`)
      break
    }
  }

  return res.status(200).json({ ok: true })
})

export default router
```

---

## 9. CAMPOS NOVOS NA TABELA agencias

```sql
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS evolution_instance    TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS evolution_status      TEXT DEFAULT 'disconnected';
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS evolution_qrcode      TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS evolution_qrcode_at   TIMESTAMPTZ;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS evolution_connected_at TIMESTAMPTZ;
```

---

## 10. PÁGINA DE CONEXÃO — EVOLUTION TAB

Na página `/dashboard/conexao` existente, adicionar aba "Evolution API":

### Fluxo de conexão via dashboard
```
1. Usuário clica "Conectar via Evolution"
2. Frontend chama: POST /api/conexao/evolution/criar
3. Backend cria instância na Evolution API
4. Backend salva instanceName na agência
5. Frontend exibe QR code (polling a cada 3s)
6. Usuário escaneia QR code
7. Webhook CONNECTION_UPDATE chega: state=open
8. Dashboard atualiza: "Conectado ✅"
```

### Endpoints de API a criar no frontend (Next.js)
```
POST /api/conexao/evolution/criar    → cria instância
GET  /api/conexao/evolution/qrcode   → retorna QR code atual
GET  /api/conexao/evolution/status   → retorna status atual
DELETE /api/conexao/evolution/deletar → deleta instância
```

---

## 11. VARIÁVEIS DE AMBIENTE A ADICIONAR

### Backend (Railway)
```env
EVOLUTION_API_URL=https://evolution.envizap.com
EVOLUTION_API_KEY=[pegar no Coolify → AUTHENTICATION_API_KEY]
EVOLUTION_WEBHOOK_SECRET=evolution-secret-2024
BACKEND_URL=https://sutogas-backend-production.up.railway.app
```

### Frontend (Railway)
```env
NEXT_PUBLIC_EVOLUTION_ENABLED=true
```

---

## 12. PROTEÇÃO CONTRA BAN DOS NÚMEROS

### Regras obrigatórias no código
```typescript
// 1. Delay entre mensagens (nunca enviar em rajada)
await sleep(1000 + Math.random() * 2000) // 1-3 segundos

// 2. Nunca enviar para números que não iniciaram a conversa
if (fromMe) return // ignorar mensagens próprias

// 3. Nunca usar para disparo em massa
// O SutoGas SÓ responde quem mandou mensagem primeiro

// 4. Limitar tamanho das mensagens
const MAX_CHARS = 1000
texto = texto.slice(0, MAX_CHARS)
```

### Boas práticas para os clientes
- Número deve ter pelo menos 30 dias de uso no aparelho
- Não desconectar/reconectar repetidamente
- Não usar o mesmo número em duas instâncias simultaneamente
- Não enviar imagens ou áudios em alta frequência

---

## 13. LIMPEZA DAS INSTÂNCIAS TRAVADAS

Instâncias em status "Connecting" por mais de 10 minutos consomem recursos e podem aquecer o número.

### Script de limpeza (rodar via terminal do Coolify)
```bash
# Listar instâncias presas
curl -X GET https://evolution.envizap.com/instance/fetchInstances \
  -H "apikey: [SUA_API_KEY]" | jq '.[] | select(.instance.state == "connecting") | .instance.instanceName'

# Deletar instância específica
curl -X DELETE https://evolution.envizap.com/instance/delete/NOME_DA_INSTANCIA \
  -H "apikey: [SUA_API_KEY]"
```

Instâncias a deletar (identificadas na análise):
- `sutofly-villa-ida-1776855187036` (Connecting, 0 contatos)
- `sutofly-leticia-1777907411563` (Connecting, 0 contatos)
- `sutofly-marcia-guimar-es-gon-alves-fran-a-1778022868236` (Connecting, 0 contatos)
- `sutofly-priscila-orlando-virginio-1776782214836` (Connecting, 0 contatos)

**NÃO deletar:**
- `apibotsutoflt` (Connected — 54.836 msgs ativas)
- `kayck-wedli-marcelino...` (Connected — em uso)

---

## 14. FIREWALL — CONFIGURAR APÓS UPGRADE

```
Porta 22   → SSH (liberar apenas seu IP fixo se possível)
Porta 80   → HTTP (redireciona para 443)
Porta 443  → HTTPS (Evolution API + Coolify)
Porta 8080 → Coolify painel (liberar apenas seu IP)
Bloquear   → todo resto
```

Configurar em: Hostinger → VPS → Firewall rules

---

## 15. ORDEM DE IMPLEMENTAÇÃO (Claude Code)

```
Passo 1: Rodar migration SQL (seção 9)
         — novos campos na tabela agencias

Passo 2: Criar evolution.provider.ts (seção 7)
         — funções de comunicação com a API

Passo 3: Criar evolution.route.ts (seção 8)
         — webhook que recebe eventos da Evolution

Passo 4: Registrar rota no index.ts do backend
         — app.use(evolutionRouter)

Passo 5: Adicionar variáveis de ambiente no Railway (seção 11)

Passo 6: Adicionar provider 'evolution' no whatsapp.service.ts
         — integrar com abstração existente

Passo 7: Criar endpoints de API no frontend Next.js (seção 10)
         — /api/conexao/evolution/*

Passo 8: Adicionar aba Evolution na página /dashboard/conexao
         — QR code + status em tempo real

Passo 9: Testar com 1 instância real
         — criar instância, escanear QR, mandar mensagem, verificar resposta

Passo 10: Limpar instâncias travadas (seção 13)
          — deletar as 4 instâncias em Connecting
```

---

## 16. CHECKLIST PRÉ-IMPLEMENTAÇÃO

Antes de o Claude Code começar, confirmar:

- [ ] Upgrade do servidor concluído (KVM 2 — 8 GB RAM)
- [ ] `free -h` mostra pelo menos 5 GB livres
- [ ] `docker ps` mostra todos os serviços rodando
- [ ] API Key da Evolution copiada do Coolify
- [ ] Variáveis adicionadas no Railway (seção 11)
- [ ] Instâncias travadas deletadas (seção 13)

---

## 17. TESTE DE VALIDAÇÃO

Após implementação, validar com este roteiro:

```
1. Criar instância via dashboard SutoGas
   → Verificar se aparece no manager Evolution

2. Exibir QR code no dashboard
   → Verificar se QR code aparece em menos de 5s

3. Escanear QR code com WhatsApp do cliente
   → Status deve mudar para "Conectado"

4. Enviar mensagem de teste para o número
   → SutoGas deve responder via IA

5. Verificar no dashboard que a conversa foi registrada
   → Pedido deve aparecer se cliente fizer pedido

6. Simular desconexão (tirar do ar o WhatsApp)
   → Status deve mudar para "Desconectado" no dashboard
```

---

*Evolution API + SutoGas — Documento para Claude Code*
*Servidor: srv1066461.hstgr.cloud | Evolution: evolution.envizap.com*
