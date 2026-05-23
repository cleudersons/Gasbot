import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase-server';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const { data: usuario, error } = await supabaseAdmin()
          .from('usuarios')
          .select('id, email, nome, senha_hash, agencia_id, is_master, ativo')
          .eq('email', email)
          .maybeSingle();

        if (error || !usuario || !usuario.ativo) return null;

        const ok = await bcrypt.compare(password, usuario.senha_hash);
        if (!ok) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome ?? usuario.email,
          agenciaId: usuario.agencia_id,
          isMaster: !!usuario.is_master,
        } as any;
      },
    }),
  ],
});
