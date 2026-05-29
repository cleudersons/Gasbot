import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// Marca que o usuário viu o modal de boas-vindas. Idempotente.
export async function POST() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({ viu_tutorial_inicial: true })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
