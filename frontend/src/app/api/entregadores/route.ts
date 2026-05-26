import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('entregadores')
    .select('*')
    .eq('agencia_id', agenciaId)
    .order('nome');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entregadores: data ?? [] });
}

export async function POST(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  const nome = body?.nome?.trim();
  const whatsapp = body?.whatsapp?.trim();
  if (!nome || !whatsapp) {
    return NextResponse.json({ error: 'nome e whatsapp obrigatórios' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Enforcement: limite_entregadores do plano atual da agência
  const { data: ag } = await db
    .from('agencias')
    .select('plano_slug')
    .eq('id', agenciaId)
    .maybeSingle();

  if (ag?.plano_slug) {
    const { data: plano } = await db
      .from('planos')
      .select('limite_entregadores, nome')
      .eq('slug', ag.plano_slug)
      .maybeSingle();

    if (plano?.limite_entregadores != null) {
      const { count } = await db
        .from('entregadores')
        .select('id', { count: 'exact', head: true })
        .eq('agencia_id', agenciaId)
        .eq('ativo', true);

      if ((count ?? 0) >= plano.limite_entregadores) {
        return NextResponse.json(
          {
            error: `Seu plano (${plano.nome}) permite até ${plano.limite_entregadores} entregadores. Faça upgrade para adicionar mais.`,
          },
          { status: 403 },
        );
      }
    }
  }

  const { data, error } = await db
    .from('entregadores')
    .insert({ agencia_id: agenciaId, nome, whatsapp, ativo: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entregador: data });
}

export async function PATCH(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.ativo === 'boolean') update.ativo = body.ativo;
  if (typeof body.nome === 'string') update.nome = body.nome;
  if (typeof body.whatsapp === 'string') update.whatsapp = body.whatsapp;

  const db = supabaseAdmin();

  // Reativação: aplica o mesmo enforcement do POST
  if (update.ativo === true) {
    const { data: ag } = await db
      .from('agencias')
      .select('plano_slug')
      .eq('id', agenciaId)
      .maybeSingle();

    if (ag?.plano_slug) {
      const { data: plano } = await db
        .from('planos')
        .select('limite_entregadores, nome')
        .eq('slug', ag.plano_slug)
        .maybeSingle();

      if (plano?.limite_entregadores != null) {
        const { count } = await db
          .from('entregadores')
          .select('id', { count: 'exact', head: true })
          .eq('agencia_id', agenciaId)
          .eq('ativo', true);

        if ((count ?? 0) >= plano.limite_entregadores) {
          return NextResponse.json(
            {
              error: `Seu plano (${plano.nome}) permite até ${plano.limite_entregadores} entregadores ativos.`,
            },
            { status: 403 },
          );
        }
      }
    }
  }

  const { error } = await db
    .from('entregadores')
    .update(update)
    .eq('id', id)
    .eq('agencia_id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
