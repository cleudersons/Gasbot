'use client';

import { useState } from 'react';
import { X, MessageSquareText, Users, Plug, FlaskConical, Rocket } from 'lucide-react';

interface Props {
  nome: string;
  onClose: () => void;
}

const PASSOS = [
  { icon: MessageSquareText, titulo: 'Personalize seu agente', texto: 'Configure prompt, produtos e preços' },
  { icon: Users, titulo: 'Cadastre entregadores', texto: 'Quem vai receber os pedidos' },
  { icon: Plug, titulo: 'Conecte seu WhatsApp', texto: 'Z-API ou Meta API oficial' },
  { icon: FlaskConical, titulo: 'Faça um pedido teste', texto: 'Confirme que tudo funciona' },
];

export default function BemVindoModal({ nome, onClose }: Props) {
  const [salvando, setSalvando] = useState(false);

  async function marcarVisto() {
    setSalvando(true);
    try {
      await fetch('/api/onboarding/viu-tutorial', { method: 'POST' });
    } catch {
      // se falhar, modal reabre no próximo login — não bloqueia UX
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2a1a3e] text-white p-6 sm:p-8 relative">
          <button
            onClick={marcarVisto}
            aria-label="Fechar"
            className="absolute top-3 right-3 text-white/60 hover:text-white p-1"
          >
            <X size={20} />
          </button>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-3">
            <Rocket size={26} className="text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-1">
            Bem-vindo{nome ? `, ${nome.split(' ')[0]}` : ''}! 🎉
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Em 4 passos seu depósito estará atendendo no piloto automático.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-3">
          {PASSOS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.titulo} className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 bg-orange-50 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <Icon size={18} className="text-gray-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#1A1A2E]">{p.titulo}</p>
                  <p className="text-xs text-gray-600">{p.texto}</p>
                </div>
              </div>
            );
          })}

          <button
            onClick={marcarVisto}
            disabled={salvando}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-lg transition"
          >
            {salvando ? 'Carregando...' : 'Vamos lá!'}
          </button>
          <p className="text-xs text-center text-gray-500 mt-2">
            Cada passo tem um tutorial em vídeo do lado.
          </p>
        </div>
      </div>
    </div>
  );
}
