// Edge-safe: sem bcrypt, sem supabase. Apenas options/callbacks puros.
export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [], // providers reais ficam em auth.ts
  callbacks: {
    authorized({ auth, request }: { auth: any; request: any }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      if (path.startsWith('/master')) {
        return isLoggedIn && !!auth?.user?.isMaster;
      }
      if (path.startsWith('/dashboard')) return isLoggedIn;
      return true;
    },
    jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.agenciaId = user.agenciaId ?? null;
        token.isMaster = !!user.isMaster;
      }
      return token;
    },
    session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.agenciaId = token.agenciaId ?? null;
        session.user.isMaster = !!token.isMaster;
      }
      return session;
    },
  },
};
