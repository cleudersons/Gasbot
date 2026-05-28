'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Crown, Megaphone, AlertTriangle, Info } from 'lucide-react';

type Categoria = 'promocao' | 'aviso' | 'alerta' | 'feedback_fundador' | 'sistema';

interface Notificacao {
  id: string;
  tipo: string;
  categoria?: Categoria;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  criado_em: string;
}

const ICONE_CATEGORIA: Record<Categoria, { Icon: any; cor: string }> = {
  promocao:          { Icon: Megaphone,     cor: 'text-green-600' },
  aviso:             { Icon: Info,          cor: 'text-blue-600' },
  alerta:            { Icon: AlertTriangle, cor: 'text-red-600' },
  feedback_fundador: { Icon: Crown,         cor: 'text-amber-600' },
  sistema:           { Icon: Bell,          cor: 'text-gray-600' },
};

interface Props {
  ehFundador: boolean;
  userName: string;
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function HeaderActions({ ehFundador, userName }: Props) {
  const [lista, setLista] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function carregar() {
    try {
      const res = await fetch('/api/notificacoes', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setLista(json.notificacoes ?? []);
      setNaoLidas(json.nao_lidas ?? 0);
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  async function marcarLida(n: Notificacao) {
    if (n.lida) return;
    if (n.id.startsWith('virtual-')) {
      // Notificação virtual (ex: perfil incompleto) — some sozinha quando a condição muda
      return;
    }
    try {
      await fetch(`/api/notificacoes/${n.id}/ler`, { method: 'POST' });
    } catch {
      // ignora — UI já refletiu
    }
    setLista((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    setNaoLidas((c) => Math.max(0, c - 1));
  }

  return (
    <div className="flex items-center gap-4">
      {ehFundador && (
        <span className="hidden sm:inline-flex items-center gap-1 text-xs uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 px-2 py-1 rounded-full font-semibold">
          <Crown size={12} /> Premium Fundador
        </span>
      )}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-700"
          aria-label="Notificações"
        >
          <Bell size={20} />
          {naoLidas > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold">Notificações</span>
              {naoLidas > 0 && (
                <span className="text-xs text-gray-500">{naoLidas} não lida(s)</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {lista.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Nada por aqui ainda.
                </div>
              ) : (
                lista.map((n) => {
                  const cat = ICONE_CATEGORIA[n.categoria ?? 'sistema'] ?? ICONE_CATEGORIA.sistema;
                  const Icon = cat.Icon;
                  const conteudo = (
                    <div
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition flex gap-3 ${
                        !n.lida ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <Icon size={18} className={`${cat.cor} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{n.titulo}</p>
                          {!n.lida && (
                            <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                        {n.mensagem && (
                          <p className="text-xs text-gray-600 mt-1">{n.mensagem}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {tempoRelativo(n.criado_em)}
                        </p>
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => {
                        marcarLida(n);
                        setOpen(false);
                      }}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      onClick={() => marcarLida(n)}
                      className="w-full text-left"
                    >
                      {conteudo}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <span className="text-sm text-gray-600 hidden sm:inline">👤 {userName}</span>
    </div>
  );
}
