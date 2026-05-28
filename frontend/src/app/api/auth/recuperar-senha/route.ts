import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';
import { enviarEmailRedefinirSenha } from '@/lib/email';

const MENSAGEM_GENERICA = {
  ok: true,
  mensagem: 'Se este email estiver cadastrado, enviaremos um link de redefinição.',
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
  }

  // Sempre responde a mesma coisa (anti-enumeração de emails)
  const db = supabaseAdmin();
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, email, ativo')
    .eq('email', email)
    .maybeSingle();

  if (!usuario || !usuario.ativo) {
    return NextResponse.json(MENSAGEM_GENERICA);
  }

  // Gera token cru (vai no email) e guarda só o hash no banco
  const tokenCru = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenCru).digest('hex');
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1h

  const { error: errUpdate } = await db
    .from('usuarios')
    .update({
      reset_token: tokenHash,
      reset_token_expira_em: expiraEm,
    })
    .eq('id', usuario.id);

  if (errUpdate) {
    console.error('[recuperar-senha] erro ao salvar token:', errUpdate);
    return NextResponse.json(MENSAGEM_GENERICA); // não revela o erro
  }

  const appUrl = process.env.APP_URL?.trim() ?? 'https://sutogas.com.br';
  const link = `${appUrl}/redefinir-senha?token=${tokenCru}`;

  // Não bloqueia a resposta — dispara e responde
  enviarEmailRedefinirSenha({ to: usuario.email, link }).catch((err) => {
    console.error('[recuperar-senha] falha no envio:', err);
  });

  return NextResponse.json(MENSAGEM_GENERICA);
}
