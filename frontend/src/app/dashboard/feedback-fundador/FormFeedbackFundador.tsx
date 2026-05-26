'use client';

import { useState } from 'react';
import { Star, Crown, Check, Video } from 'lucide-react';

interface Props {
  token?: string; // se vier, envia via link público; senão, usa sessão logada
  prazo?: string | null; // ISO date
  agenciaNome?: string;
  redirectAposEnvio?: string;
}

const DEMO_WPP_RAW = process.env.NEXT_PUBLIC_DEMO_WHATSAPP ?? '';
function formatWpp(raw: string) {
  const n = raw.replace(/\D/g, '');
  if (n.length === 13) return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 9)}-${n.slice(9)}`;
  return raw;
}

export default function FormFeedbackFundador({
  token,
  prazo,
  agenciaNome,
  redirectAposEnvio,
}: Props) {
  const [satisfacao, setSatisfacao] = useState(0);
  const [sugestoes, setSugestoes] = useState('');
  const [videoJaEnviado, setVideoJaEnviado] = useState(false);
  const [i1Nome, setI1Nome] = useState('');
  const [i1Wpp, setI1Wpp] = useState('');
  const [i2Nome, setI2Nome] = useState('');
  const [i2Wpp, setI2Wpp] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const wppLink = DEMO_WPP_RAW
    ? `https://wa.me/${DEMO_WPP_RAW.replace(/\D/g, '')}?text=${encodeURIComponent(
        'Olá! Estou enviando meu vídeo de depoimento do Programa Premium Fundador SutoGas.',
      )}`
    : '#';

  async function enviar() {
    if (satisfacao === 0) {
      setErro('Por favor selecione sua satisfação.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch('/api/fundador/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          satisfacao,
          sugestoes,
          video_ja_enviado: videoJaEnviado,
          indicacao1_nome: i1Nome,
          indicacao1_whatsapp: i1Wpp,
          indicacao2_nome: i2Nome,
          indicacao2_whatsapp: i2Wpp,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'erro ao enviar');
      }
      setEnviado(true);
      if (redirectAposEnvio) {
        setTimeout(() => {
          window.location.href = redirectAposEnvio;
        }, 1500);
      }
    } catch (e: any) {
      setErro(e?.message ?? 'erro');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="bg-white border border-green-300 rounded-2xl p-8 text-center space-y-3">
        <div className="inline-flex w-14 h-14 rounded-full bg-green-100 items-center justify-center">
          <Check className="text-green-600" size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Recebido! Muito obrigado 🙏</h2>
        <p className="text-sm text-gray-600">
          Suas respostas foram registradas. Continuaremos em contato!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-4">
        <Crown className="text-amber-600 shrink-0 mt-1" size={28} />
        <div className="flex-1">
          <h2 className="font-bold text-amber-900">Programa Premium Fundador</h2>
          {agenciaNome && (
            <p className="text-sm text-amber-800">Obrigado, {agenciaNome}!</p>
          )}
          <p className="text-sm text-amber-800 mt-1">
            Como fundador você se comprometeu a dar feedback, indicar 2 contatos e
            enviar um vídeo de depoimento.
          </p>
          {prazo && (
            <p className="text-xs text-amber-700 mt-2">
              Prazo pra responder: <strong>{new Date(prazo).toLocaleDateString('pt-BR')}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Satisfação */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">Como você avalia o SutoGas até agora?</h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSatisfacao(n)}
              className={`p-2 rounded-lg transition ${
                n <= satisfacao ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300'
              }`}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            >
              <Star size={32} fill={n <= satisfacao ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {satisfacao === 0
            ? 'Toque numa estrela'
            : satisfacao === 5
              ? 'Ótimo! 🔥'
              : satisfacao >= 3
                ? 'Bom — diga abaixo o que melhorar'
                : 'Sentimos muito — nos conte o que aconteceu'}
        </p>
      </section>

      {/* Sugestões */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
        <label className="block font-semibold">
          Sugestões de ajustes ou novas funcionalidades
        </label>
        <textarea
          value={sugestoes}
          onChange={(e) => setSugestoes(e.target.value)}
          rows={4}
          placeholder="O que você gostaria de ver no SutoGas? Algo que está incomodando? Mande tudo aqui."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </section>

      {/* Indicações */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="font-semibold">Indicações</h3>
          <p className="text-xs text-gray-600">
            Indique 2 pessoas que conhece e precisam do SutoGas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome (indicação 1)</label>
            <input
              value={i1Nome}
              onChange={(e) => setI1Nome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp (indicação 1)</label>
            <input
              value={i1Wpp}
              onChange={(e) => setI1Wpp(e.target.value)}
              placeholder="(34) 9XXXX-XXXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nome (indicação 2)</label>
            <input
              value={i2Nome}
              onChange={(e) => setI2Nome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp (indicação 2)</label>
            <input
              value={i2Wpp}
              onChange={(e) => setI2Wpp(e.target.value)}
              placeholder="(34) 9XXXX-XXXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Vídeo */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">Vídeo de depoimento</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={videoJaEnviado}
            onChange={(e) => setVideoJaEnviado(e.target.checked)}
          />
          Já enviei o vídeo
        </label>
        {!videoJaEnviado && DEMO_WPP_RAW && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            <p className="text-blue-900">
              Envie um vídeo curto (1–2 min) contando sua experiência com o SutoGas
              direto pro nosso WhatsApp:
            </p>
            <p className="font-mono text-blue-900 font-semibold">{formatWpp(DEMO_WPP_RAW)}</p>
            <a
              href={wppLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Video size={16} /> Abrir WhatsApp
            </a>
          </div>
        )}
      </section>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {erro}
        </div>
      )}

      <button
        onClick={enviar}
        disabled={enviando}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3 rounded-xl"
      >
        {enviando ? 'Enviando…' : 'Enviar respostas'}
      </button>
    </div>
  );
}
