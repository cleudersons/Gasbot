import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireMaster, isErrorResponse } from '@/lib/auth-server';
import { enviarEmailRespostaSuporte } from '@/lib/email';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireMaster();
  if (isErrorResponse(guard)) return guard;

  const body = await req.json().catch(() => null);
  const mensagem = (body?.mensagem ?? '').toString().trim();
  if (!mensagem) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: ticket } = await db
    .from('tickets')
    .select('id, assunto, agencia_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const { error } = await db.from('ticket_mensagens').insert({
    ticket_id: params.id,
    autor: 'admin',
    mensagem,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from('tickets').update({ status: 'respondido' }).eq('id', params.id);

  // Email pro cliente (primeiro usuário da agência)
  const { data: u } = await db
    .from('usuarios')
    .select('email')
    .eq('agencia_id', ticket.agencia_id)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (u?.email) {
    enviarEmailRespostaSuporte({
      to: u.email,
      assunto: ticket.assunto,
      mensagem,
      ticketId: ticket.id,
    }).catch((err) => console.error('[suporte] email falhou:', err?.message ?? err));
  }

  return NextResponse.json({ ok: true });
}
