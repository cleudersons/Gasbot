import { getSupabase } from '../lib/supabase';
import { enviarRelatorio } from '../services/relatorio.service';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

function isUltimoDiaDoMes(d: Date): boolean {
  const next = new Date(d);
  next.setDate(d.getDate() + 1);
  return next.getMonth() !== d.getMonth();
}

function deveEnviar(freq: string, agora: Date): boolean {
  if (agora.getHours() !== 20) return false;
  if (freq === 'diario') return true;
  if (freq === 'semanal') return agora.getDay() === 0; // domingo
  if (freq === 'mensal') return isUltimoDiaDoMes(agora);
  if (freq === 'todos') return true; // dispara checagem; o relatório envia diário/semanal/mensal conforme dia
  return false;
}

async function tick(): Promise<void> {
  const agora = new Date();
  if (agora.getHours() !== 20) return; // só age na janela das 20h

  const { data: agencias, error } = await getSupabase()
    .from('agencias')
    .select('id, relatorio_frequencia, relatorio_ultimo_envio, whatsapp_dono')
    .eq('status_conta', 'ativo')
    .not('whatsapp_dono', 'is', null);

  if (error) {
    console.error('[job:relatorio] erro ao listar agências:', error.message);
    return;
  }

  for (const a of agencias ?? []) {
    const freq = a.relatorio_frequencia ?? 'diario';
    if (!deveEnviar(freq, agora)) continue;

    // evitar reenviar no mesmo dia
    if (a.relatorio_ultimo_envio) {
      const ultimo = new Date(a.relatorio_ultimo_envio);
      const mesmoDia =
        ultimo.getFullYear() === agora.getFullYear() &&
        ultimo.getMonth() === agora.getMonth() &&
        ultimo.getDate() === agora.getDate();
      if (mesmoDia) continue;
    }

    try {
      console.log(`[job:relatorio] enviando relatório (${freq}) para agência ${a.id}`);
      await enviarRelatorio(a.id);
    } catch (err: any) {
      console.error(`[job:relatorio] falha agência ${a.id}:`, err?.message ?? err);
    }
  }
}

let started = false;
export function startRelatorioJob(): void {
  if (started) return;
  started = true;
  console.log('[job] Job de relatórios iniciado (cada 1h)');
  tick().catch((e) => console.error('[job:relatorio]', e));
  setInterval(() => {
    tick().catch((e) => console.error('[job:relatorio]', e));
  }, INTERVAL_MS);
}

startRelatorioJob();
