import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { buildPrompt, PromptConfig } from '@/lib/prompt-builder';

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('agencias')
    .select('prompt_config, prompt_customizado')
    .eq('id', agenciaId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    config: data?.prompt_config ?? {},
    prompt_customizado: data?.prompt_customizado ?? null,
  });
}

export async function POST(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const config = (await req.json().catch(() => null)) as PromptConfig | null;
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'config inválida' }, { status: 400 });
  }

  const promptTexto = buildPrompt(config);

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({
      prompt_config: config,
      prompt_customizado: promptTexto,
    })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prompt: promptTexto });
}
