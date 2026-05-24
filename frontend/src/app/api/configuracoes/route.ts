import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

const ALLOWED = new Set([
  'whatsapp_dono',
  'relatorio_frequencia',
  'prompt_customizado',
  'horario_inicio',
  'horario_fim',
  'atendimento_ativo',
  'timezone',
  'distribuicao_modo',
  'agente_ativo',
]);

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('agencias')
    .select(
      'id, nome, provider, whatsapp_dono, relatorio_frequencia, prompt_customizado, ' +
        'phone_number_id, zapi_instance_id, zapi_token, zapi_status, status_conta, ' +
        'trial_inicio, trial_atendimentos, horario_inicio, horario_fim, atendimento_ativo, ' +
        'timezone, distribuicao_modo, agente_ativo',
    )
    .eq('id', agenciaId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agencia: data });
}

export async function PATCH(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'body inválido' }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nenhum campo válido' }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update(update)
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
