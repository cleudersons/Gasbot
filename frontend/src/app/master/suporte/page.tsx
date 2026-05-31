'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

type Ticket = {
  id: string;
  assunto: string;
  status: 'aberto' | 'respondido' | 'fechado';
  criado_em: string;
  atualizado_em: string;
  agencia_id: string;
  agencias: { nome: string } | null;
};

export default function MasterSuportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filtro, setFiltro] = useState<'aberto' | 'respondido' | 'fechado' | ''>('aberto');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    fetch(`/api/master/suporte${filtro ? `?status=${filtro}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        setTickets(d.tickets ?? []);
        setCarregando(false);
      });
  }, [filtro]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
        <p className="text-sm text-gray-600 mt-1">
          Tickets abertos pelos clientes — responda direto na conversa.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['aberto', 'respondido', 'fechado', ''] as const).map((f) => (
          <button
            key={f || 'todos'}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtro === f
                ? 'bg-orange-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f === '' ? 'Todos' : f === 'aberto' ? 'Aguardando' : f === 'respondido' ? 'Respondidos' : 'Fechados'}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-gray-500">Carregando...</p>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">Nenhum ticket nessa categoria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/master/suporte/${t.id}`}
              className="block bg-white border border-gray-200 hover:border-orange-300 hover:shadow-sm rounded-xl p-4 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{t.assunto}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-medium text-gray-700">
                      {t.agencias?.nome ?? '—'}
                    </span>
                    {' · '}
                    {new Date(t.atualizado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'aberto' | 'respondido' | 'fechado' }) {
  const map = {
    aberto: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    respondido: { label: 'Respondido', cls: 'bg-green-100 text-green-800 border-green-200' },
    fechado: { label: 'Fechado', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  } as const;
  const v = map[status];
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wide border px-2 py-0.5 rounded-full ${v.cls}`}>
      {v.label}
    </span>
  );
}
