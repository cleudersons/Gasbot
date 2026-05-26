import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// GET — estado atual das vagas do programa fundador (lido com service role
// pra não depender de RLS na tabela programa_fundador_config).
export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data } = await supabaseAdmin()
    .from('programa_fundador_config')
    .select('vagas_total, vagas_usadas, ativo')
    .eq('ativo', true)
    .maybeSingle();

  const total = data?.vagas_total ?? 0;
  const restantes = Math.max(0, total - (data?.vagas_usadas ?? 0));
  return NextResponse.json({
    vagas_total: total,
    vagas_restantes: restantes,
    ativo: !!data?.ativo,
  });
}
