import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const session = await auth();
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;
  if (!agenciaId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const oferta: string | undefined = body?.oferta;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;
  const userAgent = req.headers.get('user-agent') ?? null;

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({
      fundador_termo_aceito_em: new Date().toISOString(),
      fundador_termo_aceito_ip: ip,
      fundador_termo_user_agent: userAgent,
      fundador_termo_oferta: oferta ?? null,
    })
    .eq('id', agenciaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
