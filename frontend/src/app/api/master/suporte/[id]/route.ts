import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const db = supabaseAdmin();
  const { data: ticket, error } = await db
    .from('tickets')
    .select('id, assunto, status, criado_em, atualizado_em, fechado_em, agencia_id, agencias(nome)')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!ticket) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const { data: mensagens } = await db
    .from('ticket_mensagens')
    .select('id, autor, mensagem, criado_em, lida')
    .eq('ticket_id', params.id)
    .order('criado_em', { ascending: true });

  // Marca mensagens do user como lidas (admin acabou de abrir)
  await db
    .from('ticket_mensagens')
    .update({ lida: true })
    .eq('ticket_id', params.id)
    .eq('autor', 'user')
    .eq('lida', false);

  return NextResponse.json({ ticket, mensagens: mensagens ?? [] });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!['aberto', 'respondido', 'fechado'].includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === 'fechado') updates.fechado_em = new Date().toISOString();
  else updates.fechado_em = null;

  const db = supabaseAdmin();
  const { error } = await db.from('tickets').update(updates).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
