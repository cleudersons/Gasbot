import { getSupabase } from '../lib/supabase';
import * as whatsappService from '../services/whatsapp/whatsapp.service';

// Envia "bom dia" 10 min antes do expediente do entregador começar.
// Objetivo: o entregador responde "to pronto" e a janela de 24h da Meta
// Cloud API reabre, garantindo que ele receba todos os pedidos do dia.
// Só dispara para agências em provider='meta' (Z-API não tem essa limitação).

const INTERVAL_MS = 60 * 1000; // 1 min — precisão de minuto
const MINUTOS_ANTES = 10;

function minutosLocal(tz: string | null | undefined): number {
  try {
    const zona = tz && tz.trim().length > 0 ? tz : 'America/Sao_Paulo';
    const fmt = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: zona,
    }).format(new Date());
    const [h, m] = fmt.split(':').map((x) => parseInt(x, 10));
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

function dataLocal(tz: string | null | undefined): string {
  try {
    const zona = tz && tz.trim().length > 0 ? tz : 'America/Sao_Paulo';
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: zona,
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function horarioParaMinutos(time: string): number | null {
  // 'HH:MM' ou 'HH:MM:SS' → minutos desde 00:00
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function processar(): Promise<void> {
  const db = getSupabase();

  const { data: agencias, error } = await db
    .from('agencias')
    .select('id, timezone, agente_ativo')
    .eq('provider', 'meta')
    .eq('agente_ativo', true);

  if (error) {
    console.error('[job:lembrete-inicio] erro ao buscar agências:', error.message);
    return;
  }
  if (!agencias || agencias.length === 0) return;

  for (const ag of agencias) {
    const minLocal = minutosLocal(ag.timezone);
    const hojeLocal = dataLocal(ag.timezone);

    const { data: entregadores } = await db
      .from('entregadores')
      .select('id, nome, whatsapp, expediente_inicio, lembrete_inicio_enviado_em')
      .eq('agencia_id', ag.id)
      .eq('ativo', true)
      .not('expediente_inicio', 'is', null);

    if (!entregadores || entregadores.length === 0) continue;

    for (const e of entregadores) {
      if (!e.whatsapp || !e.expediente_inicio) continue;

      const inicioMin = horarioParaMinutos(e.expediente_inicio as string);
      if (inicioMin == null) continue;

      const alvoMin = (inicioMin - MINUTOS_ANTES + 24 * 60) % (24 * 60);
      if (minLocal !== alvoMin) continue;

      // Já enviou hoje?
      if (e.lembrete_inicio_enviado_em) {
        const dataUltimo = dataLocal(ag.timezone) ===
          new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: ag.timezone ?? 'America/Sao_Paulo',
          }).format(new Date(e.lembrete_inicio_enviado_em));
        if (dataUltimo) continue;
      }

      const primeiroNome = (e.nome ?? '').split(/\s+/)[0] || 'entregador';
      const msg =
        `Oi ${primeiroNome}! Pronto pra começar o dia? 🛵\n\n` +
        `Me manda *"to pronto"* (ou qualquer mensagem) quando estiver apto a receber pedidos. ` +
        `Isso me deixa saber que você está online.`;

      try {
        await whatsappService.sendMessage(ag.id, e.whatsapp, msg);
        await db
          .from('entregadores')
          .update({ lembrete_inicio_enviado_em: new Date().toISOString() })
          .eq('id', e.id);
        console.log(
          `[job:lembrete-inicio] enviado pra ${e.nome} (agência ${ag.id}, expediente ${e.expediente_inicio})`,
        );
      } catch (err: any) {
        console.error(
          `[job:lembrete-inicio] falha pra ${e.id} (${e.nome}):`,
          err?.message ?? err,
        );
      }
    }
  }
}

processar().catch((e) => console.error('[job:lembrete-inicio] erro inicial:', e));
setInterval(() => {
  processar().catch((e) => console.error('[job:lembrete-inicio] erro:', e));
}, INTERVAL_MS);
