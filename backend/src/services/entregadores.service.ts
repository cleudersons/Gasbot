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

  // Pode haver mais de um entregador com mesmo whatsapp em agências diferentes
  // (ex: dono testando o sistema em conta nova). Buscamos TODOS os ativos e
  // priorizamos aquele cuja agência tem pedido pendente — se nenhum, o mais
  // recente.
  const { data, error } = await getSupabase()
    .from('entregadores')
    .select('*')
    .in('whatsapp', variantes)
    .eq('ativo', true)
    .order('criado_em', { ascending: false });

  if (error) {
    console.warn(`[entregadores] erro ao buscar por whatsapp: ${error.message}`);
    return null;
  }
  const matches = (data ?? []) as Entregador[];
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Verifica qual agência tem pedido pendente — essa ganha
  for (const e of matches) {
    const { count } = await getSupabase()
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('agencia_id', e.agencia_id)
      .in('status', ['pendente', 'aceito', 'em_entrega']);
    if ((count ?? 0) > 0) return e;
  }

  // Fallback: o mais recente (primeira da lista, já ordenada DESC)
  return matches[0];
}
