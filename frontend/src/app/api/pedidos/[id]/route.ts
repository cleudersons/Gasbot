import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

const VALID_STATUSES = new Set([
  'pendente',
  'aceito',
  'em_entrega',
  'entregue',
  'entregue_nao_confirmado',
  'cancelado',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .update({ status })
    .eq('id', params.id)
    .eq('agencia_id', agenciaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  return NextResponse.json({ pedido: data });
}
