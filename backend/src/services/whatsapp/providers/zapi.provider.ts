import axios from 'axios';

export async function sendMessage(
  instanceId: string,
  token: string,
  to: string,
  message: string,
  clientToken?: string | null,
): Promise<void> {
  if (!instanceId || !token) {
    throw new Error('zapi.provider: instanceId/token ausentes');
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (clientToken) headers['Client-Token'] = clientToken;

  try {
    const response = await axios.post(
      url,
      { phone: to, message },
      { headers, timeout: 15000 },
    );

    if (response.status !== 200) {
      console.error(`[zapi] Falha ao enviar mensagem (status ${response.status}):`, response.data);
    }
  } catch (err: any) {
    console.error('[zapi] Erro no envio:', err?.response?.data ?? err?.message ?? err);
    throw err;
  }
}

export type PixKeyType = 'CNPJ' | 'CPF' | 'EMAIL' | 'PHONE' | 'EVP';

// Converte tipo amigável (português) para o formato esperado pela Z-API
export function mapearTipoPix(tipo: string): PixKeyType | null {
  const t = tipo.toLowerCase();
  if (t === 'cnpj') return 'CNPJ';
  if (t === 'cpf') return 'CPF';
  if (t === 'email') return 'EMAIL';
  if (t === 'telefone' || t === 'phone' || t === 'celular') return 'PHONE';
  if (t === 'aleatoria' || t === 'evp' || t === 'aleatória') return 'EVP';
  return null;
}

// Envia card oficial de PIX do WhatsApp via Z-API.
// Quando funciona, o cliente vê um card com botão "Copiar chave Pix" embutido.
// Em caso de falha, joga erro pra quem chamou decidir fallback.
export async function sendPixPayment(
  instanceId: string,
  token: string,
  to: string,
  params: {
    pixKey: string;
    pixKeyType: PixKeyType;
    merchantName: string;
    value?: number; // valor opcional em reais
  },
  clientToken?: string | null,
): Promise<void> {
  if (!instanceId || !token) {
    throw new Error('zapi.provider: instanceId/token ausentes');
  }

  // Endpoint oficial Z-API pra envio de PIX (card interativo).
  // Doc: https://developer.z-api.io/message/send-payment-pix
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-payment-pix`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (clientToken) headers['Client-Token'] = clientToken;

  const body: Record<string, unknown> = {
    phone: to,
    pixKey: params.pixKey,
    pixKeyType: params.pixKeyType,
    merchantName: params.merchantName,
  };
  if (params.value != null) body.value = params.value;

  const response = await axios.post(url, body, { headers, timeout: 15000 });

  if (response.status !== 200) {
    console.error(`[zapi] Falha enviar PIX card (status ${response.status}):`, response.data);
    throw new Error(`Z-API send-payment-pix retornou ${response.status}`);
  }
}
