import { NextResponse } from 'next/server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Retorna planos publicos+ativos para a pagina /dashboard/planos.
// Planos ocultos (publico=false) so sao acessiveis via checkout direto.
export async function GET() {
  const guard = await requireAgenciaId();
  if (isErrorResponse(guard)) return guard;

  const { data, error } = await supabaseAdmin()
    .from('planos')
    .select('id, slug, nome, descricao, categoria, preco_normal, limite_atendimentos, duracao_dias, fundador')
    .eq('ativo', true)
    .eq('publico', true)
    .order('fundador', { ascending: true })
    .order('categoria', { ascending: true })
    .order('preco_normal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ planos: data ?? [] });
}
