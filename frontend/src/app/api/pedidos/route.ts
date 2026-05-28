import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const db = supabaseAdmin();
  const [{ data: pedidos, error }, { data: entregadores }] = await Promise.all([
    db.from('pedidos').select('*').eq('agencia_id', agenciaId).order('criado_em', { ascending: false }),
    db.from('entregadores').select('id, nome').eq('agencia_id', agenciaId),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nomePorId = new Map<string, string>(
    (entregadores ?? []).map((e: any) => [e.id, e.nome as string]),
  );

  const enriquecidos = (pedidos ?? []).map((p: any) => ({
    ...p,
    rejeitado_por_nomes: (p.rejeitado_por ?? [])
      .map((id: string) => nomePorId.get(id))
      .filter(Boolean) as string[],
  }));

  return NextResponse.json({ pedidos: enriquecidos });
}
