import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// GET — lista as versões salvas (até 5)
export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('prompt_historico')
    .select('id, nome, modo, criado_em, prompt_texto')
    .eq('agencia_id', agenciaId)
    .order('criado_em', { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    versoes: (data ?? []).map((v) => ({
      id: v.id,
      nome: v.nome,
      modo: v.modo,
      criado_em: v.criado_em,
      preview: (v.prompt_texto ?? '').slice(0, 240),
    })),
  });
}
