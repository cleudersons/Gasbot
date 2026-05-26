import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// GET — últimas 10 notificações da agência (não lidas primeiro).
export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const agora = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from('notificacoes')
    .select('id, tipo, categoria, titulo, mensagem, link, lida, criado_em, expira_em')
    .eq('agencia_id', agenciaId)
    .or(`expira_em.is.null,expira_em.gt.${agora}`)
    .order('lida', { ascending: true })
    .order('criado_em', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const naoLidas = (data ?? []).filter((n) => !n.lida).length;
  return NextResponse.json({ notificacoes: data ?? [], nao_lidas: naoLidas });
}
