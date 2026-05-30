import { NextResponse } from 'next/server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// Encaminha a request do simulador pro backend, que tem toda a lógica
// de IA/parser/distribuição. Frontend só autentica e roteia.
export async function POST(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  const message = body?.message;
  const history = Array.isArray(body?.history) ? body.history : [];

  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message obrigatória' }, { status: 400 });
  }

  const backendUrl =
    process.env.SUTOGAS_BACKEND_URL?.trim() ??
    'https://sutogas-backend-production.up.railway.app';
  const secret = process.env.SUTOGAS_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: 'SUTOGAS_WEBHOOK_SECRET não configurado no frontend' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${backendUrl}/internal/simulador-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify({ agenciaId, message, history }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error ?? `Backend retornou ${res.status}` },
        { status: res.status },
      );
    }
    return NextResponse.json(json);
  } catch (err: any) {
    console.error('[simular-chat] falha:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Falha de comunicação com backend' },
      { status: 502 },
    );
  }
}
