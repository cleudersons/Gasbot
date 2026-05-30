import { NextResponse } from 'next/server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Normaliza número BR pra formato 13 dígitos com 9 obrigatório (55 + DDD + 9 + 8).
// Aceita várias formas de entrada: com/sem 55, com/sem 9, com/sem formatação.
function normalizarWhatsappBR(raw: string): string {
  const d = raw.replace(/\D/g, '');
  // 13 dígitos com 9 → já normalizado
  if (d.startsWith('55') && d.length === 13 && d[4] === '9') return d;
  // 12 dígitos sem 9 → injeta 9 após DDD
  if (d.startsWith('55') && d.length === 12) return d.slice(0, 4) + '9' + d.slice(4);
  // 11 dígitos com 9 (sem prefixo 55) → adiciona 55
  if (d.length === 11 && d[2] === '9') return '55' + d;
  // 10 dígitos sem 9 (sem prefixo 55) → adiciona 55 + 9
  if (d.length === 10) return '55' + d.slice(0, 2) + '9' + d.slice(2);
  return d;
}

// Variantes pra busca de conflito — cobre dados antigos que possam estar em formato 12 dígitos.
function variantesBR(numero: string): string[] {
  const out = new Set<string>([numero]);
  if (numero.startsWith('55') && numero.length === 13 && numero[4] === '9') {
    out.add(numero.slice(0, 4) + numero.slice(5));
  }
  if (numero.startsWith('55') && numero.length === 12) {
    out.add(numero.slice(0, 4) + '9' + numero.slice(4));
  }
  return Array.from(out);
}

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

  // Sempre salva no formato 13 dígitos com 9 (BR), pra evitar duplicatas
  // silenciosas entre o mesmo aparelho gravado nos 2 formatos.
  const normalizado = normalizarWhatsappBR(candidato);

  // Conflito: busca pelas variantes pra cobrir registros antigos sem normalização
  const { data: conflito } = await db
    .from('agencias')
    .select('id, nome')
    .in('demo_cliente_whatsapp', variantesBR(normalizado))
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
    .update({ demo_cliente_whatsapp: normalizado })
    .eq('id', agenciaId);

  if (errUp) return NextResponse.json({ error: errUp.message }, { status: 500 });

  return NextResponse.json({ ok: true, demo_cliente_whatsapp: normalizado });
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
