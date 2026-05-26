'use client';

import { useState } from 'react';
import { Crown, Check, Clock, Gift, Star } from 'lucide-react';
import Modal from '@/components/Modal';
import TermoFundador from '@/app/dashboard/planos/TermoFundador';
import { useVagasFundador } from '@/lib/useVagasFundador';

interface PlanoOferta {
  slug: string;
  nome: string;
  categoria: 'basico' | 'pro';
  preco_normal: string;
  preco_fundador: string;
  url_fundador: string;
  url_normal: string;
  limite: string;
}

interface Props {
  vagasIniciais: { vagas_total: number; vagas_restantes: number };
  ofertas: PlanoOferta[];
}

export default function LandingFundador({ vagasIniciais, ofertas }: Props) {
  const vagas = useVagasFundador(vagasIniciais);
  const [aceito, setAceito] = useState(false);
  const [openTermo, setOpenTermo] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function participar(o: PlanoOferta) {
    if (!aceito || enviando) return;
    setEnviando(o.slug);
    try {
      await fetch('/api/fundador/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oferta: o.slug }),
      });
    } catch {
      // não bloqueia checkout se o registro falhar
    }
    window.location.href = o.url_fundador;
  }

  const semVagas = vagas.vagas_restantes <= 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HERO */}
      <header className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white rounded-3xl p-8 shadow-lg">
        <div className="flex items-center gap-2 text-amber-50 text-xs uppercase tracking-wider font-semibold mb-3">
          <Crown size={14} /> Oferta exclusiva
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
          Programa Premium Fundador
        </h1>
        <p className="text-amber-50 text-base md:text-lg max-w-2xl">
          Selecionamos <strong>{vagas.vagas_total} depósitos</strong> pra construir
          o SutoGas junto com a gente — com{' '}
          <strong>50% de desconto + suporte prioritário por 12 meses</strong>.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm">
          <Clock size={16} />
          {semVagas ? (
            <span className="font-semibold">Vagas esgotadas</span>
          ) : (
            <>
              Restam{' '}
              <strong className="font-bold">{vagas.vagas_restantes}</strong> de{' '}
              {vagas.vagas_total} vagas
            </>
          )}
        </div>
      </header>

      {/* O QUE VOCÊ GANHA */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Bullet
          icon={<Gift className="text-amber-600" size={20} />}
          titulo="50% de desconto"
          texto="Preço travado por 12 meses, sem reajuste no período."
        />
        <Bullet
          icon={<Star className="text-amber-600" size={20} />}
          titulo="Suporte prioritário"
          texto="Acesso direto ao time. Sua sugestão pode virar funcionalidade."
        />
        <Bullet
          icon={<Crown className="text-amber-600" size={20} />}
          titulo="Selo Fundador"
          texto="Badge no painel pra você ter orgulho de fazer parte."
        />
      </section>

      {/* COMPROMISSOS */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold mb-3">Pra participar, você se compromete a:</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          {[
            'Dar feedback sobre o uso da plataforma',
            'Gravar um vídeo curto de depoimento',
            'Indicar 2 pessoas que conhece e precisam do SutoGas',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check size={18} className="text-green-600 mt-0.5 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <label className="mt-5 flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer text-sm">
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
              onClick={() => setOpenTermo(true)}
              className="text-amber-700 underline hover:text-amber-800"
            >
              Ler termo completo
            </button>
          </span>
        </label>
      </section>

      {/* PLANOS */}
      <section>
        <h2 className="font-semibold mb-3">Escolha seu plano fundador</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ofertas.map((o) => (
            <article
              key={o.slug}
              className="bg-white border border-amber-200 rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{o.nome}</h3>
                <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  Fundador
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{o.limite}</p>

              <div className="mt-3">
                <div className="text-sm text-gray-400 line-through">{o.preco_normal}</div>
                <div className="text-3xl font-extrabold text-amber-700">
                  {o.preco_fundador}
                </div>
                <p className="text-xs text-gray-500 mt-1">por 12 meses</p>
              </div>

              <button
                onClick={() => participar(o)}
                disabled={!aceito || semVagas || enviando !== null}
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition"
              >
                {enviando === o.slug
                  ? 'Aguarde…'
                  : semVagas
                    ? 'Vagas esgotadas'
                    : !aceito
                      ? 'Aceite os termos acima'
                      : `Quero participar — ${o.preco_fundador}`}
              </button>

              <a
                href={o.url_normal}
                className="mt-2 text-xs text-center text-gray-500 hover:text-gray-700 underline"
              >
                Continuar sem desconto ({o.preco_normal})
              </a>
            </article>
          ))}
        </div>
      </section>

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
    </div>
  );
}

function Bullet({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="mb-2">{icon}</div>
      <p className="font-semibold text-sm">{titulo}</p>
      <p className="text-xs text-gray-600 mt-1">{texto}</p>
    </div>
  );
}
