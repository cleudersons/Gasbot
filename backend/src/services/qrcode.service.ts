import axios from 'axios';

export type ZapiStatus = 'desconectado' | 'aguardando_qr' | 'conectado';

function zapiHeaders(clientToken?: string | null): Record<string, string> {
  return clientToken ? { 'Client-Token': clientToken } : {};
}

export async function getQRCode(
  instanceId: string,
  token: string,
  clientToken?: string | null,
): Promise<string> {
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;
  const response = await axios.get(url, {
    timeout: 15000,
    headers: zapiHeaders(clientToken),
  });

  const value = response.data?.value ?? response.data?.qrcode ?? response.data;
  if (typeof value !== 'string') {
    throw new Error('Resposta de QR code inesperada da Z-API');
  }
  return value;
}

export async function getStatus(
  instanceId: string,
  token: string,
  clientToken?: string | null,
): Promise<ZapiStatus> {
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;
  const response = await axios.get(url, {
    timeout: 15000,
    headers: zapiHeaders(clientToken),
  });
  const data = response.data ?? {};

  if (data.connected === true || data.status === 'connected') return 'conectado';
  if (data.smartphoneConnected === false && data.session === true) return 'aguardando_qr';
  if (data.error || data.status === 'disconnected') return 'desconectado';
  if (data.value === 'aguardando_qr' || data.status === 'qr') return 'aguardando_qr';

  return 'desconectado';
}
