import { getSupabase } from '../lib/supabase';
import * as whatsappService from '../services/whatsapp/whatsapp.service';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

const MENSAGEM_PADRAO =
  'Olá! 👋 Faz 30 dias desde seu último pedido de gás.\n' +
  'Está precisando reabastecer? É só responder aqui! 😊';

/** Lembretes agendados explicitamente pelo cliente. */
async function processarAgendados(): Promise<void> {
  const agora = new Date().toISOString();
  const db = getSupabase();

  const { data: lembretes, error } = await db
    .from('lembretes')
    .select('id, agencia_id, cliente_whatsapp, dias_escolhidos')
    .eq('enviado', false)
    .lte('enviar_em', agora);

  if (error) {
    console.error('[job:lembrete] erro ao buscar agendados:', error.message);
    return;
  }

  for (const l of lembretes ?? []) {
    const dias = l.dias_escolhidos ?? 30;
    const msg =
      `Olá! 👋 Faz ${dias} dias desde seu último pedido de gás.\n` +
      `Está precisando reabastecer? É só responder aqui! 😊`;
    try {
      await whatsappService.sendMessage(l.agencia_id, l.cliente_whatsapp, msg);
      await db
        .from('lembretes')
        .update({ enviado: true, enviado_em: new Date().toISOString() })
        .eq('id', l.id);
      console.log(`[job] Lembrete ${l.id} enviado para ${l.cliente_whatsapp}`);
    } catch (err: any) {
      console.error(`[job:lembrete] falha em ${l.id}:`, err?.message ?? err);
    }
  }
}

/**
 * Preditivo: clientes recorrentes que estão chegando perto do prazo
 * mas ainda não pediram nem têm lembrete pendente.
 */
async function processarPreditivos(): Promise<void> {
  const db = getSupabase();

  const { data: clientes, error } = await db
    .from('clientes')
    .select('agencia_id, whatsapp, dias_recarga, total_pedidos, ultimo_pedido, produto_preferido, endereco_preferido')
    .gte('total_pedidos', 2)
    .not('ultimo_pedido', 'is', null);

  if (error) {
    console.error('[job:lembrete preditivo] erro ao buscar:', error.message);
    return;
  }

  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;

  for (const c of clientes ?? []) {
    const ultimo = new Date(c.ultimo_pedido!).getTime();
    const dueAt = ultimo + (c.dias_recarga ?? 30) * umDia;
    if (dueAt > agora + umDia) continue; // ainda longe do prazo

    // já existe lembrete pendente?
    const { data: pendente } = await db
      .from('lembretes')
      .select('id')
      .eq('agencia_id', c.agencia_id)
      .eq('cliente_whatsapp', c.whatsapp)
      .eq('enviado', false)
      .limit(1)
      .maybeSingle();
    if (pendente) continue;

    // já mandamos um preditivo recente? (lembrete enviado nas últimas 24h)
    const ontem = new Date(agora - umDia).toISOString();
    const { data: recente } = await db
      .from('lembretes')
      .select('id')
      .eq('agencia_id', c.agencia_id)
      .eq('cliente_whatsapp', c.whatsapp)
      .eq('enviado', true)
      .gte('enviado_em', ontem)
      .limit(1)
      .maybeSingle();
    if (recente) continue;

    const dias = Math.floor((agora - ultimo) / umDia);
    const prod = c.produto_preferido ?? 'gás';
    const end = c.endereco_preferido ?? null;

    const msg = end
      ? `Oi! 👋 Faz ${dias} dias desde seu último pedido de ${prod}. Que tal reabastecer?\n` +
        `Posso pedir um ${prod} para ${end}? É só responder Sim! 😊`
      : `Oi! 👋 Faz ${dias} dias desde seu último pedido de ${prod}. Que tal reabastecer?\n` +
        `É só responder aqui! 😊`;

    try {
      await whatsappService.sendMessage(c.agencia_id, c.whatsapp, msg);
      await db.from('lembretes').insert({
        agencia_id: c.agencia_id,
        cliente_whatsapp: c.whatsapp,
        enviar_em: new Date().toISOString(),
        enviado: true,
        enviado_em: new Date().toISOString(),
        dias_escolhidos: c.dias_recarga ?? 30,
      });
      console.log(`[job] Lembrete preditivo enviado para ${c.whatsapp}`);
    } catch (err: any) {
      // Z-API/Meta desconectado é caso esperado quando o cliente parou de pagar
      // ou ainda não conectou. Log silencioso pra não poluir.
      const msg = err?.response?.data?.error ?? err?.message ?? String(err);
      const ehDesconectado =
        msg.includes('disconnected') ||
        msg.includes('Enqueue message is disabled') ||
        err?.response?.status === 400;
      if (ehDesconectado) {
        console.warn(`[job:preditivo] pulando ${c.whatsapp} (WhatsApp desconectado na agência)`);
      } else {
        console.error(`[job:preditivo] falha em ${c.whatsapp}:`, msg);
      }
    }
  }
}

async function tick(): Promise<void> {
  await processarAgendados();
  await processarPreditivos();
}

let started = false;
export function startLembreteJob(): void {
  if (started) return;
  started = true;
  console.log('[job] Job de lembretes iniciado (agendados + preditivo, cada 1h)');
  tick().catch((e) => console.error('[job:lembrete]', e));
  setInterval(() => {
    tick().catch((e) => console.error('[job:lembrete]', e));
  }, INTERVAL_MS);
}

// Mantém compatibilidade — o `_unused` impede que TS reclame.
void MENSAGEM_PADRAO;

startLembreteJob();
