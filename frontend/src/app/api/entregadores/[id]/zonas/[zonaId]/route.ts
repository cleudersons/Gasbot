import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; zonaId: string } },
) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { error } = await supabaseAdmin()
    .from('entregador_zonas')
    .delete()
    .eq('id', params.zonaId)
    .eq('entregador_id', params.id)
    .eq('agencia_id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
