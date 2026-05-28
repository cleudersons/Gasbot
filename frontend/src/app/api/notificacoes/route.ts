import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { perfilCompleto } from '@/lib/perfil';

// GET — últimas 10 notificações da agência (não lidas primeiro).
// Injeta notificação virtual "Complete seu perfil" no topo se perfil incompleto.
export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const db = supabaseAdmin();
  const agora = new Date().toISOString();

  const [{ data, error }, { data: ag }] = await Promise.all([
    db
      .from('notificacoes')
      .select('id, tipo, categoria, titulo, mensagem, link, lida, criado_em, expira_em')
      .eq('agencia_id', agenciaId)
      .or(`expira_em.is.null,expira_em.gt.${agora}`)
      .order('lida', { ascending: true })
      .order('criado_em', { ascending: false })
      .limit(10),
    db
      .from('agencias')
      .select('nome_deposito, cidade, estado, cpf_cnpj')
      .eq('id', agenciaId)
      .maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lista: any[] = data ?? [];

  if (!perfilCompleto(ag)) {
    lista.unshift({
      id: 'virtual-perfil-incompleto',
      tipo: 'perfil_incompleto',
      categoria: 'aviso',
      titulo: 'Complete seu perfil',
      mensagem: 'Cadastre nome do depósito, cidade, estado e CPF/CNPJ.',
      link: '/dashboard/minha-conta',
      lida: false,
      criado_em: new Date().toISOString(),
    });
  }

  const naoLidas = lista.filter((n) => !n.lida).length;
  return NextResponse.json({ notificacoes: lista, nao_lidas: naoLidas });
}
