import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nomeDeposito = body?.nome_deposito?.trim();
  const email = body?.email?.trim().toLowerCase();
  const senha: string = body?.senha ?? '';

  if (!nomeDeposito || !email || !senha) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ error: 'Senha precisa ter ao menos 8 caracteres' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // E-mail duplicado?
  const { data: existente } = await db
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 });
  }

  // 1) Criar agência em modo trial
  const { data: agencia, error: errAg } = await db
    .from('agencias')
    .insert({
      nome: nomeDeposito,
      plano: 'trial',
      status_conta: 'trial',
      provider: 'demo',
      trial_inicio: new Date().toISOString(),
      trial_atendimentos: 0,
    })
    .select('id')
    .single();

  if (errAg || !agencia) {
    return NextResponse.json(
      { error: errAg?.message ?? 'Erro ao criar agência' },
      { status: 500 },
    );
  }

  // 2) Criar usuário ligado à agência
  const senhaHash = bcrypt.hashSync(senha, 10);
  const { error: errUser } = await db.from('usuarios').insert({
    email,
    senha_hash: senhaHash,
    nome: nomeDeposito,
    agencia_id: agencia.id,
    is_master: false,
    ativo: true,
  });

  if (errUser) {
    // rollback agência
    await db.from('agencias').delete().eq('id', agencia.id);
    return NextResponse.json({ error: errUser.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, agencia_id: agencia.id });
}
