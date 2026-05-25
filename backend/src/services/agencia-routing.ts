import { getSupabase } from '../lib/supabase';

export interface Agencia {
  id: string;
  nome: string;
  provider: string | null;
  phone_number_id: string | null;
  whatsapp_token: string | null;
  zapi_instance_id: string | null;
  zapi_token: string | null;
  zapi_client_token: string | null;
  status_conta: string;
  plano: string;
  trial_inicio: string | null;
  trial_atendimentos: number;
  prompt_customizado: string | null;
  demo_cliente_whatsapp: string | null;
  agente_ativo: boolean;
  sla_minutos: number | null;
}

const AGENCIA_COLUMNS =
  'id, nome, provider, phone_number_id, whatsapp_token, zapi_instance_id, zapi_token, zapi_client_token, ' +
  'status_conta, plano, trial_inicio, trial_atendimentos, prompt_customizado, ' +
  'demo_cliente_whatsapp, agente_ativo, sla_minutos';

function isDemoMeta(phoneNumberId: string | null | undefined): boolean {
  const demo = process.env.META_DEMO_PHONE_NUMBER_ID;
  return !!demo && !!phoneNumberId && demo === phoneNumberId;
}

function isDemoZapi(instanceId: string | null | undefined): boolean {
  const demo = process.env.ZAPI_DEMO_INSTANCE_ID;
  return !!demo && !!instanceId && demo === instanceId;
}

async function buscarPorPhoneNumber(phoneNumberId: string): Promise<Agencia | null> {
  const { data } = await getSupabase()
    .from('agencias')
    .select(AGENCIA_COLUMNS)
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();
  return (data as unknown as Agencia | null) ?? null;
}

async function buscarPorZapiInstance(instanceId: string): Promise<Agencia | null> {
  const { data } = await getSupabase()
    .from('agencias')
    .select(AGENCIA_COLUMNS)
    .eq('zapi_instance_id', instanceId)
    .maybeSingle();
  return (data as unknown as Agencia | null) ?? null;
}

async function buscarAgenciaTrialDemo(clienteWhatsapp: string): Promise<Agencia | null> {
  const { data } = await getSupabase()
    .from('agencias')
    .select(AGENCIA_COLUMNS)
    .eq('demo_cliente_whatsapp', clienteWhatsapp)
    .maybeSingle();
  return (data as unknown as Agencia | null) ?? null;
}

async function criarAgenciaTrialDemo(clienteWhatsapp: string): Promise<Agencia> {
  const { data, error } = await getSupabase()
    .from('agencias')
    .insert({
      nome: `Trial ${clienteWhatsapp}`,
      provider: 'demo',
      status_conta: 'trial',
      plano: 'trial',
      trial_inicio: new Date().toISOString(),
      trial_atendimentos: 0,
      demo_cliente_whatsapp: clienteWhatsapp,
    })
    .select(AGENCIA_COLUMNS)
    .single();

  if (error || !data) throw new Error(`Erro ao criar agência trial: ${error?.message}`);
  const ag = data as unknown as Agencia;
  console.log(`[trial] Agência criada para ${clienteWhatsapp}: ${ag.id}`);
  return ag;
}

async function fallbackDefault(): Promise<Agencia | null> {
  const id = process.env.DEFAULT_AGENCIA_ID;
  if (!id) return null;
  const { data } = await getSupabase()
    .from('agencias')
    .select(AGENCIA_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  return (data as unknown as Agencia | null) ?? null;
}

/**
 * Webhook Meta: identifica agência por phone_number_id do payload.
 * Fluxo trial demo: quando o phone_number_id bate com META_DEMO_PHONE_NUMBER_ID,
 * cada cliente (remetente) recebe sua própria agência trial isolada.
 */
export async function resolverAgenciaFromMeta(
  phoneNumberIdRecebedor: string | undefined,
  clienteWhatsapp: string,
): Promise<Agencia | null> {
  if (phoneNumberIdRecebedor && isDemoMeta(phoneNumberIdRecebedor)) {
    const existente = await buscarAgenciaTrialDemo(clienteWhatsapp);
    return existente ?? (await criarAgenciaTrialDemo(clienteWhatsapp));
  }

  if (phoneNumberIdRecebedor) {
    const ag = await buscarPorPhoneNumber(phoneNumberIdRecebedor);
    if (ag) return ag;
  }

  return await fallbackDefault();
}

/**
 * Webhook Z-API: identifica por instanceId. Demo: mesmo padrão do Meta.
 */
export async function resolverAgenciaFromZapi(
  instanceId: string | undefined,
  clienteWhatsapp: string,
): Promise<Agencia | null> {
  if (instanceId && isDemoZapi(instanceId)) {
    const existente = await buscarAgenciaTrialDemo(clienteWhatsapp);
    return existente ?? (await criarAgenciaTrialDemo(clienteWhatsapp));
  }

  if (instanceId) {
    const ag = await buscarPorZapiInstance(instanceId);
    if (ag) return ag;
  }

  return await fallbackDefault();
}

const TRIAL_LIMITE_ATENDIMENTOS = 20;
const TRIAL_LIMITE_DIAS = 7;

export interface TrialState {
  ativo: boolean;
  expirado: boolean;
  atendimentos: number;
  diasRestantes: number;
  atendimentosRestantes: number;
}

export function avaliarTrial(agencia: Agencia): TrialState {
  if (agencia.status_conta !== 'trial') {
    return { ativo: false, expirado: false, atendimentos: 0, diasRestantes: 0, atendimentosRestantes: 0 };
  }
  const inicio = agencia.trial_inicio ? new Date(agencia.trial_inicio).getTime() : Date.now();
  const diasPassados = (Date.now() - inicio) / (24 * 60 * 60 * 1000);
  const atendimentos = agencia.trial_atendimentos ?? 0;
  const expirouAtend = atendimentos >= TRIAL_LIMITE_ATENDIMENTOS;
  const expirouTempo = diasPassados > TRIAL_LIMITE_DIAS;

  return {
    ativo: true,
    expirado: expirouAtend || expirouTempo,
    atendimentos,
    diasRestantes: Math.max(0, Math.ceil(TRIAL_LIMITE_DIAS - diasPassados)),
    atendimentosRestantes: Math.max(0, TRIAL_LIMITE_ATENDIMENTOS - atendimentos),
  };
}

export async function incrementarAtendimentoTrial(agenciaId: string, atual: number): Promise<void> {
  const { error } = await getSupabase()
    .from('agencias')
    .update({ trial_atendimentos: atual + 1 })
    .eq('id', agenciaId);
  if (error) console.error('[trial] erro ao incrementar atendimentos:', error.message);
}
