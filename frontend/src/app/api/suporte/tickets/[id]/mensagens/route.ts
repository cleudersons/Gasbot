import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { auth } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAgenciaId();
  if (isErrorResponse(guard)) return guard;
  const agenciaId = guard;

  const body = await req.json().catch(() => null);
  const mensagem = (body?.mensagem ?? '').toString().trim();
  if (!mensagem) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: ticket } = await db
    .from('tickets')
    .select('agencia_id, assunto, status')
    .eq('id', params.id)
    .maybeSingle();
  if (!ticket || ticket.agencia_id !== agenciaId) {
    return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  }
  if (ticket.status === 'fechado') {
    return NextResponse.json({ error: 'ticket fechado — abra um novo' }, { status: 400 });
  }

  const { error } = await db.from('ticket_mensagens').insert({
    ticket_id: params.id,
    autor: 'user',
    mensagem,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Volta status pra 'aberto' (esperando resposta do admin)
  await db.from('tickets').update({ status: 'aberto' }).eq('id', params.id);

  const session = await auth();
  const userName = session?.user?.name ?? 'Cliente';
  await db.from('admin_eventos').insert({
    tipo: 'ticket_mensagem',
    titulo: `Nova mensagem — ${ticket.assunto}`,
    descricao: `${userName} respondeu no ticket: "${mensagem.slice(0, 200)}${mensagem.length > 200 ? '...' : ''}"`,
    severidade: 'info',
    agencia_id: agenciaId,
    dados: { ticket_id: params.id },
  });

  return NextResponse.json({ ok: true });
}
