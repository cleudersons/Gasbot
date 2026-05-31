import { Resend } from 'resend';

function envClean(name: string): string | undefined {
  const v = process.env[name];
  return v ? v.trim() : undefined;
}

let resendCache: Resend | null = null;

function getResend(): Resend | null {
  if (resendCache) return resendCache;
  const apiKey = envClean('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY ausente — envios serão ignorados');
    return null;
  }
  resendCache = new Resend(apiKey);
  return resendCache;
}

interface EnviarEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function enviarEmail({ to, subject, html, text }: EnviarEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const from = envClean('SMTP_FROM') ?? 'SutoGas <noreply@sutogas.com.br>';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ''),
    });
    if (error) {
      console.error(`[email] falha ao enviar para ${to}:`, error);
      return false;
    }
    console.log(`[email] enviado para ${to} (id=${data?.id})`);
    return true;
  } catch (err: any) {
    console.error(`[email] excecao ao enviar para ${to}:`, err?.message ?? err);
    return false;
  }
}

// Template base com identidade SutoGas. Recebe título e corpo (HTML interno do card).
export function templateBase(titulo: string, corpoHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${titulo}</title>
  </head>
  <body style="margin:0;padding:0;background:#F8F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A2E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F5F0;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr><td style="background:#1A1A2E;padding:24px;text-align:center;">
            <div style="display:inline-block;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              Suto<span style="color:#F5721B;">Gas</span>
            </div>
          </td></tr>
          <tr><td style="padding:32px 28px;">
            ${corpoHtml}
          </td></tr>
          <tr><td style="background:#F8F5F0;padding:18px 28px;text-align:center;font-size:12px;color:#6b7280;">
            Este é um email automático — não responda.<br>
            <a href="https://sutogas.com.br" style="color:#F5721B;text-decoration:none;">sutogas.com.br</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

// Email enviado após compra externa, quando criamos conta automaticamente
// e o cliente precisa receber as credenciais pra acessar pela primeira vez.
export async function enviarEmailBoasVindasComSenha(params: {
  to: string;
  senhaTemporaria: string;
}): Promise<boolean> {
  const { to, senhaTemporaria } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Sua conta SutoGas está pronta 🎉</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Recebemos sua compra e já criamos sua conta. Use os dados abaixo pra acessar pela primeira vez:
    </p>
    <div style="background:#F8F5F0;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">E-MAIL</p>
      <p style="margin:0 0 16px;font-weight:600;color:#1A1A2E;font-family:monospace;font-size:15px;">${to}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">SENHA TEMPORÁRIA</p>
      <p style="margin:0;font-weight:600;color:#1A1A2E;font-family:monospace;font-size:15px;">${senhaTemporaria}</p>
    </div>
    <p style="margin:0 0 24px;line-height:1.55;color:#374151;">
      <strong>Importante:</strong> por segurança, troque sua senha logo no primeiro acesso.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${appUrl}/login" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Acessar minha conta
      </a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
      Precisa de ajuda? Entre em contato com o suporte.
    </p>
  `;

  return enviarEmail({
    to,
    subject: 'Sua conta SutoGas está pronta — credenciais de acesso',
    html: templateBase('Bem-vindo ao SutoGas', corpo),
  });
}

// Disparado quando webhook do Asaas confirma pagamento de cliente JÁ existente
// (renovação ou upgrade — não cria conta nova).
export async function enviarEmailRenovacaoConfirmada(params: {
  to: string;
  plano: string;
  vencimento: Date;
}): Promise<boolean> {
  const { to, plano, vencimento } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';
  const venceStr = vencimento.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Pagamento confirmado ✅</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Recebemos seu pagamento e seu plano <strong>${plano}</strong> está renovado.
      Tudo continua funcionando normalmente — o agente segue atendendo seus clientes 24/7.
    </p>
    <div style="background:#F8F5F0;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">PLANO ATUAL</p>
      <p style="margin:0 0 12px;font-weight:600;color:#1A1A2E;">${plano}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">PRÓXIMO VENCIMENTO</p>
      <p style="margin:0;font-weight:600;color:#1A1A2E;">${venceStr}</p>
    </div>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${appUrl}/dashboard/minha-conta" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Ver minha conta
      </a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
      Obrigado por continuar com a gente!
    </p>
  `;

  return enviarEmail({
    to,
    subject: 'SutoGas — Pagamento confirmado',
    html: templateBase('Renovação confirmada', corpo),
  });
}

// Disparado pelo webhook 'pagamento_falhou' (ou pelo job de vencimento ao detectar
// vencimento_plano expirado). Marca o início dos 3 dias de tolerância.
export async function enviarEmailCobrancaFalhou(params: {
  to: string;
  plano?: string | null;
}): Promise<boolean> {
  const { to, plano } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Não conseguimos processar sua cobrança ⚠️</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      A última tentativa de cobrança ${plano ? `do seu plano <strong>${plano}</strong>` : 'da sua assinatura'} não foi aprovada.
      Pode ter sido cartão sem limite, dado desatualizado ou algo passageiro.
    </p>
    <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0;line-height:1.55;color:#9A3412;font-size:14px;">
        <strong>Você tem 3 dias</strong> para regularizar antes que o atendimento automático seja suspenso.
      </p>
    </div>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${appUrl}/dashboard/minha-conta" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Regularizar agora
      </a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
      Já regularizou? Pode ignorar esta mensagem — a confirmação chega em alguns minutos.
    </p>
  `;

  return enviarEmail({
    to,
    subject: 'SutoGas — Não conseguimos processar sua cobrança',
    html: templateBase('Cobrança não aprovada', corpo),
  });
}

// Disparado pelo job de vencimento quando passam 3 dias da inadimplência sem
// regularização. Conta entra em status 'suspenso' e o agente para de atender.
export async function enviarEmailContaSuspensa(params: {
  to: string;
}): Promise<boolean> {
  const { to } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Sua conta foi suspensa 🚫</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Como não conseguimos regularizar sua cobrança nos últimos dias,
      <strong>o agente parou de atender seus clientes agora</strong>.
    </p>
    <p style="margin:0 0 20px;line-height:1.55;color:#374151;">
      Pra reativar é simples: regularize o pagamento e em poucos minutos tudo volta ao normal.
      Suas configurações, prompt e histórico continuam salvos.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${appUrl}/dashboard/minha-conta" style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Reativar minha conta
      </a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
      Dúvida ou problema com o pagamento? Responda este email que a gente ajuda.
    </p>
  `;

  return enviarEmail({
    to,
    subject: 'SutoGas — Sua conta foi suspensa',
    html: templateBase('Conta suspensa', corpo),
  });
}

// Disparado pelo job D+2 fundador para convidar a participar do feedback.
export async function enviarEmailFeedbackFundador(params: {
  to: string;
  token: string;
}): Promise<boolean> {
  const { to, token } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';
  const linkPublico = `${appUrl}/f/${token}`;
  const linkLogado = `${appUrl}/dashboard/feedback-fundador`;

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">👑 Programa Premium Fundador</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Você está há 2 dias no Premium Fundador e queremos saber: como tem sido a experiência?
    </p>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Pra fechar sua participação no programa, você tem <strong>15 dias</strong> pra:
    </p>
    <ul style="margin:0 0 20px;padding-left:20px;line-height:1.7;color:#374151;font-size:14px;">
      <li>Responder uma pesquisa rápida (2 minutos)</li>
      <li>Indicar 2 contatos de outros depósitos</li>
      <li>Enviar um vídeo curto de depoimento</li>
    </ul>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${linkLogado}" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Responder agora
      </a>
    </div>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#6b7280;">
      Sem login? Use este link público:
    </p>
    <p style="margin:0;font-size:12px;line-height:1.55;color:#9ca3af;word-break:break-all;">
      ${linkPublico}
    </p>
  `;

  return enviarEmail({
    to,
    subject: '👑 SutoGas — Sua participação no Programa Fundador',
    html: templateBase('Programa Fundador', corpo),
  });
}
