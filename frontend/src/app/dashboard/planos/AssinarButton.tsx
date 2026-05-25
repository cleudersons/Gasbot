'use client';

import { useState } from 'react';
import { Crown, Check } from 'lucide-react';
import Modal from '@/components/Modal';
import TermoFundador from './TermoFundador';

interface Props {
  planoNome: string;
  precoNormal: string;
  precoFundador: string;
  urlNormal: string;
  urlFundador: string;
  ofertaFundador: string;
  fundadorDisponivel: boolean;
  jaAssinante: boolean;
  vagasRestantes: number;
  vagasTotal: number;
}

export default function AssinarButton({
  planoNome,
  precoNormal,
  precoFundador,
  urlNormal,
  urlFundador,
  ofertaFundador,
  fundadorDisponivel,
  jaAssinante,
  vagasRestantes,
  vagasTotal,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openTermo, setOpenTermo] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function handleClick() {
    if (!fundadorDisponivel || !urlFundador) {
      window.location.href = urlNormal;
      return;
    }
    setOpen(true);
  }

  async function handleQueroParticipar() {
    if (!aceito || enviando) return;
    setEnviando(true);
    try {
      await fetch('/api/fundador/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oferta: ofertaFundador }),
      });
    } catch {
      // não bloqueia o fluxo de pagamento se o registro falhar
    }
    window.location.href = urlFundador;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition"
      >
        {jaAssinante ? 'Fazer upgrade' : 'Assinar'}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="🎉 Parabéns!">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4">
            <Crown className="text-amber-600 shrink-0 mt-0.5" size={24} />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Você foi contemplado!</p>
              <p className="text-amber-800 mt-1">
                Estamos selecionando <strong>{vagasTotal} contatos</strong> para
                participar do programa <strong>Premium Fundador</strong>:
                <br />
                <strong>50% de desconto + suporte prioritário por 12 meses</strong>.
              </p>
              <p className="text-amber-700 text-xs mt-2">
                Restam {vagasRestantes} de {vagasTotal} vagas.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Para participar, você se compromete a:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
                <span>Dar feedback sobre o uso da plataforma</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
                <span>Gravar um vídeo curto de depoimento</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
                <span>Indicar 2 pessoas que conhece e precisam do SutoGas</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Plano {planoNome} — preço normal</span>
              <span className="font-medium text-gray-500 line-through">{precoNormal}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-amber-800 font-medium">Como Fundador</span>
              <span className="font-bold text-amber-700 text-lg">{precoFundador}</span>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span className="text-gray-700">
              Li e concordo com os termos do Programa Premium Fundador.{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenTermo(true);
                }}
                className="text-amber-700 underline hover:text-amber-800"
              >
                Ler termo completo
              </button>
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleQueroParticipar}
              disabled={!aceito || enviando}
              className="block text-center bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
            >
              {enviando ? 'Aguarde…' : 'Quero participar'}
            </button>
            <a
              href={urlNormal}
              className="block text-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition"
            >
              Continuar sem desconto
            </a>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={openTermo}
        onClose={() => setOpenTermo(false)}
        title="Termo do Programa Premium Fundador"
      >
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <TermoFundador />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setAceito(true);
              setOpenTermo(false);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Li e aceito
          </button>
        </div>
      </Modal>
    </>
  );
}
