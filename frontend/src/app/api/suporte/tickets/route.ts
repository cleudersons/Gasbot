import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { auth } from '@/lib/auth';

export async function GET() {
  const guard = await requireAgenciaId();
  if (isErrorResponse(guard)) return guard;
  const agenciaId = guard;

  const db = supabaseAdmin();
  const { data: tickets, error } = await db
    .from('tickets')
    .select('id, assunto, status, criado_em, atualizado_em, fechado_em')
    .eq('agencia_id', agenciaId)
    .order('atualizado_em', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Conta não-lidas (mensagens do admin que o user ainda não leu) por ticket
  const ids = (tickets ?? []).map((t) => t.id);
  const naoLidasPorTicket: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: msgs } = await db
      .from('ticket_mensagens')
      .select('ticket_id')
      .in('ticket_id', ids)
      .eq('autor', 'admin')
      .eq('lida', false);
    for (const m of msgs ?? []) {
      naoLidasPorTicket[m.ticket_id] = (naoLidasPorTicket[m.ticket_id] ?? 0) + 1;
    }
  }

  const rows = (tickets ?? []).map((t) => ({
    ...t,
    nao_lidas: naoLidasPorTicket[t.id] ?? 0,
  }));
  const totalNaoLidas = Object.values(naoLidasPorTicket).reduce((a, b) => a + b, 0);

  return NextResponse.json({ tickets: rows, total_nao_lidas: totalNaoLidas });
}

export async function POST(req: Request) {
  const guard = await requireAgenciaId();
  if (isErrorResponse(guard)) return guard;
  const agenciaId = guard;

  const body = await req.json().catch(() => null);
  const assunto = (body?.assunto ?? '').toString().trim();
  const mensagem = (body?.mensagem ?? '').toString().trim();

  if (!assunto || !mensagem) {
    return NextResponse.json({ error: 'assunto e mensagem obrigatórios' }, { status: 400 });
  }
  if (assunto.length > 120) {
    return NextResponse.json({ error: 'assunto longo demais (máx 120)' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: ticket, error: errT } = await db
    .from('tickets')
    .insert({ agencia_id: agenciaId, assunto, status: 'aberto' })
    .select('id')
    .single();
  if (errT || !ticket) {
    return NextResponse.json({ error: errT?.message ?? 'erro ao criar ticket' }, { status: 500 });
  }

  const { error: errM } = await db.from('ticket_mensagens').insert({
    ticket_id: ticket.id,
    autor: 'user',
    mensagem,
  });
  if (errM) return NextResponse.json({ error: errM.message }, { status: 500 });

  // Inbox do gerente
  const session = await auth();
  const userName = session?.user?.name ?? 'Cliente';
  await db.from('admin_eventos').insert({
    tipo: 'ticket_novo',
    titulo: `Novo ticket — ${assunto}`,
    descricao: `${userName} abriu um ticket: "${mensagem.slice(0, 200)}${mensagem.length > 200 ? '...' : ''}"`,
    severidade: 'info',
    agencia_id: agenciaId,
    dados: { ticket_id: ticket.id },
  });

  return NextResponse.json({ ticket_id: ticket.id });
}
