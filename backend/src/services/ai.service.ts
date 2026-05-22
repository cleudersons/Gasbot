import OpenAI from 'openai';
import { ChatMessage } from './conversationStore';
import { TenantAIConfig, AIProvider } from '../types/ai.types';

export const SYSTEM_PROMPT = `Você é o assistente virtual do Depósito GasBot. Seu objetivo é atender pedidos de gás e água mineral de forma rápida e simpática.
REGRAS OBRIGATÓRIAS:
1. Identifique sempre: PRODUTO, QUANTIDADE e ENDEREÇO completo.
2. Pergunte apenas o que falta. Não repita perguntas.
3. Confirme o pedido com resumo antes de finalizar.
4. Após confirmar, pergunte se pode enviar lembrete em 30 dias.
5. Seja breve: máximo 2-3 linhas por mensagem.
6. Nunca invente preço ou disponibilidade.
Quando tiver produto + endereço confirmados, responda EXATAMENTE:
PEDIDO_CONFIRMADO:{produto}|{quantidade}|{endereco}`;

const openaiClients = new Map<string, OpenAI>();

function getOpenAIClient(apiKey: string): OpenAI {
  let client = openaiClients.get(apiKey);
  if (!client) {
    client = new OpenAI({ apiKey });
    openaiClients.set(apiKey, client);
  }
  return client;
}

function resolveProvider(provider: AIProvider): AIProvider {
  if (provider === 'openai') return 'openai';
  console.warn(`[ai.service] Provider ${provider} ainda não implementado — usando openai como fallback`);
  return 'openai';
}

function resolveApiKey(config: TenantAIConfig, effectiveProvider: AIProvider): string {
  if (config.apiKey) return config.apiKey;
  if (effectiveProvider === 'openai') {
    const envKey = process.env.OPENAI_API_KEY;
    if (!envKey) throw new Error('OPENAI_API_KEY não configurada');
    return envKey;
  }
  throw new Error(`Sem chave configurada para provider ${effectiveProvider}`);
}

export async function generateReply(
  config: TenantAIConfig,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const effectiveProvider = resolveProvider(config.provider);
  const apiKey = resolveApiKey(config, effectiveProvider);
  const model = config.model || 'gpt-4o-mini';

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  if (effectiveProvider === 'openai') {
    const openai = getOpenAIClient(apiKey);
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 300,
    });
    return completion.choices[0]?.message?.content?.trim() ?? '';
  }

  throw new Error(`Provider ${effectiveProvider} não suportado`);
}
