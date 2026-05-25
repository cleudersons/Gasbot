import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nome = (body?.nome ?? body?.nome_deposito ?? '').trim();
  const email = body?.email?.trim().toLowerCase();
  const whatsapp: string = (body?.whatsapp ?? '').toString().replace(/\D/g, '');
  const senha: string = body?.senha ?? '';

  if (!nome || !email || !senha) {
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
      nome: `Depósito de ${nome}`,
      plano: 'trial',
      status_conta: 'trial',
      provider: 'demo',
      trial_inicio: new Date().toISOString(),
      trial_atendimentos: 0,
      whatsapp_dono: whatsapp || null,
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

  // Registro silencioso no Sutofly Form (Mailrelay) — não bloqueia o cadastro
  if (whatsapp) {
    registrarNoSutoflyForm({ nome, email, whatsapp }).catch((err) => {
      console.error('[Mailrelay] Falha ao registrar lead:', err);
    });
  }

  return NextResponse.json({ ok: true, agencia_id: agencia.id });
}

async function registrarNoSutoflyForm(dados: { nome: string; email: string; whatsapp: string }) {
  const formId = process.env.NEXT_PUBLIC_SUTOFLY_FORM_ID ?? '6';
  const url =
    process.env.NEXT_PUBLIC_SUTOFLY_FORM_URL ?? 'https://pay.sutofly.com/form_submit.php';
  const body = new URLSearchParams({
    form_id: formId,
    nome: dados.nome,
    email: dados.email,
    whatsapp: dados.whatsapp,
  });
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}
