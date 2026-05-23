import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

interface ZapiStatusResp {
  connected?: boolean;
  status?: string;
  smartphoneConnected?: boolean;
  session?: boolean;
  error?: unknown;
  value?: string;
}

function mapStatus(data: ZapiStatusResp): 'conectado' | 'aguardando_qr' | 'desconectado' {
  if (data.connected === true || data.status === 'connected') return 'conectado';
  if (data.smartphoneConnected === false && data.session === true) return 'aguardando_qr';
  if (data.value === 'aguardando_qr' || data.status === 'qr') return 'aguardando_qr';
  if (data.error || data.status === 'disconnected') return 'desconectado';
  return 'desconectado';
}

export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { data: agencia, error } = await supabaseAdmin()
    .from('agencias')
    .select('zapi_instance_id, zapi_token')
    .eq('id', agenciaId)
    .single();

  if (error || !agencia) {
    return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 });
  }

  const { zapi_instance_id, zapi_token } = agencia;
  if (!zapi_instance_id || !zapi_token) {
    return NextResponse.json({ configured: false });
  }

  const base = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_token}`;
  try {
    const [statusRes, qrRes] = await Promise.all([
      fetch(`${base}/status`, { cache: 'no-store' }),
      fetch(`${base}/qr-code/image`, { cache: 'no-store' }),
    ]);

    const statusJson: ZapiStatusResp = await statusRes.json().catch(() => ({}));
    const qrJson = await qrRes.json().catch(() => ({}));
    const qrValue = qrJson?.value ?? qrJson?.qrcode ?? null;

    return NextResponse.json({
      configured: true,
      status: mapStatus(statusJson),
      qrcode: qrValue,
    });
  } catch (err: any) {
    return NextResponse.json(
      { configured: true, error: err?.message ?? 'Falha na Z-API' },
      { status: 502 },
    );
  }
}
