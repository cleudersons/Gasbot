import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = body?.token?.toString();
  const senha = body?.senha?.toString() ?? '';

  if (!token || !senha) {
    return NextResponse.json({ error: 'Token e senha obrigatórios' }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ error: 'Senha precisa ter ao menos 8 caracteres' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const agora = new Date().toISOString();

  const db = supabaseAdmin();
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, reset_token_expira_em')
    .eq('reset_token', tokenHash)
    .maybeSingle();

  if (!usuario) {
    return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 400 });
  }

  if (!usuario.reset_token_expira_em || usuario.reset_token_expira_em < agora) {
    return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 400 });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  const { error: errUp } = await db
    .from('usuarios')
    .update({
      senha_hash: senhaHash,
      reset_token: null,
      reset_token_expira_em: null,
    })
    .eq('id', usuario.id);

  if (errUp) {
    console.error('[redefinir-senha] erro ao salvar:', errUp);
    return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
