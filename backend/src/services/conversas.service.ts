import { getSupabase } from '../lib/supabase';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
    .select('historico')
    .eq('agencia_id', agenciaId)
    .eq('cliente_whatsapp', clienteWhatsapp)
    .single();

  if (error) {
    console.warn(`[conversas] não foi possível ler histórico: ${error.message}`);
    return [];
  }

  return (data?.historico ?? []) as Message[];
}

export async function salvarHistorico(
  agenciaId: string,
  clienteWhatsapp: string,
  historico: Message[],
): Promise<void> {
  const { error } = await getSupabase()
    .from('conversas')
    .upsert(
      {
        agencia_id: agenciaId,
        cliente_whatsapp: clienteWhatsapp,
        historico,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'agencia_id,cliente_whatsapp' },
    );

  if (error) throw new Error(`Erro ao salvar histórico: ${error.message}`);
}
