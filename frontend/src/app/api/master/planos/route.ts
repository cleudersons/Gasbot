import { NextResponse } from 'next/server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const m = await requireMaster();
  if (isErrorResponse(m)) return m;

  const { data, error } = await supabaseAdmin()
    .from('planos')
    .select('*')
    .order('fundador', { ascending: true })
    .order('categoria', { ascending: true })
    .order('preco_normal', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ planos: data ?? [] });
}

export async function POST(req: Request) {
  const m = await requireMaster();
  if (isErrorResponse(m)) return m;

  const body = await req.json().catch(() => ({}));

  const slug = (body?.slug ?? '').toString().trim().toLowerCase();
  const nome = (body?.nome ?? '').toString().trim();
  const categoria = body?.categoria;
  const limiteRaw = body?.limite_atendimentos;
  const duracao = Number(body?.duracao_dias ?? 30);
  const preco = body?.preco_normal != null ? Number(body.preco_normal) : null;
  const fundador = !!body?.fundador;
  const ativo = body?.ativo !== false;
  const publico = body?.publico !== false;
  const descricao = body?.descricao ? body.descricao.toString() : null;

  if (!slug || !nome) {
    return NextResponse.json({ error: 'slug e nome são obrigatórios' }, { status: 400 });
  }
  if (categoria !== 'basico' && categoria !== 'pro') {
    return NextResponse.json({ error: "categoria deve ser 'basico' ou 'pro'" }, { status: 400 });
  }
  if (!Number.isFinite(duracao) || duracao <= 0) {
    return NextResponse.json({ error: 'duracao_dias deve ser > 0' }, { status: 400 });
  }

  const limite =
    limiteRaw === '' || limiteRaw == null ? null : Number(limiteRaw);
  if (limite !== null && (!Number.isFinite(limite) || limite < 0)) {
    return NextResponse.json({ error: 'limite_atendimentos inválido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('planos')
    .insert({
      slug,
      nome,
      descricao,
      categoria,
      preco_normal: preco,
      limite_atendimentos: limite,
      duracao_dias: duracao,
      fundador,
      ativo,
      publico,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Slug já existe: ${slug}` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plano: data });
}
