import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

export async function POST(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  const phoneNumberId = body?.phone_number_id?.trim();
  const token = body?.whatsapp_token?.trim();

  if (!phoneNumberId || !token) {
    return NextResponse.json({ error: 'phone_number_id e whatsapp_token são obrigatórios' }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({
      provider: 'meta',
      phone_number_id: phoneNumberId,
      whatsapp_token: token,
    })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
