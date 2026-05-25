'use client';

import { useState } from 'react';
import { Crown, Check } from 'lucide-react';
import Modal from '@/components/Modal';

interface Props {
  planoNome: string;
  precoNormal: string;
  precoFundador: string;
  urlNormal: string;
  urlFundador: string;
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
  fundadorDisponivel,
  jaAssinante,
  vagasRestantes,
  vagasTotal,
}: Props) {
  const [open, setOpen] = useState(false);

  function handleClick() {
    // Sem vagas de fundador OU sem URL fundador disponível → vai direto pro normal
    if (!fundadorDisponivel || !urlFundador) {
      window.location.href = urlNormal;
      return;
    }
    setOpen(true);
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
              <p className="font-semibold text-amber-900">
                Você foi contemplado!
              </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <a
              href={urlFundador}
              className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg transition"
            >
              Quero participar
            </a>
            <a
              href={urlNormal}
              className="block text-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition"
            >
              Continuar sem desconto
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
