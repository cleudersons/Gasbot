import { NextResponse } from 'next/server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data, error } = await supabaseAdmin()
    .from('agencias')
    .select('whatsapp_dono, demo_cliente_whatsapp')
    .eq('id', agenciaId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? {});
}

export async function POST(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => ({}));
  const usarDono = !!body?.usar_whatsapp_dono;
  let candidato: string | null = null;

  const db = supabaseAdmin();

  if (usarDono) {
    const { data: ag } = await db
      .from('agencias')
      .select('whatsapp_dono')
      .eq('id', agenciaId)
      .maybeSingle();
    candidato = ag?.whatsapp_dono ?? null;
    if (!candidato) {
      return NextResponse.json(
        { error: 'WhatsApp do dono não está cadastrado. Edite seu perfil primeiro.' },
        { status: 400 },
      );
    }
  } else {
    const raw = (body?.whatsapp ?? '').toString();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      return NextResponse.json({ error: 'WhatsApp inválido (mínimo 10 dígitos).' }, { status: 400 });
    }
    candidato = digits;
  }

  if (!candidato) {
    return NextResponse.json({ error: 'WhatsApp obrigatório.' }, { status: 400 });
  }

  // Conflito: outra agência já usa esse celular como demo
  const { data: conflito } = await db
    .from('agencias')
    .select('id, nome')
    .eq('demo_cliente_whatsapp', candidato)
    .neq('id', agenciaId)
    .maybeSingle();
  if (conflito) {
    return NextResponse.json(
      {
        error:
          'Esse número já está vinculado a outra conta de testes. Use outro número ou peça pro suporte liberar.',
      },
      { status: 409 },
    );
  }

  const { error: errUp } = await db
    .from('agencias')
    .update({ demo_cliente_whatsapp: candidato })
    .eq('id', agenciaId);

  if (errUp) return NextResponse.json({ error: errUp.message }, { status: 500 });

  return NextResponse.json({ ok: true, demo_cliente_whatsapp: candidato });
}

export async function DELETE() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({ demo_cliente_whatsapp: null })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
