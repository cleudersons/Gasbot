import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// POST — restaura a versão. Salva o estado atual no histórico antes
// (assim o restore também é reversível) e respeita o cap de 5.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;
  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data: versao, error: errVer } = await db
    .from('prompt_historico')
    .select('prompt_texto, prompt_config')
    .eq('id', id)
    .eq('agencia_id', agenciaId)
    .maybeSingle();

  if (errVer || !versao) {
    return NextResponse.json({ error: 'versão não encontrada' }, { status: 404 });
  }

  // Snapshot do estado atual antes de sobrescrever
  const { data: atual } = await db
    .from('agencias')
    .select('prompt_customizado, prompt_config')
    .eq('id', agenciaId)
    .maybeSingle();

  if (atual?.prompt_customizado && atual.prompt_customizado.trim().length > 0) {
    const cfgAtual = (atual.prompt_config ?? {}) as Record<string, unknown>;
    await db.from('prompt_historico').insert({
      agencia_id: agenciaId,
      prompt_texto: atual.prompt_customizado,
      prompt_config: atual.prompt_config,
      modo: (cfgAtual.modo as string) ?? 'form',
    });

    const { data: versoes } = await db
      .from('prompt_historico')
      .select('id')
      .eq('agencia_id', agenciaId)
      .order('criado_em', { ascending: false });
    if (versoes && versoes.length > 5) {
      const idsParaApagar = versoes.slice(5).map((v) => v.id);
      await db.from('prompt_historico').delete().in('id', idsParaApagar);
    }
  }

  const { error } = await db
    .from('agencias')
    .update({
      prompt_customizado: versao.prompt_texto,
      prompt_config: versao.prompt_config,
    })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prompt_config: versao.prompt_config });
}
