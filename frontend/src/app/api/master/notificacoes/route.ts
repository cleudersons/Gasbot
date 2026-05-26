import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

// GET — lista campanhas + envios/lidas agregados
export async function GET() {
  const ok = await requireMaster();
  if (isErrorResponse(ok)) return ok;

  const db = supabaseAdmin();
  const { data: campanhas, error } = await db
    .from('notificacao_campanhas')
    .select('*')
    .order('criada_em', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // contagem de lidas por campanha
  const ids = (campanhas ?? []).map((c) => c.id);
  const lidasPorCampanha: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: lidas } = await db
      .from('notificacoes')
      .select('campanha_id, lida')
      .in('campanha_id', ids);
    for (const n of lidas ?? []) {
      if (!n.campanha_id) continue;
      if (n.lida) lidasPorCampanha[n.campanha_id] = (lidasPorCampanha[n.campanha_id] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    campanhas: (campanhas ?? []).map((c) => ({
      ...c,
      total_lidas: lidasPorCampanha[c.id] ?? 0,
    })),
  });
}

// POST — cria campanha e faz fan-out nas notificacoes das agências alvo
interface Body {
  categoria: 'promocao' | 'aviso' | 'alerta' | 'sistema';
  titulo: string;
  mensagem?: string;
  link?: string;
  alvo_plano?: string | null;   // 'basico'|'pro'|'trial' ou null
  alvo_fundador: 'todos' | 'fundador' | 'nao_fundador';
}

export async function POST(req: Request) {
  const ok = await requireMaster();
  if (isErrorResponse(ok)) return ok;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.titulo || !body.categoria) {
    return NextResponse.json({ error: 'titulo e categoria obrigatórios' }, { status: 400 });
  }

  const expiraEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const db = supabaseAdmin();

  // Filtra agências alvo
  let q = db.from('agencias').select('id').neq('status_conta', 'cancelado');
  if (body.alvo_plano) q = q.eq('plano', body.alvo_plano);
  if (body.alvo_fundador === 'fundador') q = q.eq('programa_fundador', true);
  if (body.alvo_fundador === 'nao_fundador') q = q.eq('programa_fundador', false);

  const { data: agencias, error: errAg } = await q;
  if (errAg) return NextResponse.json({ error: errAg.message }, { status: 500 });
  const ids = (agencias ?? []).map((a) => a.id);

  // Cria campanha
  const { data: camp, error: errCamp } = await db
    .from('notificacao_campanhas')
    .insert({
      categoria: body.categoria,
      titulo: body.titulo,
      mensagem: body.mensagem ?? null,
      link: body.link ?? null,
      alvo_plano: body.alvo_plano ?? null,
      alvo_fundador: body.alvo_fundador,
      expira_em: expiraEm,
      total_envios: ids.length,
    })
    .select('*')
    .single();

  if (errCamp || !camp) {
    return NextResponse.json({ error: errCamp?.message ?? 'erro ao criar' }, { status: 500 });
  }

  // Fan-out
  if (ids.length > 0) {
    const rows = ids.map((agencia_id) => ({
      agencia_id,
      tipo: body.categoria,
      categoria: body.categoria,
      titulo: body.titulo,
      mensagem: body.mensagem ?? null,
      link: body.link ?? null,
      expira_em: expiraEm,
      campanha_id: camp.id,
    }));
    const { error: errFan } = await db.from('notificacoes').insert(rows);
    if (errFan) console.error('[notificacoes] fan-out parcial:', errFan.message);
  }

  return NextResponse.json({ ok: true, campanha: camp, total_envios: ids.length });
}
