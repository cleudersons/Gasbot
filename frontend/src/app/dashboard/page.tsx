'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Check, Truck, CheckCheck, X } from 'lucide-react';
import Badge from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Pedido {
  id: string;
  produto: string;
  quantidade: number;
  endereco: string;
  cliente_whatsapp: string;
  status: string;
  criado_em: string;
  maps_link?: string;
  forma_pagamento?: string | null;
  status_auto?: boolean;
}

const ACTIVE_STATUSES = new Set(['pendente', 'aceito', 'em_entrega']);

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/pedidos', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setPedidos((json.pedidos ?? []) as Pedido[]);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao buscar pedidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const id = setInterval(fetchPedidos, 30000);
    return () => clearInterval(id);
  }, [fetchPedidos]);

  async function updateStatus(id: string, novoStatus: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)));
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao atualizar pedido');
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = {
    total: pedidos.length,
    pendentes: pedidos.filter((p) => p.status === 'pendente').length,
    aceitos: pedidos.filter((p) => p.status === 'aceito').length,
    entregues: pedidos.filter((p) => p.status === 'entregue').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button
          onClick={fetchPedidos}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={counts.total} color="text-gray-900" />
        <StatCard label="Pendentes" value={counts.pendentes} color="text-yellow-600" />
        <StatCard label="Aceitos" value={counts.aceitos} color="text-blue-600" />
        <StatCard label="Entregues" value={counts.entregues} color="text-green-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : pedidos.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Nenhum pedido ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const isUpdating = updatingId === p.id;
                const isActive = ACTIVE_STATUSES.has(p.status);
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.produto}</td>
                    <td className="px-4 py-3">{p.quantidade}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={p.endereco}>{p.endereco}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{p.forma_pagamento ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.cliente_whatsapp}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1">
                        <Badge status={p.status} />
                        {p.status_auto && (
                          <span
                            title="Status atualizado automaticamente pelo sistema (entregador não respondeu)"
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 border border-yellow-400 text-yellow-700 text-xs font-bold"
                          >
                            !
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(p.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {p.status === 'pendente' && (
                          <ActionButton
                            onClick={() => updateStatus(p.id, 'aceito')}
                            disabled={isUpdating}
                            className="bg-blue-500 hover:bg-blue-600"
                            icon={<Check size={12} />}
                            label="Aceitar"
                          />
                        )}
                        {p.status === 'aceito' && (
                          <ActionButton
                            onClick={() => updateStatus(p.id, 'em_entrega')}
                            disabled={isUpdating}
                            className="bg-purple-500 hover:bg-purple-600"
                            icon={<Truck size={12} />}
                            label="Em entrega"
                          />
                        )}
                        {(p.status === 'aceito' || p.status === 'em_entrega') && (
                          <ActionButton
                            onClick={() => updateStatus(p.id, 'entregue')}
                            disabled={isUpdating}
                            className="bg-green-500 hover:bg-green-600"
                            icon={<CheckCheck size={12} />}
                            label="Entregue"
                          />
                        )}
                        {isActive && (
                          <button
                            onClick={() => updateStatus(p.id, 'cancelado')}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs px-2 py-1 rounded"
                            title="Cancelar"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  className,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  className: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 text-white text-xs px-2 py-1 rounded disabled:opacity-50 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
