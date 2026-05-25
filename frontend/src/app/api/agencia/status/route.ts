import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const session = await auth();
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;
  if (!agenciaId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin()
    .from('agencias')
    .select('plano, status_conta, programa_fundador, vencimento_plano')
    .eq('id', agenciaId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? {});
}
