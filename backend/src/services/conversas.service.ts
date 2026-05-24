import { getSupabase } from '../lib/supabase';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Janela de continuidade da conversa. Após esse tempo sem mensagens,
// o próximo "oi" do cliente recomeça do passo 1 (RECEPÇÃO).
const TTL_MINUTES = 30;

// Mantém o array em tamanho razoável (rolling window).
const MAX_MESSAGES = 20;

export async function buscarHistorico(
  agenciaId: string,
  clienteWhatsapp: string,
): Promise<Message[]> {
  const supabase = getSupabase();

  await supabase
    .from('conversas')
    .upsert(
      { agencia_id: agenciaId, cliente_whatsapp: clienteWhatsapp, historico: [] },
      { onConflict: 'agencia_id,cliente_whatsapp', ignoreDuplicates: true },
    );

  const { data, error } = await supabase
    .from('conversas')
    .select('historico, atualizado_em')
    .eq('agencia_id', agenciaId)
    .eq('cliente_whatsapp', clienteWhatsapp)
    .single();

  if (error) {
    console.warn(`[conversas] não foi possível ler histórico: ${error.message}`);
    return [];
  }

  // Se a última atualização foi há mais de TTL_MINUTES, descarta o
  // histórico e começa a conversa do zero.
  if (data?.atualizado_em) {
    const idleMs = Date.now() - new Date(data.atualizado_em).getTime();
    if (idleMs > TTL_MINUTES * 60 * 1000) {
      console.log(
        `[conversas] histórico de ${clienteWhatsapp} expirado (${Math.round(idleMs / 60000)} min) — reiniciando`,
      );
      return [];
    }
  }

  return (data?.historico ?? []) as Message[];
}

export async function salvarHistorico(
  agenciaId: string,
  clienteWhatsapp: string,
  historico: Message[],
): Promise<void> {
  const trimmed = historico.slice(-MAX_MESSAGES);

  const { error } = await getSupabase()
    .from('conversas')
    .upsert(
      {
        agencia_id: agenciaId,
        cliente_whatsapp: clienteWhatsapp,
        historico: trimmed,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'agencia_id,cliente_whatsapp' },
    );

  if (error) throw new Error(`Erro ao salvar histórico: ${error.message}`);
}

/**
 * Limpa a conversa imediatamente. Útil quando um pedido é finalizado
 * e queremos que a próxima mensagem do cliente comece do zero.
 */
export async function resetarHistorico(
  agenciaId: string,
  clienteWhatsapp: string,
): Promise<void> {
  await salvarHistorico(agenciaId, clienteWhatsapp, []);
}
