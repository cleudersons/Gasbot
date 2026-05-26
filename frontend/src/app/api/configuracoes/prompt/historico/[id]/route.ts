import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// PATCH — renomeia versão
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { nome?: string } | null;

  const nome = body?.nome?.trim().slice(0, 80) || null;
  const { error } = await supabaseAdmin()
    .from('prompt_historico')
    .update({ nome })
    .eq('id', id)
    .eq('agencia_id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — apaga versão
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;
  const { id } = await ctx.params;

  const { error } = await supabaseAdmin()
    .from('prompt_historico')
    .delete()
    .eq('id', id)
    .eq('agencia_id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
