'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Plus } from 'lucide-react';

type Ticket = {
  id: string;
  assunto: string;
  status: 'aberto' | 'respondido' | 'fechado';
  criado_em: string;
  atualizado_em: string;
  nao_lidas: number;
};

export default function SuportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const r = await fetch('/api/suporte/tickets');
    const d = await r.json();
    setTickets(d.tickets ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!assunto.trim() || !mensagem.trim()) return;
    setEnviando(true);
    const r = await fetch('/api/suporte/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assunto, mensagem }),
    });
    setEnviando(false);
    if (r.ok) {
      setAssunto('');
      setMensagem('');
      setNovoAberto(false);
      carregar();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? 'Erro ao criar ticket');
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
          <p className="text-sm text-gray-600 mt-1">
            Abra um chamado e a gente responde por aqui — você também recebe a resposta por email.
          </p>
        </div>
        <button
          onClick={() => setNovoAberto(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={18} />
          Nova conversa
        </button>
      </div>

      {novoAberto && (
        <form onSubmit={criarTicket} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Assunto (ex: Z-API desconectou)"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            maxLength={120}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <textarea
            placeholder="Descreva o que está acontecendo..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            required
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setNovoAberto(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              {enviando ? 'Enviando...' : 'Abrir ticket'}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-gray-500">Carregando...</p>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">Você ainda não abriu nenhum chamado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/suporte/${t.id}`}
              className="block bg-white border border-gray-200 hover:border-orange-300 hover:shadow-sm rounded-xl p-4 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{t.assunto}</h3>
                    {t.nao_lidas > 0 && (
                      <span className="text-[10px] uppercase font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded-full">
                        {t.nao_lidas} nova{t.nao_lidas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Atualizado em {new Date(t.atualizado_em).toLocaleString('pt-BR')}
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
