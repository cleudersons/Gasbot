import { NextResponse } from 'next/server';
import { auth } from './auth';

/**
 * Retorna a agência da sessão. Em rotas onde o usuário precisa estar logado
 * e ligado a uma agência, lança 401 caso contrário.
 */
export async function requireAgenciaId(): Promise<string | NextResponse> {
  const session = await auth();
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;
  if (!session?.user || !agenciaId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  return agenciaId;
}

export async function requireMaster(): Promise<true | NextResponse> {
  const session = await auth();
  if (!session?.user || !(session.user as any).isMaster) {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }
  return true;
}

export function isErrorResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
