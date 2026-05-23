import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const db = supabaseAdmin();

  const [{ data: ag }, { count: entCount }] = await Promise.all([
    db
      .from('agencias')
      .select('prompt_customizado, provider, trial_atendimentos, trial_inicio, status_conta')
      .eq('id', agenciaId)
      .single(),
    db
      .from('entregadores')
      .select('id', { count: 'exact', head: true })
      .eq('agencia_id', agenciaId)
      .eq('ativo', true),
  ]);

  const promptOk = !!ag?.prompt_customizado && ag.prompt_customizado.trim().length > 0;
  const entregadoresOk = (entCount ?? 0) >= 1;
  const conexaoOk = !!ag?.provider && ag.provider !== 'demo';
  const testeOk = (ag?.trial_atendimentos ?? 0) >= 1;

  const passos = {
    contaCriada: true,
    promptOk,
    entregadoresOk,
    conexaoOk,
    testeOk,
  };
  const completos = Object.values(passos).filter(Boolean).length;

  return NextResponse.json({
    passos,
    completos,
    total: 5,
    trial_atendimentos: ag?.trial_atendimentos ?? 0,
    trial_inicio: ag?.trial_inicio ?? null,
    status_conta: ag?.status_conta ?? 'ativo',
    provider: ag?.provider ?? null,
  });
}
