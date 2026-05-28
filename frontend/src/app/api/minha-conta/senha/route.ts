import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const senhaAtual = body?.senha_atual?.toString() ?? '';
  const novaSenha = body?.nova_senha?.toString() ?? '';

  if (!senhaAtual || !novaSenha) {
    return NextResponse.json({ error: 'Senha atual e nova obrigatórias' }, { status: 400 });
  }
  if (novaSenha.length < 8) {
    return NextResponse.json({ error: 'Nova senha precisa ter ao menos 8 caracteres' }, { status: 400 });
  }
  if (senhaAtual === novaSenha) {
    return NextResponse.json({ error: 'A nova senha precisa ser diferente da atual' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, senha_hash')
    .eq('email', email)
    .maybeSingle();

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const confere = bcrypt.compareSync(senhaAtual, usuario.senha_hash);
  if (!confere) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
  }

  const novoHash = bcrypt.hashSync(novaSenha, 10);
  const { error: errUp } = await db
    .from('usuarios')
    .update({ senha_hash: novoHash })
    .eq('id', usuario.id);

  if (errUp) {
    return NextResponse.json({ error: errUp.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
