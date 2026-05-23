'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Cliente {
  id: string;
  whatsapp: string;
  nome: string | null;
  dias_recarga: number;
  total_pedidos: number;
  ultimo_pedido: string | null;
  produto_preferido: string | null;
  endereco_preferido: string | null;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/clientes', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
        setClientes((json.clientes ?? []) as Cliente[]);
      } catch (err: any) {
        setError(err?.message ?? 'Erro');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clientes</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : clientes.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Nenhum cliente cadastrado ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Produto preferido</th>
                <th className="px-4 py-3">Endereço preferido</th>
                <th className="px-4 py-3">Dias recarga</th>
                <th className="px-4 py-3">Total pedidos</th>
                <th className="px-4 py-3">Último pedido</th>
                <th className="px-4 py-3">Preditivo</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.whatsapp}</td>
                  <td className="px-4 py-3">{c.produto_preferido ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={c.endereco_preferido ?? ''}>
                    {c.endereco_preferido ?? '—'}
                  </td>
                  <td className="px-4 py-3">{c.dias_recarga} dias</td>
                  <td className="px-4 py-3">{c.total_pedidos}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.ultimo_pedido
                      ? new Date(c.ultimo_pedido).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.total_pedidos >= 2 ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">
                        ⚡ Ativo
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
