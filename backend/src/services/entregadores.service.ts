import { getSupabase } from '../lib/supabase';
import { variantesWhatsappBR } from '../utils/whatsapp-format';

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
  const variantes = variantesWhatsappBR(whatsapp);

  const { data, error } = await getSupabase()
    .from('entregadores')
    .select('*')
    .in('whatsapp', variantes)
    .eq('ativo', true)
    .limit(1);

  if (error) {
    console.warn(`[entregadores] erro ao buscar por whatsapp: ${error.message}`);
    return null;
  }
  return (data && data.length > 0 ? (data[0] as Entregador) : null);
}
