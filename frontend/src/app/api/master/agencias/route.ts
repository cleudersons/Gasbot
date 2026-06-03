import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const db = supabaseAdmin();
  const { data: agencias, error } = await db
    .from('agencias')
    .select(
      'id, nome, plano, status_conta, whatsapp_dono, trial_inicio, vencimento_plano, inadimplente_desde, suspensa_em, zapi_instance_id, zapi_status, phone_number_id, provider, criado_em',
    )
    .is('deletada_em', null)
    .order('nome');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const rows = await Promise.all(
    (agencias ?? []).map(async (a) => {
      const { count } = await db
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('agencia_id', a.id)
        .gte('criado_em', inicioMes.toISOString());
      return { ...a, pedidos_mes: count ?? 0 };
    }),
  );

  return NextResponse.json({ agencias: rows });
}

export async function POST(req: Request) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const body = await req.json().catch(() => null);
  const nome = body?.nome?.trim();
  const plano = body?.plano ?? 'trial';
  const whatsapp_dono = body?.whatsapp_dono?.trim() || null;
  const email = body?.email?.trim().toLowerCase();
  const senha: string = body?.senha ?? '';

  if (!nome) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });
  if (!email || !senha) {
    return NextResponse.json({ error: 'email e senha obrigatórios' }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ error: 'Senha precisa ter ao menos 8 caracteres' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // E-mail já existe?
  const { data: existente } = await db
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 });
  }

  // 1) Criar agência
  const { data: agencia, error: errAg } = await db
    .from('agencias')
    .insert({
      nome,
      plano,
      status_conta: plano === 'trial' ? 'trial' : 'ativo',
      whatsapp_dono,
      trial_inicio: new Date().toISOString(),
    })
    .select()
    .single();

  if (errAg || !agencia) {
    return NextResponse.json({ error: errAg?.message ?? 'Erro ao criar agência' }, { status: 500 });
  }

  // 2) Criar usuário ligado
  const senhaHash = bcrypt.hashSync(senha, 10);
  const { error: errUser } = await db.from('usuarios').insert({
    email,
    senha_hash: senhaHash,
    nome,
    agencia_id: agencia.id,
    is_master: false,
    ativo: true,
  });

  if (errUser) {
    // rollback agência
    await db.from('agencias').delete().eq('id', agencia.id);
    return NextResponse.json({ error: errUser.message }, { status: 500 });
  }

  return NextResponse.json({ agencia, usuario: { email } });
}
