import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const guard = await requireAgenciaId();
  if (isErrorResponse(guard)) return guard;
  const agenciaId = guard;

  const db = supabaseAdmin();

  const hojeStart = new Date();
  hojeStart.setHours(0, 0, 0, 0);
  const mesStart = new Date();
  mesStart.setDate(1);
  mesStart.setHours(0, 0, 0, 0);
  const mesAnteriorStart = new Date(mesStart);
  mesAnteriorStart.setMonth(mesAnteriorStart.getMonth() - 1);

  const [{ count: hoje }, { count: mes }, { count: mesAnterior }, { count: total }] =
    await Promise.all([
      db.from('pedidos').select('id', { count: 'exact', head: true })
        .eq('agencia_id', agenciaId).gte('criado_em', hojeStart.toISOString()),
      db.from('pedidos').select('id', { count: 'exact', head: true })
        .eq('agencia_id', agenciaId).gte('criado_em', mesStart.toISOString()),
      db.from('pedidos').select('id', { count: 'exact', head: true })
        .eq('agencia_id', agenciaId)
        .gte('criado_em', mesAnteriorStart.toISOString())
        .lt('criado_em', mesStart.toISOString()),
      db.from('pedidos').select('id', { count: 'exact', head: true })
        .eq('agencia_id', agenciaId),
    ]);

  return NextResponse.json({
    hoje: hoje ?? 0,
    mes: mes ?? 0,
    mes_anterior: mesAnterior ?? 0,
    total: total ?? 0,
  });
}
