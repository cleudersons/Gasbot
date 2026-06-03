import { getSupabase } from '../lib/supabase';

// Cria notificação 'alerta' pra cada agência com Z-API desconectada que
// ainda não tem alerta ativo do tipo 'zapi_desconectada'. Quando a
// reconexão acontece, o próprio popup do dashboard marca como lida e
// fechamos o ciclo silenciosamente (próxima desconexão gera nova).
const INTERVAL_MS = 30 * 60 * 1000; // 30 min

async function processar(): Promise<void> {
  const db = getSupabase();

  const { data: desconectadas, error } = await db
    .from('agencias')
    .select('id, nome')
    .eq('provider', 'zapi')
    .eq('zapi_status', 'desconectado')
    .is('deletada_em', null);

  if (error) {
    console.error('[job:zapi-desconectada] erro ao listar:', error.message);
    return;
  }
  if (!desconectadas || desconectadas.length === 0) return;

  for (const ag of desconectadas) {
    try {
      // Já existe alerta ativo (não-lido e não-expirado) pra essa agência?
      const { data: existente } = await db
        .from('notificacoes')
        .select('id')
        .eq('agencia_id', ag.id)
        .eq('tipo', 'zapi_desconectada')
        .eq('lida', false)
        .gte('expira_em', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (existente) continue;

      const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await db.from('notificacoes').insert({
        agencia_id: ag.id,
        tipo: 'zapi_desconectada',
        categoria: 'alerta',
        titulo: 'Seu WhatsApp está desconectado',
        mensagem:
          'A conexão com o WhatsApp caiu. Leia o QR code de novo em Conexão pra voltar a atender automaticamente.',
        link: '/dashboard/conexao',
        expira_em: expiraEm,
      });
      console.log(`[job:zapi-desconectada] notificação criada pra ${ag.nome} (${ag.id})`);
    } catch (err: any) {
      console.error(`[job:zapi-desconectada] falha em ${ag.id}:`, err?.message ?? err);
    }
  }
}

setTimeout(() => {
  processar().catch((e) => console.error('[job:zapi-desconectada] erro inicial:', e));
}, 90_000);

setInterval(() => {
  processar().catch((e) => console.error('[job:zapi-desconectada] erro:', e));
}, INTERVAL_MS);
