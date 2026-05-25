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
  metricas: { hoje: number; mes: number; entregadores_ativos: number };
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
        <p className="text-sm text-gray-500">ID: {a.id}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card label="Pedidos hoje" value={data.metricas.hoje} />
        <Card label="Pedidos no mês" value={data.metricas.mes} />
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

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
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
