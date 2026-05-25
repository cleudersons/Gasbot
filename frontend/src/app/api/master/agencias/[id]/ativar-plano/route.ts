import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

/**
 * POST /api/master/agencias/[id]/ativar-plano
 * Body: { slug: string, duracao_dias?: number, motivo?: string }
 *
 * Ativa manualmente um plano cadastrado em `planos` na agência alvo.
 * Espelha a lógica do /webhook/checkout (backend), mas sem cobrar nada.
 * Use casos: cortesia, primeiro cliente, suporte que precisa renovar.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const body = await req.json().catch(() => ({}));
  const slug = (body?.slug ?? '').toString().trim();
  const motivo = body?.motivo ? String(body.motivo) : null;
  const duracaoOverride =
    body?.duracao_dias != null && body.duracao_dias !== ''
      ? Number(body.duracao_dias)
      : null;

  if (!slug) {
    return NextResponse.json({ error: 'slug do plano é obrigatório' }, { status: 400 });
  }
  if (duracaoOverride !== null && (!Number.isFinite(duracaoOverride) || duracaoOverride <= 0)) {
    return NextResponse.json({ error: 'duracao_dias inválido' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: plano, error: errPlano } = await db
    .from('planos')
    .select('categoria, limite_atendimentos, duracao_dias, fundador')
    .eq('slug', slug)
    .eq('ativo', true)
    .maybeSingle();

  if (errPlano) {
    return NextResponse.json({ error: errPlano.message }, { status: 500 });
  }
  if (!plano) {
    return NextResponse.json({ error: `Plano não encontrado: ${slug}` }, { status: 404 });
  }

  const duracao = duracaoOverride ?? plano.duracao_dias;
  const agora = new Date();
  const vencimento = new Date(agora.getTime() + duracao * 24 * 60 * 60 * 1000);

  const update: Record<string, unknown> = {
    plano: plano.categoria,
    plano_slug: slug,
    status_conta: 'ativo',
    limite_atendimentos: plano.limite_atendimentos,
    vencimento_plano: vencimento.toISOString(),
    // ativação manual: zera dados de pagamento e desliga recorrência
    ultimo_pagamento_valor: 0,
    ultimo_pagamento_asaas: motivo ? `manual:${motivo}` : 'manual',
    recorrencia_ativa: false,
    proxima_cobranca: null,
  };

  if (plano.fundador) {
    const ate = new Date(agora);
    ate.setMonth(ate.getMonth() + 12);
    update.programa_fundador = true;
    update.fundador_desconto_ate = ate.toISOString();
  }

  const { data, error: errUp } = await db
    .from('agencias')
    .update(update)
    .eq('id', params.id)
    .select('id, nome, plano, plano_slug, status_conta, vencimento_plano, limite_atendimentos, programa_fundador')
    .single();

  if (errUp) {
    return NextResponse.json({ error: errUp.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, agencia: data });
}
