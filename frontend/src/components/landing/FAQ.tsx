'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const PERGUNTAS = [
  {
    q: 'Quanto tempo dura o teste grátis?',
    r: '7 dias completos com todas as funcionalidades. Sem cartão de crédito, sem cobrança automática. Você só assina se quiser continuar.',
  },
  {
    q: 'Funciona com qualquer celular do entregador?',
    r: 'Sim. O entregador precisa só ter WhatsApp instalado. Ele recebe os pedidos, responde "aceito" ou "não aceito" e "entregue" quando finalizar — tudo pela conversa normal.',
  },
  {
    q: 'Preciso instalar algum aplicativo?',
    r: 'Não. Tudo funciona pelo navegador. Você acessa o painel pelo computador ou celular e o atendimento é todo no WhatsApp que você já usa.',
  },
  {
    q: 'Meus dados e dos meus clientes ficam seguros?',
    r: 'Sim. Toda comunicação é criptografada, dados ficam em banco isolado por agência (multi-tenancy) e o acesso ao painel exige autenticação. Seguimos boas práticas da LGPD.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    r: 'Pode. Sem fidelidade. Você cancela direto no painel e não é cobrado no próximo ciclo.',
  },
];

export default function FAQ() {
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <section className="bg-[#F8F5F0] py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-orange-600 font-semibold text-sm uppercase tracking-wider mb-2">
            Perguntas frequentes
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">Ainda em dúvida?</h2>
        </div>

        <div className="space-y-3">
          {PERGUNTAS.map((p, i) => {
            const expandido = aberto === i;
            return (
              <div
                key={p.q}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setAberto(expandido ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
                >
                  <span className="font-semibold text-[#1A1A2E] text-sm sm:text-base">{p.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandido && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{p.r}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
