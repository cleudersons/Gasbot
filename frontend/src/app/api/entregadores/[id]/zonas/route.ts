import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('entregador_zonas')
    .select('id, zona, criado_em')
    .eq('entregador_id', params.id)
    .eq('agencia_id', agenciaId)
    .order('zona');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zonas: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  const zona = body?.zona?.trim();
  if (!zona) return NextResponse.json({ error: 'zona obrigatória' }, { status: 400 });

  // verificar que o entregador pertence à agência da sessão
  const { data: ent } = await supabaseAdmin()
    .from('entregadores')
    .select('id, agencia_id')
    .eq('id', params.id)
    .eq('agencia_id', agenciaId)
    .maybeSingle();
  if (!ent) return NextResponse.json({ error: 'Entregador não encontrado' }, { status: 404 });

  const { data, error } = await supabaseAdmin()
    .from('entregador_zonas')
    .insert({ entregador_id: params.id, agencia_id: agenciaId, zona })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zona: data });
}
