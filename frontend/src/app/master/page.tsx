'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, Pencil, Plug, Pause, Play } from 'lucide-react';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AgenciaItem {
  id: string;
  nome: string;
  plano: string;
  status_conta: string;
  whatsapp_dono: string | null;
  trial_inicio: string | null;
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
};

function PlanoBadge({ plano }: { plano: string }) {
  const cls = PLANO_STYLES[plano] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>{plano}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>{status}</span>;
}

function trialRestante(trialInicio: string | null, plano: string): string {
  if (plano !== 'trial' || !trialInicio) return '—';
  const fim = new Date(trialInicio).getTime() + 7 * 24 * 60 * 60 * 1000;
  const diff = fim - Date.now();
  if (diff <= 0) return 'Expirado';
  const dias = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `${dias}d`;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agências</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          <Plus size={16} /> Nova Agência
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : agencias.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Nenhuma agência cadastrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">WhatsApp Dono</th>
                <th className="px-4 py-3">Pedidos/mês</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {agencias.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.nome}</td>
                  <td className="px-4 py-3"><PlanoBadge plano={a.plano} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.status_conta} /></td>
                  <td className="px-4 py-3 text-gray-600">{a.whatsapp_dono ?? '—'}</td>
                  <td className="px-4 py-3">{a.pedidos_mes}</td>
                  <td className="px-4 py-3 text-gray-600">{trialRestante(a.trial_inicio, a.plano)}</td>
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
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
