'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';

interface Metricas {
  agenciasTotal: number;
  agenciasAtivas: number;
  pedidosHoje: number;
  pedidosMes: number;
  entregadoresAtivos: number;
  breakdown: Record<string, number>;
}

export default function MetricasPage() {
  const [m, setM] = useState<Metricas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/master/metricas', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
        setM(json as Metricas);
      } catch (err: any) {
        setError(err?.message ?? 'Erro');
      }
    })();
  }, []);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!m) return <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Métricas globais</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card label="Agências (total)" value={m.agenciasTotal} />
        <Card label="Agências ativas" value={m.agenciasAtivas} color="text-green-600" />
        <Card label="Pedidos hoje" value={m.pedidosHoje} color="text-blue-600" />
        <Card label="Pedidos no mês" value={m.pedidosMes} color="text-purple-600" />
        <Card label="Entregadores ativos" value={m.entregadoresAtivos} />
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-3">Pedidos por status (mês atual)</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(m.breakdown).length === 0 ? (
            <p className="text-sm text-gray-500">Sem pedidos no período.</p>
          ) : (
            Object.entries(m.breakdown).map(([status, n]) => (
              <div key={status} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <Badge status={status} />
                <span className="font-semibold">{n}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
