import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

// GET — lista respostas + nome da agência (join manual)
export async function GET(req: Request) {
  const ok = await requireMaster();
  if (isErrorResponse(ok)) return ok;

  const url = new URL(req.url);
  const satisfacao = url.searchParams.get('satisfacao');

  const db = supabaseAdmin();
  let q = db
    .from('fundador_feedback')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(200);
  if (satisfacao) q = q.eq('satisfacao', Number(satisfacao));

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Junta nome da agência
  const ids = Array.from(new Set((data ?? []).map((r) => r.agencia_id).filter(Boolean))) as string[];
  const nomes: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: ags } = await db.from('agencias').select('id, nome').in('id', ids);
    for (const a of ags ?? []) nomes[a.id] = a.nome ?? '';
  }

  return NextResponse.json({
    respostas: (data ?? []).map((r) => ({ ...r, agencia_nome: nomes[r.agencia_id ?? ''] ?? null })),
  });
}
