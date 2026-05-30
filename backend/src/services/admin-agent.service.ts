import * as metaProvider from './whatsapp/providers/meta.provider';
import { getSupabase } from '../lib/supabase';

/**
 * Service do agente gerente do SutoGas. Funciona como funcionário virtual:
 * recebe eventos, registra no inbox dele em admin_eventos (visível pelo
 * /master/gerente), e quando configurado também avisa o admin via WhatsApp.
 *
 * Vai crescer: futuro suporta perguntas via chat, detecção de anomalias,
 * sugestões de melhoria.
 */

type Severidade = 'info' | 'sucesso' | 'aviso' | 'critico';

interface EventoBase {
  tipo: string;
  titulo: string;
  descricao?: string;
  dados?: Record<string, unknown>;
  severidade?: Severidade;
  agenciaId?: string | null;
}

/**
 * Registra um evento no inbox do gerente (admin_eventos).
 * Falha silenciosa — não bloqueia o fluxo principal.
 */
export async function registrarEvento(evento: EventoBase): Promise<void> {
  try {
    await getSupabase().from('admin_eventos').insert({
      tipo: evento.tipo,
      titulo: evento.titulo,
      descricao: evento.descricao ?? null,
      dados: evento.dados ?? null,
      severidade: evento.severidade ?? 'info',
      agencia_id: evento.agenciaId ?? null,
    });
  } catch (err: any) {
    console.error('[admin-agent] erro ao registrar evento:', err?.message ?? err);
  }
}

function getCredenciaisMetaDemo(): { phoneNumberId: string; accessToken: string } | null {
  const phoneNumberId =
    process.env.META_DEMO_PHONE_NUMBER_ID?.trim() ??
    process.env.META_PHONE_NUMBER_ID?.trim();
  const accessToken =
    process.env.META_DEMO_ACCESS_TOKEN?.trim() ??
    process.env.META_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

/**
 * Envia mensagem direta pro WhatsApp do admin (env ADMIN_WHATSAPP).
 * Canal opcional — funciona se as env vars estão setadas, ignora silenciosamente
 * se não.
 */
export async function notificarAdminWhatsapp(mensagem: string): Promise<void> {
  const adminWhatsapp = process.env.ADMIN_WHATSAPP?.trim();
  if (!adminWhatsapp) return;

  const creds = getCredenciaisMetaDemo();
  if (!creds) {
    console.warn('[admin-agent] credenciais Meta demo ausentes — WhatsApp ignorado');
    return;
  }

  try {
    await metaProvider.sendMessage(
      creds.phoneNumberId,
      creds.accessToken,
      adminWhatsapp,
      mensagem,
    );
    console.log('[admin-agent] WhatsApp enviado ao admin');
  } catch (err: any) {
    console.error('[admin-agent] falha ao enviar WhatsApp:', err?.message ?? err);
  }
}

/**
 * Notifica sobre novo cadastro de agência.
 * (1) Registra evento no inbox do gerente (admin_eventos)
 * (2) Dispara WhatsApp pro admin se configurado
 */
export async function notificarNovoCadastro(params: {
  origem: 'trial' | 'checkout';
  nome: string;
  email: string;
  whatsapp?: string | null;
  plano?: string | null;
  valor?: number | null;
  agenciaId: string;
}): Promise<void> {
  const { origem, nome, email, whatsapp, plano, valor, agenciaId } = params;
  const appUrl = process.env.APP_URL?.trim() ?? 'https://sutogas.com.br';

  const titulo = origem === 'checkout' ? 'Nova compra' : 'Novo cadastro trial';
  const descricao = `${nome} (${email})${plano ? ` — plano ${plano}` : ''}`;

  // 1) Registra no inbox do gerente
  await registrarEvento({
    tipo: origem === 'checkout' ? 'nova_compra' : 'novo_cadastro',
    titulo,
    descricao,
    severidade: 'sucesso',
    agenciaId,
    dados: { nome, email, whatsapp, plano, valor },
  });

  // 2) Notificação WhatsApp pro admin
  const linhas: string[] = [];
  linhas.push(origem === 'checkout' ? '💰 *Nova compra SutoGas*' : '🆕 *Novo cadastro SutoGas*');
  linhas.push('');
  linhas.push(`👤 Nome: ${nome}`);
  linhas.push(`📧 Email: ${email}`);
  if (whatsapp) linhas.push(`📱 WhatsApp: ${whatsapp}`);
  if (plano) linhas.push(`📦 Plano: ${plano}`);
  if (valor != null) {
    const valorStr = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    linhas.push(`💵 Valor: ${valorStr}`);
  }
  linhas.push('');
  linhas.push(`🔗 ${appUrl}/master/agencias/${agenciaId}`);

  await notificarAdminWhatsapp(linhas.join('\n'));
}
