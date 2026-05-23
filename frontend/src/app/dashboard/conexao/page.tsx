'use client';

import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import Link from 'next/link';
import { Sparkles, MessageSquare, ShieldCheck, ArrowLeft, Copy, Check } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Choice = 'demo' | 'zapi' | 'meta' | null;

interface QrResponse {
  configured: boolean;
  status?: 'conectado' | 'aguardando_qr' | 'desconectado';
  qrcode?: string | null;
  error?: string;
}

const QR_REFRESH_SECONDS = 30;
const STATUS_POLL_MS = 10_000;
const DEMO_WHATSAPP = process.env.NEXT_PUBLIC_DEMO_WHATSAPP ?? '';

function formatWhatsapp(raw: string): string {
  // 5534991188437 → +55 34 99118-8437
  if (!raw) return '';
  const num = raw.replace(/\D/g, '');
  if (num.length === 13) {
    return `+${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 9)}-${num.slice(9)}`;
  }
  if (num.length === 12) {
    return `+${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 8)}-${num.slice(8)}`;
  }
  return raw;
}

export default function ConexaoPage() {
  const [choice, setChoice] = useState<Choice>(null);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conexão com o WhatsApp</h1>
        {choice && (
          <button
            onClick={() => setChoice(null)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}
      </div>

      {!choice && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">📱 Como funciona a conexão</p>
          <p>
            Escolha como o bot vai receber e responder os pedidos dos seus clientes.
            Recomendamos começar pelo <strong>Número Demo</strong>!
          </p>
        </div>
      )}

      {!choice && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProviderCard
            title="Número Demo"
            badge="Recomendado para trial"
            description="Teste agora sem configurar nada. Mande uma mensagem para o nosso número demo."
            icon={<Sparkles className="text-orange-500" size={28} />}
            onClick={() => setChoice('demo')}
            highlight
          />
          <ProviderCard
            title="Z-API"
            description="Conecte um número que você já usa via QR Code."
            icon={<MessageSquare className="text-green-600" size={28} />}
            onClick={() => setChoice('zapi')}
          />
          <ProviderCard
            title="API Oficial Meta"
            description="Número dedicado registrado na Meta — máxima segurança."
            icon={<ShieldCheck className="text-blue-600" size={28} />}
            onClick={() => setChoice('meta')}
          />
        </div>
      )}

      {choice === 'demo' && <DemoFlow />}
      {choice === 'zapi' && <ZapiFlow />}
      {choice === 'meta' && <MetaFlow />}
    </div>
  );
}

function ProviderCard({
  title,
  description,
  icon,
  onClick,
  badge,
  highlight,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-xl border ${
        highlight ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200'
      } hover:border-orange-400 hover:shadow-md transition p-5 relative`}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wide font-semibold bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h2 className="font-semibold text-lg">{title}</h2>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

function DemoFlow() {
  const [copied, setCopied] = useState(false);
  const formatado = formatWhatsapp(DEMO_WHATSAPP);

  async function copiar() {
    if (!DEMO_WHATSAPP) return;
    try {
      await navigator.clipboard.writeText(DEMO_WHATSAPP);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (!DEMO_WHATSAPP) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-900">
        Número demo não configurado. Defina <code>NEXT_PUBLIC_DEMO_WHATSAPP</code> em
        <code> .env.local </code>e reinicie o servidor.
      </div>
    );
  }

  const link = `https://wa.me/${DEMO_WHATSAPP}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold mb-1">Use nosso número demo</h2>
      <p className="text-sm text-gray-600 mb-5">
        Você não precisa instalar nada. Mande uma mensagem para o número abaixo e o bot
        já vai responder usando as configurações da sua conta.
      </p>

      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-5 mb-5">
        <p className="text-xs uppercase tracking-wide text-orange-700 font-semibold mb-1">
          Número demo
        </p>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-900">{formatado}</div>
          <button
            onClick={copiar}
            className="inline-flex items-center gap-1 text-sm bg-white border border-orange-200 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg"
          >
            Abrir no WhatsApp
          </a>
        </div>
      </div>

      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>
          Salve o número: <strong>{formatado}</strong>
        </li>
        <li>Mande qualquer mensagem (ex.: "oi")</li>
        <li>
          O bot vai responder usando <strong>suas configurações</strong> — prompt,
          horário, distribuição etc.
        </li>
      </ol>

      <p className="text-xs text-gray-500 mt-5">
        Limite do trial: 20 atendimentos ou 7 dias. Quando estiver pronto, conecte seu
        próprio número via Z-API ou Meta.
      </p>
    </div>
  );
}

function ZapiFlow() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QrResponse | null>(null);
  const [qrAge, setQrAge] = useState(0);
  const qrAgeRef = useRef(0);

  const fetchQR = useCallback(async () => {
    const res = await fetch('/api/conexao/qrcode', { cache: 'no-store' });
    const json = (await res.json()) as QrResponse;
    setData(json);
    setLoading(false);
    setQrAge(0);
    qrAgeRef.current = 0;
  }, []);

  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  useEffect(() => {
    if (data?.status === 'conectado') return;
    const statusTimer = setInterval(fetchQR, STATUS_POLL_MS);
    const tick = setInterval(() => {
      qrAgeRef.current += 1;
      setQrAge(qrAgeRef.current);
      if (qrAgeRef.current >= QR_REFRESH_SECONDS) {
        qrAgeRef.current = 0;
        fetchQR();
      }
    }, 1000);
    return () => {
      clearInterval(statusTimer);
      clearInterval(tick);
    };
  }, [data?.status, fetchQR]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 flex justify-center">
        <LoadingSpinner size={28} />
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-900">
        Aguardando configuração do suporte. Entre em contato para ativar sua conexão Z-API.
      </div>
    );
  }

  if (data.status === 'conectado') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-2xl mb-1">✅</div>
        <p className="text-green-900 font-semibold">WhatsApp conectado com sucesso!</p>
      </div>
    );
  }

  const expiresIn = Math.max(0, QR_REFRESH_SECONDS - qrAge);
  const qr = data.qrcode;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold mb-1">Escaneie o QR Code com o WhatsApp</h2>
      <p className="text-sm text-gray-600 mb-4">
        Abra o WhatsApp &rarr; Aparelhos conectados &rarr; Conectar um aparelho.
      </p>

      <div className="flex flex-col items-center gap-3">
        {qr ? (
          <img
            src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code Z-API"
            className="w-64 h-64 border border-gray-200 rounded-lg"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center border border-gray-200 rounded-lg">
            <LoadingSpinner size={32} />
          </div>
        )}

        <p className="text-xs text-gray-500">
          QR Code expira em <strong>{expiresIn}s</strong> · status:{' '}
          <span className="font-medium">{data.status ?? '—'}</span>
        </p>
      </div>

      {data.error && <p className="mt-3 text-sm text-red-600">{data.error}</p>}
    </div>
  );
}

function MetaFlow() {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/conexao/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          whatsapp_token: token,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setMsg('✅ Conectado! Credenciais salvas.');
    } catch (err: any) {
      setMsg(`Erro: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold mb-3">API Oficial Meta</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number ID</label>
          <input
            required
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="123456789012345"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Token de acesso permanente</label>
          <input
            required
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="EAAG..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium px-4 py-2 rounded-lg"
        >
          {saving ? 'Conectando...' : 'Conectar'}
        </button>

        <Link
          href="/tutorial/meta-api"
          className="block text-sm text-blue-600 hover:underline"
        >
          Como obter essas informações?
        </Link>

        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </form>
    </div>
  );
}
