'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, X } from 'lucide-react';
import { useVagasFundador } from '@/lib/useVagasFundador';

interface Status {
  mostrar: boolean;
  vagas_total: number;
  vagas_restantes: number;
}

export default function PopupCampanhaFundador() {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const vagas = useVagasFundador(
    status ? { vagas_total: status.vagas_total, vagas_restantes: status.vagas_restantes } : undefined,
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/fundador/popup', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as Status;
        setStatus(json);
        if (json.mostrar) setOpen(true);
      } catch {
        // silencioso — popup é opcional
      }
    })();
  }, []);

  async function fechar() {
    setOpen(false);
    try {
      await fetch('/api/fundador/popup', { method: 'POST' });
    } catch {
      // não bloqueia UX
    }
  }

  if (!open || !status) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={fechar}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-6 py-5 text-white relative">
          <button
            onClick={fechar}
            className="absolute top-3 right-3 p-1 rounded hover:bg-white/20"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
          <Crown size={36} className="mb-2" />
          <h3 className="text-xl font-bold">Programa Premium Fundador</h3>
          <p className="text-amber-50 text-sm mt-1">
            Você foi selecionado para participar
          </p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Estamos selecionando{' '}
            <strong>{status.vagas_total} depósitos fundadores</strong> para
            participar com{' '}
            <strong>50% de desconto + suporte prioritário por 12 meses</strong>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="text-amber-900 font-semibold">
              Restam {vagas.vagas_restantes} de {vagas.vagas_total} vagas
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Vagas se encerram ao atingir o limite. Sem nova chance depois.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link
              href="/dashboard/planos"
              onClick={fechar}
              className="flex-1 text-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg transition"
            >
              Ver oferta
            </Link>
            <button
              type="button"
              onClick={fechar}
              className="flex-1 text-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
