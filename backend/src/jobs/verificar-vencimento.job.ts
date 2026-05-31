import { getSupabase } from '../lib/supabase';
import { enviarEmailCobrancaFalhou, enviarEmailContaSuspensa } from '../lib/email';
import { registrarEvento } from '../services/admin-agent.service';

// Roda 1x/dia. Faz duas varreduras:
//
// A) ativo + vencimento_plano expirado → marca inadimplente
//    (cobre o caso de Sutofly não ter webhook pagamento_falhou,
//    ou de uma cobrança simplesmente não tentar de novo).
//
// B) inadimplente há > 3 dias → suspende (status_conta='suspenso').
//    O webhook do WhatsApp já filtra status_conta='suspenso' em
//    backend/src/index.ts, então o agente para de atender sozinho.
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const DIAS_TOLERANCIA = 3;

async function buscarEmailDono(agenciaId: string): Promise<string | null> {
  const db = getSupabase();
  const { data } = await db
    .from('usuarios')
    .select('email')
    .eq('agencia_id', agenciaId)
    .eq('is_master', false)
    .eq('ativo', true)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.email ?? null;
}

async function marcarInadimplentesPorVencimento(): Promise<void> {
  const db = getSupabase();
  const agora = new Date();

  const { data: alvos, error } = await db
    .from('agencias')
    .select('id, nome, plano')
    .eq('status_conta', 'ativo')
    .is('inadimplente_desde', null)
    .not('vencimento_plano', 'is', null)
    .lt('vencimento_plano', agora.toISOString());

  if (error) {
    console.error('[job:verificar-vencimento] erro varredura A:', error.message);
    return;
  }
  if (!alvos || alvos.length === 0) return;

  for (const ag of alvos) {
    try {
      await db
        .from('agencias')
        .update({
          status_conta: 'inadimplente',
          inadimplente_desde: agora.toISOString(),
        })
        .eq('id', ag.id);

      const emailDono = await buscarEmailDono(ag.id);
      if (emailDono) {
        enviarEmailCobrancaFalhou({ to: emailDono, plano: ag.plano }).catch((err) => {
          console.error('[job:verificar-vencimento] falha email:', err?.message ?? err);
        });
      }
      registrarEvento({
        tipo: 'vencimento_expirado',
        titulo: 'Vencimento expirado — inadimplente',
        descricao: `${ag.nome}${emailDono ? ` (${emailDono})` : ''}`,
        severidade: 'aviso',
        agenciaId: ag.id,
      }).catch(() => {});

      console.log(`[job:verificar-vencimento] inadimplente: ${ag.id}`);
    } catch (err: any) {
      console.error(`[job:verificar-vencimento] falha A em ${ag.id}:`, err?.message ?? err);
    }
  }
}

async function suspenderAposTolerancia(): Promise<void> {
  const db = getSupabase();
  const agora = new Date();
  const corte = new Date(agora.getTime() - DIAS_TOLERANCIA * 24 * 60 * 60 * 1000);

  const { data: alvos, error } = await db
    .from('agencias')
    .select('id, nome')
    .eq('status_conta', 'inadimplente')
    .not('inadimplente_desde', 'is', null)
    .lt('inadimplente_desde', corte.toISOString());

  if (error) {
    console.error('[job:verificar-vencimento] erro varredura B:', error.message);
    return;
  }
  if (!alvos || alvos.length === 0) return;

  for (const ag of alvos) {
    try {
      await db
        .from('agencias')
        .update({
          status_conta: 'suspenso',
          suspensa_em: agora.toISOString(),
        })
        .eq('id', ag.id);

      const emailDono = await buscarEmailDono(ag.id);
      if (emailDono) {
        enviarEmailContaSuspensa({ to: emailDono }).catch((err) => {
          console.error('[job:verificar-vencimento] falha email suspensao:', err?.message ?? err);
        });
      }
      registrarEvento({
        tipo: 'agencia_suspensa',
        titulo: 'Agência suspensa por inadimplência',
        descricao: `${ag.nome}${emailDono ? ` (${emailDono})` : ''}`,
        severidade: 'critico',
        agenciaId: ag.id,
      }).catch(() => {});

      console.log(`[job:verificar-vencimento] suspensa: ${ag.id}`);
    } catch (err: any) {
      console.error(`[job:verificar-vencimento] falha B em ${ag.id}:`, err?.message ?? err);
    }
  }
}

async function processar(): Promise<void> {
  await marcarInadimplentesPorVencimento();
  await suspenderAposTolerancia();
}

processar().catch((e) => console.error('[job:verificar-vencimento] erro inicial:', e));
setInterval(() => {
  processar().catch((e) => console.error('[job:verificar-vencimento] erro:', e));
}, INTERVAL_MS);
