import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('clientes')
    .select('*')
    .eq('agencia_id', agenciaId)
    .order('ultimo_pedido', { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clientes: data ?? [] });
}
