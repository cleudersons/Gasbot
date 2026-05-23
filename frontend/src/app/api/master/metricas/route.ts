import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const db = supabaseAdmin();
  const hojeStart = new Date();
  hojeStart.setHours(0, 0, 0, 0);
  const mesStart = new Date();
  mesStart.setDate(1);
  mesStart.setHours(0, 0, 0, 0);

  const [
    { count: agenciasTotal },
    { count: agenciasAtivas },
    { count: pedidosHoje },
    { count: pedidosMes },
    { count: entregadores },
    { data: porStatus },
  ] = await Promise.all([
    db.from('agencias').select('id', { count: 'exact', head: true }),
    db.from('agencias').select('id', { count: 'exact', head: true }).eq('status_conta', 'ativo'),
    db.from('pedidos').select('id', { count: 'exact', head: true }).gte('criado_em', hojeStart.toISOString()),
    db.from('pedidos').select('id', { count: 'exact', head: true }).gte('criado_em', mesStart.toISOString()),
    db.from('entregadores').select('id', { count: 'exact', head: true }).eq('ativo', true),
    db.from('pedidos').select('status').gte('criado_em', mesStart.toISOString()),
  ]);

  const breakdown: Record<string, number> = {};
  for (const p of porStatus ?? []) breakdown[p.status] = (breakdown[p.status] ?? 0) + 1;

  return NextResponse.json({
    agenciasTotal: agenciasTotal ?? 0,
    agenciasAtivas: agenciasAtivas ?? 0,
    pedidosHoje: pedidosHoje ?? 0,
    pedidosMes: pedidosMes ?? 0,
    entregadoresAtivos: entregadores ?? 0,
    breakdown,
  });
}
