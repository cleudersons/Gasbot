'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';

interface Notificacao {
  id: string;
  categoria: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
}

export default function AlertaPopup() {
  const [alertas, setAlertas] = useState<Notificacao[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetch('/api/notificacoes', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.notificacoes) return;
        const ativos = (j.notificacoes as Notificacao[]).filter(
          (n: any) => n.categoria === 'alerta' && !n.lida,
        );
        setAlertas(ativos);
      })
      .catch(() => {});
  }, []);

  if (alertas.length === 0 || idx >= alertas.length) return null;
  const atual = alertas[idx];

  async function fechar() {
    // Não marca como lida — usuário precisa resolver. Só vai pro próximo se houver.
    setIdx((i) => i + 1);
  }

  async function marcarLida() {
    try {
      await fetch(`/api/notificacoes/${atual.id}/ler`, { method: 'POST' });
    } catch {}
    setIdx((i) => i + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-700" />
          </div>
          <h2 className="font-semibold text-red-900 flex-1">{atual.titulo}</h2>
          <button
            onClick={fechar}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Lembrar depois"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">
          {atual.mensagem && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {atual.mensagem}
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-end mt-5">
            <button
              onClick={fechar}
              className="text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg"
            >
              Lembrar depois
            </button>
            {atual.link && (
              <Link
                href={atual.link}
                onClick={marcarLida}
                className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg"
              >
                Resolver agora
              </Link>
            )}
          </div>
        </div>
        {alertas.length > 1 && (
          <div className="bg-gray-50 px-5 py-2 text-[11px] text-gray-500 text-center">
            Alerta {idx + 1} de {alertas.length}
          </div>
        )}
      </div>
    </div>
  );
}
