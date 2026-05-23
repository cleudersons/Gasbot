import axios from 'axios';

const GRAPH_VERSION = 'v25.0';

export async function sendMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string,
): Promise<void> {
  if (!phoneNumberId || !accessToken) {
    throw new Error('meta.provider: phoneNumberId/accessToken ausentes');
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
      validateStatus: () => true,
    },
  );

  const ok = res.status >= 200 && res.status < 300;
  console.log('[meta.provider] status:', res.status, 'response:', JSON.stringify(res.data));

  if (!ok) {
    console.error('[meta.provider] ERRO ao enviar:', JSON.stringify(res.data));
    throw new Error(`Meta API error: ${JSON.stringify(res.data)}`);
  }
}
