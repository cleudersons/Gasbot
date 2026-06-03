'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AgenciaDetalhe {
  id: string;
  nome: string;
  plano: string;
  plano_slug?: string | null;
  status_conta: string;
  provider?: string | null;
  zapi_instance_id?: string | null;
  zapi_token?: string | null;
  zapi_client_token?: string | null;
  zapi_status?: string | null;
  criado_em?: string | null;
  phone_number_id?: string | null;
  whatsapp_token?: string | null;
  whatsapp_dono?: string | null;
  agente_ativo?: boolean | null;
  vencimento_plano?: string | null;
}

interface PlanoOpcao {
  id: string;
  slug: string;
  nome: string;
  categoria: 'basico' | 'pro';
  duracao_dias: number;
  fundador: boolean;
  ativo: boolean;
}

interface Pedido {
  id: string;
  produto: string;
  quantidade: number;
  status: string;
  endereco: string;
  criado_em: string;
}

interface Detalhes {
  agencia: AgenciaDetalhe;
  pedidos: Pedido[];
  metricas: { hoje: number; mes: number; mes_anterior: number; total: number; entregadores_ativos: number };
}

export default function MasterAgenciaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Detalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Ativação manual de plano
  const [planos, setPlanos] = useState<PlanoOpcao[]>([]);
  const [planoSlug, setPlanoSlug] = useState('');
  const [duracaoCustom, setDuracaoCustom] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ativando, setAtivando] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/master/agencias/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setData(json as Detalhes);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/master/planos', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok) {
          const ativos = (json.planos as PlanoOpcao[] | undefined)?.filter((p) => p.ativo) ?? [];
          setPlanos(ativos);
        }
      } catch {}
    })();
  }, []);

  async function ativarPlano() {
    if (!planoSlug) return;
    const plano = planos.find((p) => p.slug === planoSlug);
    const dur = duracaoCustom || (plano ? String(plano.duracao_dias) : '30');
    if (!confirm(`Ativar "${plano?.nome ?? planoSlug}" nesta agência por ${dur} dias?`)) return;
    setAtivando(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/master/agencias/${id}/ativar-plano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: planoSlug,
          duracao_dias: duracaoCustom ? Number(duracaoCustom) : undefined,
          motivo: motivo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setMsg(`✅ Plano ${plano?.nome ?? planoSlug} ativado.`);
      setPlanoSlug('');
      setDuracaoCustom('');
      setMotivo('');
      fetchData();
    } catch (err: any) {
      setMsg(`Erro ao ativar: ${err?.message ?? err}`);
    } finally {
      setAtivando(false);
    }
  }

  async function patch(payload: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/master/agencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setMsg('✅ Salvo');
      fetchData();
    } catch (err: any) {
      setMsg(`Erro: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>;
  if (error || !data) return <div className="p-6 text-red-600">{error ?? 'Não encontrado'}</div>;

  const a = data.agencia;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{a.nome}</h1>
        <p className="text-sm text-gray-500">
          ID: {a.id}
          {a.criado_em && (
            <span className="ml-3">
              · Cliente desde{' '}
              <span className="font-medium text-gray-700">
                {new Date(a.criado_em).toLocaleDateString('pt-BR')}
              </span>
              <span className="text-gray-400"> ({tempoCliente(a.criado_em)})</span>
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card label="Pedidos hoje" value={data.metricas.hoje} />
        <Card label="Pedidos no mês" value={data.metricas.mes} />
        <Card label="Mês anterior" value={data.metricas.mes_anterior} />
        <Card label="Total acumulado" value={data.metricas.total} />
        <Card label="Entregadores ativos" value={data.metricas.entregadores_ativos} />
      </div>

      <section
        className={`rounded-xl border p-5 flex items-center justify-between ${
          a.agente_ativo === false
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div>
          <div className="font-semibold">
            {a.agente_ativo === false ? '⏸ Agente pausado' : '🟢 Agente ativo'}
          </div>
          <p className="text-xs text-gray-600">
            {a.agente_ativo === false
              ? 'Esta agência (incluindo demo, se aplicável) não vai responder mensagens.'
              : 'Mensagens recebidas para essa agência são processadas pelo bot.'}
          </p>
        </div>
        <button
          onClick={() => patch({ agente_ativo: !(a.agente_ativo !== false) })}
          disabled={saving}
          className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
            a.agente_ativo === false
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          } disabled:opacity-60`}
        >
          {a.agente_ativo === false ? 'Ativar agente' : 'Pausar agente'}
        </button>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3">Plano e status</h2>
        <div className="flex items-center gap-3">
          <select
            defaultValue={a.plano}
            onChange={(e) => patch({ plano: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="trial">Trial</option>
            <option value="basico">Básico</option>
            <option value="pro">Pro</option>
          </select>
          <button
            onClick={() => patch({ status_conta: a.status_conta === 'suspenso' ? 'ativo' : 'suspenso' })}
            disabled={saving}
            className={`px-3 py-2 text-sm rounded-lg text-white ${
              a.status_conta === 'suspenso'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {a.status_conta === 'suspenso' ? 'Ativar' : 'Suspender'}
          </button>
          <span className="text-sm text-gray-600">Status atual: <strong>{a.status_conta}</strong></span>
        </div>
        {a.plano_slug && (
          <p className="text-xs text-gray-500 mt-2">
            Slug pago: <code>{a.plano_slug}</code>
            {a.vencimento_plano && (
              <> · vence em {new Date(a.vencimento_plano).toLocaleDateString('pt-BR')}</>
            )}
          </p>
        )}
      </section>

      <section className="bg-amber-50 rounded-xl border border-amber-200 p-5">
        <h2 className="font-semibold mb-1">Ativar plano manualmente</h2>
        <p className="text-xs text-gray-700 mb-3">
          Use para cortesia, primeiros clientes ou suporte. Não cobra nada — só
          atualiza o plano da agência no Supabase, igual ao webhook do checkout faria.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Plano</label>
            <select
              value={planoSlug}
              onChange={(e) => setPlanoSlug(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">— Selecione —</option>
              {planos.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.nome} ({p.categoria}, {p.duracao_dias}d{p.fundador ? ', fundador' : ''})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Duração custom (dias) <span className="text-gray-500">— opcional</span>
            </label>
            <input
              type="number"
              min="1"
              value={duracaoCustom}
              onChange={(e) => setDuracaoCustom(e.target.value)}
              placeholder="vazio = usa duração do plano"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Motivo (audit log)</label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ex: cortesia primeiro cliente"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>
        <button
          onClick={ativarPlano}
          disabled={ativando || !planoSlug}
          className="mt-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium px-4 py-2 rounded-lg text-sm"
        >
          {ativando ? 'Ativando…' : 'Ativar plano agora'}
        </button>
      </section>

      <section id="zapi" className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3">Conexão Z-API</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instance ID" defaultValue={a.zapi_instance_id ?? ''} onSave={(v) => patch({ zapi_instance_id: v })} />
          <Field label="Token" defaultValue={a.zapi_token ?? ''} onSave={(v) => patch({ zapi_token: v })} />
        </div>
        <div className="mt-3">
          <Field
            label="Client-Token (Token de segurança da conta — opcional)"
            defaultValue={a.zapi_client_token ?? ''}
            onSave={(v) => patch({ zapi_client_token: v || null })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Painel Z-API → Segurança → "Token de segurança da conta" (item 3). Obrigatório se estiver ATIVO.
          </p>
        </div>

        <ZapiWebhookHint />

        <button
          onClick={() => patch({ provider: 'zapi' })}
          disabled={saving}
          className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 text-sm rounded-lg"
        >
          Usar Z-API como provider
        </button>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3">Meta API</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone Number ID" defaultValue={a.phone_number_id ?? ''} onSave={(v) => patch({ phone_number_id: v })} />
          <Field label="WhatsApp Token" defaultValue={a.whatsapp_token ?? ''} onSave={(v) => patch({ whatsapp_token: v })} />
        </div>
        <button
          onClick={() => patch({ provider: 'meta' })}
          disabled={saving}
          className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 text-sm rounded-lg"
        >
          Usar Meta como provider
        </button>
      </section>

      <WhatsappBlock agencia={a} onChange={fetchData} />

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 font-semibold">Pedidos recentes</div>
        {data.pedidos.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">Nenhum pedido.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2">Qtd</th>
                <th className="px-4 py-2">Endereço</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Horário</th>
              </tr>
            </thead>
            <tbody>
              {data.pedidos.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{p.produto}</td>
                  <td className="px-4 py-2">{p.quantidade}</td>
                  <td className="px-4 py-2 truncate max-w-xs" title={p.endereco}>{p.endereco}</td>
                  <td className="px-4 py-2"><Badge status={p.status} /></td>
                  <td className="px-4 py-2 text-gray-500">{new Date(p.criado_em).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

function tempoCliente(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (dias === 0) return 'hoje';
  if (dias === 1) return '1 dia';
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(dias / 365);
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function ZapiWebhookHint() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'https://sutogas-backend-production.up.railway.app';
  const url = `${base.replace(/\/$/, '')}/webhook/zapi`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <p className="font-medium text-blue-900 mb-1">⚙️ Configure isto no painel Z-API</p>
      <p className="text-xs text-blue-800 mb-2">
        Z-API → Webhooks e configurações gerais → <strong>Webhook ao receber</strong>:
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 bg-white border border-blue-300 rounded px-2 py-1.5 text-xs font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  onSave,
}: {
  label: string;
  defaultValue: string;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => onSave(value)}
          className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-lg text-sm"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function WhatsappBlock({ agencia, onChange }: { agencia: AgenciaDetalhe; onChange: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(agencia.zapi_status ?? null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (agencia.provider !== 'zapi') return null;

  async function atualizarStatus() {
    setLoading(true);
    setErro(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'https://sutogas-backend-production.up.railway.app';
      const r = await fetch(`${base.replace(/\/$/, '')}/api/agencias/${agencia.id}/zapi-status`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? 'erro');
      setStatus(d.status);
      onChange();
    } catch (e: any) {
      setErro(e?.message ?? 'falhou');
    } finally {
      setLoading(false);
    }
  }

  async function carregarQR() {
    setLoading(true);
    setErro(null);
    setQr(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'https://sutogas-backend-production.up.railway.app';
      const r = await fetch(`${base.replace(/\/$/, '')}/api/agencias/${agencia.id}/qrcode`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? 'erro');
      setQr(d.qrcode ?? null);
      setStatus(d.status);
      onChange();
    } catch (e: any) {
      setErro(e?.message ?? 'falhou');
    } finally {
      setLoading(false);
    }
  }

  const cor =
    status === 'conectado' ? 'text-green-700 bg-green-50 border-green-200' :
    status === 'aguardando_qr' ? 'text-amber-700 bg-amber-50 border-amber-200' :
    status === 'desconectado' ? 'text-red-700 bg-red-50 border-red-200' :
    'text-gray-600 bg-gray-50 border-gray-200';

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">WhatsApp (Z-API)</h3>
          <p className="text-xs text-gray-500">
            Instance: <code className="bg-gray-100 px-1 rounded">{agencia.zapi_instance_id ?? '—'}</code>
          </p>
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide border px-2 py-0.5 rounded-full ${cor}`}>
          {status ?? 'desconhecido'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={atualizarStatus}
          disabled={loading}
          className="text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-1.5 rounded-lg"
        >
          {loading ? 'Atualizando...' : 'Atualizar status'}
        </button>
        {status !== 'conectado' && (
          <button
            onClick={carregarQR}
            disabled={loading}
            className="text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
          >
            Ver QR code
          </button>
        )}
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {qr && (
        <div className="border border-gray-200 rounded-lg p-3 inline-block">
          <img src={qr} alt="QR code" className="w-64 h-64 object-contain" />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → escaneie esse QR.
          </p>
        </div>
      )}
    </section>
  );
}
