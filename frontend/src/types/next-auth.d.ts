import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      agenciaId: string | null;
      isMaster: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    agenciaId?: string | null;
    isMaster?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    agenciaId?: string | null;
    isMaster?: boolean;
  }
}
