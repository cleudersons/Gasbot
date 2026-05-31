import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

export async function GET(req: Request) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const url = new URL(req.url);
  const filtro = url.searchParams.get('status'); // aberto|respondido|fechado|null

  const db = supabaseAdmin();
  let query = db
    .from('tickets')
    .select('id, assunto, status, criado_em, atualizado_em, agencia_id, agencias(nome)')
    .order('atualizado_em', { ascending: false });
  if (filtro) query = query.eq('status', filtro);

  const { data: tickets, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Conta abertos (esperando resposta do admin) pra badge
  const { count: abertos } = await db
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'aberto');

  return NextResponse.json({ tickets: tickets ?? [], abertos: abertos ?? 0 });
}
