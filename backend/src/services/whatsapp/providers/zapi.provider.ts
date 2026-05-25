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
