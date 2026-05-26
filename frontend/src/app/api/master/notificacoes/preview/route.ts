import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

// GET ?plano=basico&fundador=todos → quantas agências receberiam
export async function GET(req: Request) {
  const ok = await requireMaster();
  if (isErrorResponse(ok)) return ok;

  const url = new URL(req.url);
  const plano = url.searchParams.get('plano');
  const fundador = url.searchParams.get('fundador') ?? 'todos';

  let q = supabaseAdmin()
    .from('agencias')
    .select('id', { count: 'exact', head: true })
    .neq('status_conta', 'cancelado');

  if (plano) q = q.eq('plano', plano);
  if (fundador === 'fundador') q = q.eq('programa_fundador', true);
  if (fundador === 'nao_fundador') q = q.eq('programa_fundador', false);

  const { count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ total: count ?? 0 });
}
