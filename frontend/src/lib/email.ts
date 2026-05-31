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

  const from = envClean('EMAIL_FROM') ?? 'SutoGas <noreply@sutogas.com.br>';

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

// Template base com identidade SutoGas
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

export async function enviarEmailBoasVindasComSenha(params: {
  to: string;
  senhaTemporaria: string;
}): Promise<boolean> {
  const { to, senhaTemporaria } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Sua conta SutoGas está pronta 🎉</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Recebemos seu cadastro e já criamos sua conta de teste gratuito. Use os dados abaixo pra acessar:
    </p>
    <div style="background:#F8F5F0;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">E-MAIL</p>
      <p style="margin:0 0 16px;font-weight:600;color:#1A1A2E;font-family:monospace;font-size:15px;">${to}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">SENHA TEMPORÁRIA</p>
      <p style="margin:0;font-weight:600;color:#1A1A2E;font-family:monospace;font-size:15px;">${senhaTemporaria}</p>
    </div>
    <p style="margin:0 0 24px;line-height:1.55;color:#374151;">
      <strong>Importante:</strong> por segurança, troque sua senha em <em>Minha Conta</em> logo no primeiro acesso.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${appUrl}/login" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Acessar minha conta
      </a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
      Você tem 7 dias de teste grátis. Qualquer dúvida, é só responder este email.
    </p>
  `;

  return enviarEmail({
    to,
    subject: 'Sua conta SutoGas está pronta — credenciais de acesso',
    html: templateBase('Bem-vindo ao SutoGas', corpo),
  });
}

export async function enviarEmailRedefinirSenha(params: {
  to: string;
  link: string;
}): Promise<boolean> {
  const { to, link } = params;

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Redefinição de senha</h1>
    <p style="margin:0 0 16px;line-height:1.55;color:#374151;">
      Recebemos uma solicitação para redefinir a senha da sua conta SutoGas. Clique no botão abaixo para criar uma nova senha:
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Redefinir minha senha
      </a>
    </div>
    <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#6b7280;">
      Este link expira em <strong>1 hora</strong>. Se você não solicitou essa redefinição, ignore este email — sua senha continua a mesma.
    </p>
    <p style="margin:0;font-size:12px;line-height:1.55;color:#9ca3af;word-break:break-all;">
      Ou copie e cole no navegador:<br>${link}
    </p>
  `;

  return enviarEmail({
    to,
    subject: 'SutoGas — Redefinição de senha',
    html: templateBase('Redefinir senha SutoGas', corpo),
  });
}

export async function enviarEmailRespostaSuporte(params: {
  to: string;
  assunto: string;
  mensagem: string;
  ticketId: string;
}): Promise<boolean> {
  const { to, assunto, mensagem, ticketId } = params;
  const appUrl = envClean('APP_URL') ?? 'https://sutogas.com.br';
  const link = `${appUrl}/dashboard/suporte/${ticketId}`;

  const corpo = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E;">Você tem uma resposta do suporte 💬</h1>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">TICKET</p>
    <p style="margin:0 0 16px;font-weight:600;color:#1A1A2E;">${assunto}</p>
    <div style="background:#F8F5F0;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 20px;color:#374151;line-height:1.55;white-space:pre-wrap;">${mensagem.replace(/</g, '&lt;')}</div>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#F5721B;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px;font-size:15px;">
        Ver no painel
      </a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
      Pra responder, entre no painel e abra o ticket — assim mantemos todo o histórico em um lugar só.
    </p>
  `;

  return enviarEmail({
    to,
    subject: `SutoGas — Resposta do suporte: ${assunto}`,
    html: templateBase('Resposta do suporte', corpo),
  });
}
