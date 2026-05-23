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

  const { data, error } = await supabaseAdmin()
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

  const { error } = await supabaseAdmin()
    .from('entregadores')
    .update(update)
    .eq('id', id)
    .eq('agencia_id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
