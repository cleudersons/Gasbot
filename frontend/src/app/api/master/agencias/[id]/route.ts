import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

const ALLOWED_FIELDS = new Set([
  'plano',
  'status_conta',
  'provider',
  'zapi_instance_id',
  'zapi_token',
  'zapi_client_token',
  'phone_number_id',
  'whatsapp_token',
  'whatsapp_dono',
  'nome',
  'prompt_customizado',
  'relatorio_frequencia',
  'agente_ativo',
]);

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const db = supabaseAdmin();

  const { data: agencia, error } = await db.from('agencias').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: pedidos } = await db
    .from('pedidos')
    .select('id, produto, quantidade, endereco, status, criado_em')
    .eq('agencia_id', params.id)
    .order('criado_em', { ascending: false })
    .limit(10);

  const hojeStart = new Date();
  hojeStart.setHours(0, 0, 0, 0);
  const mesStart = new Date();
  mesStart.setDate(1);
  mesStart.setHours(0, 0, 0, 0);

  const [{ count: hoje }, { count: mes }, { count: entregadoresAtivos }] = await Promise.all([
    db.from('pedidos').select('id', { count: 'exact', head: true })
      .eq('agencia_id', params.id).gte('criado_em', hojeStart.toISOString()),
    db.from('pedidos').select('id', { count: 'exact', head: true })
      .eq('agencia_id', params.id).gte('criado_em', mesStart.toISOString()),
    db.from('entregadores').select('id', { count: 'exact', head: true })
      .eq('agencia_id', params.id).eq('ativo', true),
  ]);

  return NextResponse.json({
    agencia,
    pedidos: pedidos ?? [],
    metricas: {
      hoje: hoje ?? 0,
      mes: mes ?? 0,
      entregadores_ativos: entregadoresAtivos ?? 0,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'body inválido' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nenhum campo válido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('agencias')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agencia: data });
}
