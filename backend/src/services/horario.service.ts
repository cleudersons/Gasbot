import { toZonedTime, fromZonedTime } from 'date-fns-tz';

type DiaModo = 'mesmo' | 'fechado' | 'customizado';

interface HorarioConfig {
  atendimento_ativo?: boolean | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  timezone?: string | null;
  sabado_modo?: DiaModo | null;
  sabado_inicio?: string | null;
  sabado_fim?: string | null;
  domingo_modo?: DiaModo | null;
  domingo_inicio?: string | null;
  domingo_fim?: string | null;
}

function parseHM(t: string | null | undefined, fallback: string): [number, number] {
  const [h, m] = (t ?? fallback).split(':').map((v) => parseInt(v, 10));
  return [h || 0, m || 0];
}

/**
 * Resolve qual janela usar dado o dia da semana.
 * Retorna null quando o dia está marcado como fechado.
 */
function janelaDoDia(ag: HorarioConfig, d: Date): { inicio: string; fim: string } | null {
  const dow = d.getDay(); // 0=dom, 6=sáb
  let modo: DiaModo = 'mesmo';
  let inicio: string | null | undefined;
  let fim: string | null | undefined;

  if (dow === 6) {
    modo = ag.sabado_modo ?? 'mesmo';
    inicio = ag.sabado_inicio;
    fim = ag.sabado_fim;
  } else if (dow === 0) {
    modo = ag.domingo_modo ?? 'mesmo';
    inicio = ag.domingo_inicio;
    fim = ag.domingo_fim;
  }

  if (modo === 'fechado') return null;
  if (modo === 'customizado') {
    return { inicio: inicio ?? '08:00', fim: fim ?? '22:00' };
  }
  // 'mesmo' (ou dia útil): horário regular
  return {
    inicio: ag.horario_inicio ?? '08:00',
    fim: ag.horario_fim ?? '22:00',
  };
}

/** true se a agência aceita mensagens neste momento. */
export function estaNoHorario(ag: HorarioConfig): boolean {
  if (!ag.atendimento_ativo) return true; // 24h
  const tz = ag.timezone ?? 'America/Sao_Paulo';
  const agora = toZonedTime(new Date(), tz);

  const janela = janelaDoDia(ag, agora);
  if (!janela) return false;

  const [hi, mi] = parseHM(janela.inicio, '08:00');
  const [hf, mf] = parseHM(janela.fim, '22:00');

  const minsAgora = agora.getHours() * 60 + agora.getMinutes();
  const minsInicio = hi * 60 + mi;
  const minsFim = hf * 60 + mf;

  if (minsInicio <= minsFim) {
    return minsAgora >= minsInicio && minsAgora < minsFim;
  }
  return minsAgora >= minsInicio || minsAgora < minsFim;
}

/** Próximo horário de abertura em UTC. */
export function proximaAbertura(ag: HorarioConfig): Date {
  const tz = ag.timezone ?? 'America/Sao_Paulo';
  const agoraTZ = toZonedTime(new Date(), tz);

  for (let i = 0; i < 8; i++) {
    const candidato = new Date(agoraTZ);
    candidato.setDate(candidato.getDate() + i);
    const janela = janelaDoDia(ag, candidato);
    if (!janela) continue;
    const [hi, mi] = parseHM(janela.inicio, '08:00');
    candidato.setHours(hi, mi, 0, 0);
    if (i === 0 && candidato.getTime() <= agoraTZ.getTime()) continue;
    return fromZonedTime(candidato, tz);
  }

  const fb = new Date(agoraTZ);
  fb.setDate(fb.getDate() + 1);
  fb.setHours(8, 0, 0, 0);
  return fromZonedTime(fb, tz);
}

/** String da janela do dia atual (mostra "fechado" se for o caso). */
export function janelaHorarioStr(ag: HorarioConfig): string {
  const tz = ag.timezone ?? 'America/Sao_Paulo';
  const agora = toZonedTime(new Date(), tz);
  const janela = janelaDoDia(ag, agora);
  if (!janela) return 'fechado hoje';
  return `${janela.inicio.slice(0, 5)}-${janela.fim.slice(0, 5)}`;
}
