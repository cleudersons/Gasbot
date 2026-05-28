import nodemailer, { Transporter } from 'nodemailer';

let transporterCache: Transporter | null = null;

function envClean(name: string): string | undefined {
  const v = process.env[name];
  return v ? v.trim() : undefined;
}

function getTransporter(): Transporter | null {
  if (transporterCache) return transporterCache;

  const host = envClean('SMTP_HOST');
  const port = Number(envClean('SMTP_PORT') ?? 465);
  const user = envClean('SMTP_USER');
  const pass = envClean('SMTP_PASSWORD');

  if (!host || !user || !pass) {
    console.warn('[email] SMTP não configurado (SMTP_HOST/USER/PASSWORD ausentes) — envios serão ignorados');
    return null;
  }

  transporterCache = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465=SSL, 587=STARTTLS
    auth: { user, pass },
  });

  return transporterCache;
}

interface EnviarEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function enviarEmail({ to, subject, html, text }: EnviarEmailParams): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = envClean('SMTP_FROM') ?? 'SutoGas <noreply@sutogas.com.br>';

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ''),
    });
    console.log(`[email] enviado para ${to} (msgId=${info.messageId})`);
    return true;
  } catch (err: any) {
    console.error(`[email] falha ao enviar para ${to}:`, err?.message ?? err);
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
