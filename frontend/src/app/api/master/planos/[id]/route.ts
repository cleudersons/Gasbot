import { NextResponse } from 'next/server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const m = await requireMaster();
  if (isErrorResponse(m)) return m;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() };

  if (body?.slug !== undefined) patch.slug = String(body.slug).trim().toLowerCase();
  if (body?.nome !== undefined) patch.nome = String(body.nome).trim();
  if (body?.descricao !== undefined) patch.descricao = body.descricao ? String(body.descricao) : null;
  if (body?.categoria !== undefined) {
    if (body.categoria !== 'basico' && body.categoria !== 'pro') {
      return NextResponse.json({ error: "categoria inválida" }, { status: 400 });
    }
    patch.categoria = body.categoria;
  }
  if (body?.preco_normal !== undefined) {
    patch.preco_normal = body.preco_normal == null || body.preco_normal === '' ? null : Number(body.preco_normal);
  }
  if (body?.limite_atendimentos !== undefined) {
    const v = body.limite_atendimentos;
    patch.limite_atendimentos = v === '' || v == null ? null : Number(v);
  }
  if (body?.duracao_dias !== undefined) {
    const d = Number(body.duracao_dias);
    if (!Number.isFinite(d) || d <= 0) {
      return NextResponse.json({ error: 'duracao_dias deve ser > 0' }, { status: 400 });
    }
    patch.duracao_dias = d;
  }
  if (body?.fundador !== undefined) patch.fundador = !!body.fundador;
  if (body?.ativo !== undefined) patch.ativo = !!body.ativo;

  const { data, error } = await supabaseAdmin()
    .from('planos')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plano: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const m = await requireMaster();
  if (isErrorResponse(m)) return m;

  const { id } = await params;
  // soft delete: marca ativo=false (mantém histórico p/ auditoria de pagamentos antigos)
  const { error } = await supabaseAdmin()
    .from('planos')
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
