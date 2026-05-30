import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';
import { enviarEmailBoasVindasComSenha } from '@/lib/email';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nome = (body?.nome ?? body?.nome_deposito ?? '').trim();
  const email = body?.email?.trim().toLowerCase();
  const whatsapp: string = (body?.whatsapp ?? '').toString().replace(/\D/g, '');
  const senhaInformada: string = (body?.senha ?? '').toString();

  if (!nome || !email) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  // Se senha veio (fluxo do /cadastro), valida tamanho. Se não veio (fluxo da landing),
  // gera senha temporária e enviaremos por email após criar a conta.
  let senha = senhaInformada;
  const gerouSenha = !senha;
  if (senha && senha.length < 8) {
    return NextResponse.json({ error: 'Senha precisa ter ao menos 8 caracteres' }, { status: 400 });
  }
  if (!senha) {
    senha = Math.random().toString(36).slice(-10);
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

  // Senha auto-gerada (fluxo da landing): dispara email com credenciais
  if (gerouSenha) {
    enviarEmailBoasVindasComSenha({ to: email, senhaTemporaria: senha }).catch((err) => {
      console.error('[email] Falha ao enviar boas-vindas:', err);
    });
  }

  // Notifica o admin via WhatsApp (não bloqueia o cadastro se falhar)
  notificarAdminCadastro({
    nome,
    email,
    whatsapp: whatsapp || null,
    agenciaId: agencia.id,
  }).catch((err) => {
    console.error('[admin] Falha ao notificar:', err);
  });

  return NextResponse.json({
    ok: true,
    agencia_id: agencia.id,
    // Senha vai no JSON só pra client logar automaticamente (same-origin HTTPS).
    senha_temporaria: gerouSenha ? senha : undefined,
  });
}

async function notificarAdminCadastro(dados: {
  nome: string;
  email: string;
  whatsapp: string | null;
  agenciaId: string;
}) {
  const backendUrl =
    process.env.SUTOGAS_BACKEND_URL?.trim() ??
    'https://sutogas-backend-production.up.railway.app';
  const secret = process.env.SUTOGAS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn('[admin] SUTOGAS_WEBHOOK_SECRET ausente no frontend');
    return;
  }
  await fetch(`${backendUrl}/internal/admin-notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': secret,
    },
    body: JSON.stringify({
      tipo: 'novo_cadastro',
      origem: 'trial',
      nome: dados.nome,
      email: dados.email,
      whatsapp: dados.whatsapp,
      plano: 'trial',
      agenciaId: dados.agenciaId,
    }),
  });
}

async function registrarNoSutoflyForm(dados: { nome: string; email: string; whatsapp: string }) {
  const formId = process.env.NEXT_PUBLIC_SUTOFLY_FORM_ID ?? '6';
  const url =
    process.env.NEXT_PUBLIC_SUTOFLY_FORM_URL ?? 'https://pay.sutofly.com/form_submit.php';

  // IDs dos campos da tabela formulario_campos (no banco da Sutofly).
  // Para form_id=6: nome=245, email=246, whatsapp=247.
  const idNome = process.env.SUTOFLY_CAMPO_NOME_ID ?? '245';
  const idEmail = process.env.SUTOFLY_CAMPO_EMAIL_ID ?? '246';
  const idWhats = process.env.SUTOFLY_CAMPO_WHATSAPP_ID ?? '247';

  const body = new URLSearchParams();
  body.append('formulario_id', formId);
  body.append(`campo[${idNome}]`, dados.nome);
  body.append(`campo[${idEmail}]`, dados.email);
  body.append(`campo[${idWhats}]`, dados.whatsapp);

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'manual', // form_submit.php redireciona pra form_embed; não seguimos
  });
}
