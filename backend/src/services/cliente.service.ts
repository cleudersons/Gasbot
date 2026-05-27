import { getSupabase } from '../lib/supabase';
import { variantesWhatsappBR } from '../utils/whatsapp-format';

export interface Cliente {
  id: string;
  agencia_id: string;
  whatsapp: string;
  nome: string | null;
  dias_recarga: number;
  total_pedidos: number;
  ultimo_pedido: string | null;
  produto_preferido: string | null;
  endereco_preferido: string | null;
}

export async function buscarCliente(
  agenciaId: string,
  whatsapp: string,
): Promise<Cliente | null> {
  const variantes = variantesWhatsappBR(whatsapp);
  const { data } = await getSupabase()
    .from('clientes')
    .select('*')
    .eq('agencia_id', agenciaId)
    .in('whatsapp', variantes)
    .limit(1);
  return data && data.length > 0 ? (data[0] as Cliente) : null;
}

// Calcula a média móvel dos últimos N intervalos entre pedidos confirmados.
// Considera variantes do whatsapp (com/sem 9), exclui cancelados e filtra
// outliers (intervalos < 3 dias ou > 90 dias — gás raramente foge disso).
async function mediaIntervalosUltimosPedidos(
  agenciaId: string,
  whatsapp: string,
  limite = 5,
): Promise<number | null> {
  const variantes = variantesWhatsappBR(whatsapp);
  const { data } = await getSupabase()
    .from('pedidos')
    .select('criado_em, status')
    .eq('agencia_id', agenciaId)
    .in('cliente_whatsapp', variantes)
    .neq('status', 'cancelado')
    .order('criado_em', { ascending: false })
    .limit(limite);

  if (!data || data.length < 2) return null;
  const ts = data.map((r) => new Date(r.criado_em).getTime()).sort((a, b) => a - b);
  const diffs: number[] = [];
  for (let i = 1; i < ts.length; i++) {
    const d = (ts[i] - ts[i - 1]) / (24 * 60 * 60 * 1000);
    if (d >= 3 && d <= 90) diffs.push(d); // descarta duplicados (<3d) e ausência longa (>90d)
  }
  if (diffs.length === 0) return null;
  const media = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  return Math.max(3, Math.min(90, Math.round(media)));
}

export async function upsertCliente(
  agenciaId: string,
  whatsapp: string,
  produto: string | null,
  endereco: string | null,
  diasRecarga?: number,
  nome?: string | null,
): Promise<void> {
  const db = getSupabase();
  const existente = await buscarCliente(agenciaId, whatsapp);

  if (!existente) {
    const insert: Record<string, unknown> = {
      agencia_id: agenciaId,
      whatsapp,
      total_pedidos: produto ? 1 : 0,
      ultimo_pedido: produto ? new Date().toISOString() : null,
      produto_preferido: produto,
      endereco_preferido: endereco,
    };
    if (diasRecarga) insert.dias_recarga = diasRecarga;
    if (nome) insert.nome = nome;
    const { error } = await db.from('clientes').insert(insert);
    if (error) console.error('[cliente] erro insert:', error.message);
    return;
  }

  const update: Record<string, unknown> = {};
  if (produto) {
    update.total_pedidos = (existente.total_pedidos ?? 0) + 1;
    update.ultimo_pedido = new Date().toISOString();
    update.produto_preferido = produto;
  }
  if (endereco) update.endereco_preferido = endereco;
  if (nome && !existente.nome) update.nome = nome; // só grava se ainda não tem

  // Regra de dias_recarga (prioridade):
  // - Cliente com < 2 pedidos: usa o que ele disse (LEMBRETE_CONFIRMADO:X)
  //   porque ainda não temos histórico real pra calcular nada.
  // - Cliente com >= 2 pedidos: IGNORA o valor dito e usa a média móvel
  //   dos intervalos reais. Adapta automaticamente ao comportamento.
  const totalDepois = (existente.total_pedidos ?? 0) + (produto ? 1 : 0);
  if (totalDepois >= 2) {
    const media = await mediaIntervalosUltimosPedidos(agenciaId, whatsapp);
    if (media) {
      update.dias_recarga = media;
      if (diasRecarga && diasRecarga !== media) {
        console.log(
          `[cliente] ${whatsapp}: dias_recarga ajustado pra ${media} (cliente disse ${diasRecarga}, mas histórico real manda)`,
        );
      }
    } else if (diasRecarga) {
      // Sem histórico filtrável ainda — aceita o valor do cliente
      update.dias_recarga = diasRecarga;
    }
  } else if (diasRecarga) {
    update.dias_recarga = diasRecarga;
  }

  if (Object.keys(update).length === 0) return;

  const { error } = await db
    .from('clientes')
    .update(update)
    .eq('agencia_id', agenciaId)
    .eq('whatsapp', whatsapp);
  if (error) console.error('[cliente] erro update:', error.message);
}

export function montarContextoCliente(c: Cliente | null): string | null {
  if (!c) return null;
  const partes = [
    `dias_recarga=${c.dias_recarga ?? 30}`,
    `total_pedidos=${c.total_pedidos ?? 0}`,
  ];
  if (c.nome) partes.push(`nome=${c.nome}`);
  if (c.produto_preferido) partes.push(`produto_preferido=${c.produto_preferido}`);
  if (c.endereco_preferido) partes.push(`endereco_preferido=${c.endereco_preferido}`);
  return `[CLIENTE: ${partes.join(', ')}]`;
}
