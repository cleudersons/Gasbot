import axios from 'axios';

export async function sendMessage(
  instanceId: string,
  token: string,
  to: string,
  message: string,
): Promise<void> {
  if (!instanceId || !token) {
    throw new Error('zapi.provider: instanceId/token ausentes');
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  try {
    const response = await axios.post(
      url,
      { phone: to, message },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );

    if (response.status !== 200) {
      console.error(`[zapi] Falha ao enviar mensagem (status ${response.status}):`, response.data);
    }
  } catch (err: any) {
    console.error('[zapi] Erro no envio:', err?.response?.data ?? err?.message ?? err);
    throw err;
  }
}
