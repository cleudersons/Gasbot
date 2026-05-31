'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, X, RefreshCw } from 'lucide-react';

type Mensagem = {
  id: string;
  autor: 'user' | 'admin';
  mensagem: string;
  criado_em: string;
};

type Ticket = {
  id: string;
  assunto: string;
  status: 'aberto' | 'respondido' | 'fechado';
  criado_em: string;
  agencia_id: string;
  agencias: { nome: string } | null;
};

export default function MasterTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const fimRef = useRef<HTMLDivElement>(null);

  async function carregar() {
    const r = await fetch(`/api/master/suporte/${params.id}`);
    if (!r.ok) {
      router.push('/master/suporte');
      return;
    }
    const d = await r.json();
    setTicket(d.ticket);
    setMensagens(d.mensagens ?? []);
    setCarregando(false);
    setTimeout(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const r = await fetch(`/api/master/suporte/${params.id}/mensagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: texto }),
    });
    setEnviando(false);
    if (r.ok) {
      setTexto('');
      carregar();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? 'Erro');
    }
  }

  async function mudarStatus(novo: 'aberto' | 'fechado') {
    const r = await fetch(`/api/master/suporte/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novo }),
    });
    if (r.ok) carregar();
  }

  if (carregando) return <p className="text-gray-500">Carregando...</p>;
  if (!ticket) return null;

  return (
    <div className="max-w-3xl">
      <Link
        href="/master/suporte"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-orange-600 mb-3"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        <div className="border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">{ticket.assunto}</h1>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{ticket.agencias?.nome ?? '—'}</span>
              {' · aberto em '}
              {new Date(ticket.criado_em).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2">
            {ticket.status === 'fechado' ? (
              <button
                onClick={() => mudarStatus('aberto')}
                className="text-xs text-gray-600 hover:text-orange-600 flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Reabrir
              </button>
            ) : (
              <button
                onClick={() => mudarStatus('fechado')}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
              >
                <X size={14} />
                Fechar ticket
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.autor === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  m.autor === 'admin'
                    ? 'bg-orange-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{m.mensagem}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    m.autor === 'admin' ? 'text-orange-100' : 'text-gray-400'
                  }`}
                >
                  {new Date(m.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        {ticket.status === 'fechado' ? (
          <div className="border-t border-gray-200 px-5 py-3 text-sm text-gray-500 text-center">
            Ticket fechado. Reabra antes de responder.
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="border-t border-gray-200 px-3 py-2 flex items-end gap-2"
          >
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Sua resposta..."
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar(e as any);
                }
              }}
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white p-2.5 rounded-lg transition"
            >
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
