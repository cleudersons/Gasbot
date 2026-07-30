import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const { data, error } = await supabaseAdmin()
    .from('config_globais')
    .select('agente_demo_pausado')
    .eq('id', true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agente_demo_pausado: data?.agente_demo_pausado ?? false });
}

export async function PATCH(req: Request) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.agente_demo_pausado !== 'boolean') {
    return NextResponse.json({ error: 'agente_demo_pausado (boolean) obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('config_globais')
    .update({ agente_demo_pausado: body.agente_demo_pausado, atualizado_em: new Date().toISOString() })
    .eq('id', true)
    .select('agente_demo_pausado')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
