'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, Pencil, Plug, Pause, Play, Trash2, Search } from 'lucide-react';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AgenciaItem {
  id: string;
  nome: string;
  plano: string;
  status_conta: string;
  whatsapp_dono: string | null;
  trial_inicio: string | null;
  vencimento_plano: string | null;
  inadimplente_desde: string | null;
  suspensa_em: string | null;
  zapi_instance_id: string | null;
  phone_number_id: string | null;
  provider: string | null;
  pedidos_mes: number;
}

const PLANO_STYLES: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-800 border-gray-200',
  basico: 'bg-blue-100 text-blue-800 border-blue-200',
  pro: 'bg-purple-100 text-purple-800 border-purple-200',
};

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800 border-green-200',
  suspenso: 'bg-red-100 text-red-800 border-red-200',
  trial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inadimplente: 'bg-amber-100 text-amber-900 border-amber-300',
};

function PlanoBadge({ plano }: { plano: string }) {
  const cls = PLANO_STYLES[plano] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>{plano}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>{status}</span>;
}

function formatDataCurta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function colunaPlano(a: AgenciaItem): { label: string; muted?: boolean } {
  if (a.plano === 'trial' && a.trial_inicio) {
    const fim = new Date(a.trial_inicio).getTime() + 7 * 24 * 60 * 60 * 1000;
    const dias = Math.ceil((fim - Date.now()) / (24 * 60 * 60 * 1000));
    if (dias <= 0) return { label: 'Trial expirado', muted: true };
    return { label: `Trial · ${dias}d` };
  }
  if (a.vencimento_plano) {
    const dias = diasAte(a.vencimento_plano);
    if (dias == null) return { label: '—', muted: true };
    if (dias < 0) return { label: `Venceu há ${Math.abs(dias)}d` };
    if (dias <= 3) return { label: `Vence em ${dias}d` };
    return { label: formatDataCurta(a.vencimento_plano), muted: true };
  }
  return { label: '—', muted: true };
}

function whatsAppStatus(a: AgenciaItem): { cor: string; titulo: string } {
  if (a.provider === 'zapi') {
    if (a.zapi_instance_id) return { cor: 'bg-emerald-500', titulo: 'Z-API configurada' };
    return { cor: 'bg-gray-300', titulo: 'Z-API sem credenciais' };
  }
  if (a.provider === 'meta') {
    if (a.phone_number_id) return { cor: 'bg-emerald-500', titulo: 'Meta Cloud configurada' };
    return { cor: 'bg-gray-300', titulo: 'Meta sem credenciais' };
  }
  if (a.provider === 'demo') return { cor: 'bg-sky-400', titulo: 'Modo demo' };
  return { cor: 'bg-gray-300', titulo: 'Sem provider' };
}

export default function MasterAgenciasPage() {
  const [agencias, setAgencias] = useState<AgenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [plano, setPlano] = useState('trial');
  const [whatsappDono, setWhatsappDono] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroPlano, setFiltroPlano] = useState<string>('');

  // Excluir
  const [excluindo, setExcluindo] = useState<AgenciaItem | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const fetchAgencias = useCallback(async () => {
    try {
      const res = await fetch('/api/master/agencias', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setAgencias((json.agencias ?? []) as AgenciaItem[]);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgencias();
  }, [fetchAgencias]);

  async function suspenderOuAtivar(a: AgenciaItem) {
    const novoStatus = a.status_conta === 'suspenso' ? 'ativo' : 'suspenso';
    const res = await fetch(`/api/master/agencias/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_conta: novoStatus }),
    });
    if (res.ok) fetchAgencias();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setConfirmandoExclusao(true);
    try {
      const res = await fetch(`/api/master/agencias/${excluindo.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      setExcluindo(null);
      fetchAgencias();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao excluir');
    } finally {
      setConfirmandoExclusao(false);
    }
  }

  async function criarAgencia(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      setError('Senha precisa ter ao menos 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/master/agencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          plano,
          whatsapp_dono: whatsappDono,
          email,
          senha,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setNome('');
      setPlano('trial');
      setWhatsappDono('');
      setEmail('');
      setSenha('');
      setModalOpen(false);
      fetchAgencias();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  }

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return agencias.filter((a) => {
      if (filtroStatus && a.status_conta !== filtroStatus) return false;
      if (filtroPlano && a.plano !== filtroPlano) return false;
      if (q) {
        const alvo = `${a.nome} ${a.whatsapp_dono ?? ''}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [agencias, busca, filtroStatus, filtroPlano]);

  const contagens = useMemo(() => {
    const c = { total: agencias.length, trial: 0, ativo: 0, inadimplente: 0, suspenso: 0 };
    for (const a of agencias) {
      if (a.status_conta in c) (c as any)[a.status_conta]++;
    }
    return c;
  }, [agencias]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Agências</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total: {contagens.total} · Trial: {contagens.trial} · Ativas: {contagens.ativo} ·{' '}
            <span className="text-amber-700">Inadimplentes: {contagens.inadimplente}</span> ·{' '}
            <span className="text-red-700">Suspensas: {contagens.suspenso}</span>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          <Plus size={16} /> Nova Agência
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp"
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">Todos status</option>
          <option value="trial">Trial</option>
          <option value="ativo">Ativo</option>
          <option value="inadimplente">Inadimplente</option>
          <option value="suspenso">Suspenso</option>
        </select>
        <select
          value={filtroPlano}
          onChange={(e) => setFiltroPlano(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">Todos planos</option>
          <option value="trial">Trial</option>
          <option value="basico">Básico</option>
          <option value="pro">Pro</option>
        </select>
        {(busca || filtroStatus || filtroPlano) && (
          <button
            onClick={() => {
              setBusca('');
              setFiltroStatus('');
              setFiltroPlano('');
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            limpar
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : filtradas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            {agencias.length === 0 ? 'Nenhuma agência cadastrada.' : 'Nenhuma agência corresponde aos filtros.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">WhatsApp Dono</th>
                <th className="px-4 py-3 text-right">Pedidos/mês</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a) => {
                const venc = colunaPlano(a);
                const wa = whatsAppStatus(a);
                return (
                  <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${wa.cor}`}
                        title={wa.titulo}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{a.nome}</td>
                    <td className="px-4 py-3"><PlanoBadge plano={a.plano} /></td>
                    <td className="px-4 py-3"><StatusBadge status={a.status_conta} /></td>
                    <td className="px-4 py-3 text-gray-600">{a.whatsapp_dono ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{a.pedidos_mes}</td>
                    <td className={`px-4 py-3 ${venc.muted ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                      {venc.label}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/master/agencias/${a.id}`}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Ver"
                        >
                          <Eye size={14} />
                        </Link>
                        <Link
                          href={`/master/agencias/${a.id}`}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Link>
                        <Link
                          href={`/master/agencias/${a.id}#zapi`}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Conectar Z-API"
                        >
                          <Plug size={14} />
                        </Link>
                        <button
                          onClick={() => suspenderOuAtivar(a)}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title={a.status_conta === 'suspenso' ? 'Ativar' : 'Suspender'}
                        >
                          {a.status_conta === 'suspenso' ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                        <button
                          onClick={() => setExcluindo(a)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova Agência">
        <form onSubmit={criarAgencia} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Depósito Central"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plano</label>
            <select
              value={plano}
              onChange={(e) => setPlano(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="trial">Trial</option>
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp do dono</label>
            <input
              value={whatsappDono}
              onChange={(e) => setWhatsappDono(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="5511999999999"
            />
          </div>

          <hr className="border-gray-200" />
          <p className="text-xs text-gray-500 -mt-1">Acesso do cliente</p>

          <div>
            <label className="block text-sm font-medium mb-1">E-mail de login</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="cliente@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              required
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 rounded-lg"
          >
            {saving ? 'Criando...' : 'Criar agência'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir agência">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Tem certeza que quer excluir <strong>{excluindo?.nome}</strong>? A agência some do painel
            e o agente para de atender, mas o histórico de pedidos fica preservado no banco.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setExcluindo(null)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarExclusao}
              disabled={confirmandoExclusao}
              className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white"
            >
              {confirmandoExclusao ? 'Excluindo...' : 'Sim, excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
