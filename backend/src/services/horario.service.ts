import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface HorarioConfig {
  atendimento_ativo?: boolean | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  timezone?: string | null;
}

function parseHM(t: string | null | undefined, fallback: string): [number, number] {
  const [h, m] = (t ?? fallback).split(':').map((v) => parseInt(v, 10));
  return [h || 0, m || 0];
}

/** true se a agência aceita mensagens neste momento. */
export function estaNoHorario(ag: HorarioConfig): boolean {
  if (!ag.atendimento_ativo) return true; // 24h
  const tz = ag.timezone ?? 'America/Sao_Paulo';
  const agora = toZonedTime(new Date(), tz);
  const [hi, mi] = parseHM(ag.horario_inicio, '08:00');
  const [hf, mf] = parseHM(ag.horario_fim, '22:00');

  const minsAgora = agora.getHours() * 60 + agora.getMinutes();
  const minsInicio = hi * 60 + mi;
  const minsFim = hf * 60 + mf;

  if (minsInicio <= minsFim) {
    return minsAgora >= minsInicio && minsAgora < minsFim;
  }
  // Janela que cruza a meia-noite (ex.: 22:00 → 02:00)
  return minsAgora >= minsInicio || minsAgora < minsFim;
}

/** Próximo horário de abertura em UTC. */
export function proximaAbertura(ag: HorarioConfig): Date {
  const tz = ag.timezone ?? 'America/Sao_Paulo';
  const agoraTZ = toZonedTime(new Date(), tz);
  const [hi, mi] = parseHM(ag.horario_inicio, '08:00');

  const proxTZ = new Date(agoraTZ);
  proxTZ.setHours(hi, mi, 0, 0);

  if (proxTZ.getTime() <= agoraTZ.getTime()) {
    proxTZ.setDate(proxTZ.getDate() + 1);
  }

  return fromZonedTime(proxTZ, tz);
}

export function janelaHorarioStr(ag: HorarioConfig): string {
  const ini = ag.horario_inicio?.slice(0, 5) ?? '08:00';
  const fim = ag.horario_fim?.slice(0, 5) ?? '22:00';
  return `${ini}-${fim}`;
}
