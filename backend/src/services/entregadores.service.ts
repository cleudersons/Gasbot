import { getSupabase } from '../lib/supabase';

export interface Entregador {
  id: string;
  agencia_id: string;
  nome: string;
  whatsapp: string;
  ativo: boolean;
}

export async function buscarEntregadoresAtivos(agenciaId: string): Promise<Entregador[]> {
  const { data, error } = await getSupabase()
    .from('entregadores')
    .select('*')
    .eq('agencia_id', agenciaId)
    .eq('ativo', true);

  if (error) throw new Error(`Erro ao buscar entregadores: ${error.message}`);
  return (data ?? []) as Entregador[];
}

export async function buscarEntregadorPorWhatsapp(whatsapp: string): Promise<Entregador | null> {
  const { data, error } = await getSupabase()
    .from('entregadores')
    .select('*')
    .eq('whatsapp', whatsapp)
    .eq('ativo', true)
    .maybeSingle();

  if (error) {
    console.warn(`[entregadores] erro ao buscar por whatsapp: ${error.message}`);
    return null;
  }
  return (data as Entregador | null) ?? null;
}
