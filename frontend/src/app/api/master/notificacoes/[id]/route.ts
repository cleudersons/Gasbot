import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

// DELETE — apaga campanha (CASCADE remove notificacoes filhas)
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ok = await requireMaster();
  if (isErrorResponse(ok)) return ok;
  const { id } = await ctx.params;

  const { error } = await supabaseAdmin()
    .from('notificacao_campanhas')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
