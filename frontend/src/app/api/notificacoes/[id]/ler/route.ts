import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;
  const { id } = await ctx.params;

  const { error } = await supabaseAdmin()
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', id)
    .eq('agencia_id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
