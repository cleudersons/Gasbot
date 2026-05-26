import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { auth } from '@/lib/auth';

interface Body {
  token?: string; // origem=publico
  satisfacao?: number;
  sugestoes?: string;
  video_ja_enviado?: boolean;
  indicacao1_nome?: string;
  indicacao1_whatsapp?: string;
  indicacao2_nome?: string;
  indicacao2_whatsapp?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: 'payload inválido' }, { status: 400 });

  let agenciaId: string | null = null;
  let origem: 'logado' | 'publico' = 'publico';
  const db = supabaseAdmin();

  if (body.token) {
    const { data } = await db
      .from('agencias')
      .select('id')
      .eq('fundador_feedback_token', body.token)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: 'token inválido' }, { status: 404 });
    agenciaId = data.id;
    origem = 'publico';
  } else {
    const session = await auth();
    const id = (session?.user as any)?.agenciaId as string | null | undefined;
    if (!id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    agenciaId = id;
    origem = 'logado';
  }

  if (body.satisfacao != null && (body.satisfacao < 1 || body.satisfacao > 5)) {
    return NextResponse.json({ error: 'satisfacao deve estar entre 1 e 5' }, { status: 400 });
  }

  const { error } = await db.from('fundador_feedback').insert({
    agencia_id: agenciaId,
    origem,
    token: origem === 'publico' ? body.token : null,
    satisfacao: body.satisfacao ?? null,
    sugestoes: body.sugestoes?.trim() || null,
    video_ja_enviado: !!body.video_ja_enviado,
    indicacao1_nome: body.indicacao1_nome?.trim() || null,
    indicacao1_whatsapp: body.indicacao1_whatsapp?.trim() || null,
    indicacao2_nome: body.indicacao2_nome?.trim() || null,
    indicacao2_whatsapp: body.indicacao2_whatsapp?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // marca a notificação relacionada como lida (best-effort)
  if (origem === 'logado' && agenciaId) {
    await db
      .from('notificacoes')
      .update({ lida: true })
      .eq('agencia_id', agenciaId)
      .eq('tipo', 'feedback_fundador')
      .eq('lida', false);
  }

  return NextResponse.json({ ok: true });
}
