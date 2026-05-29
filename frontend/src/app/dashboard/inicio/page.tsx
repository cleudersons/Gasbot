'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Circle, MessageSquareText, Users, Plug, FlaskConical, Copy, PlayCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import PopupCampanhaFundador from './PopupCampanhaFundador';
import BemVindoModal from './BemVindoModal';

interface Status {
  passos: {
    contaCriada: boolean;
    promptOk: boolean;
    entregadoresOk: boolean;
    conexaoOk: boolean;
    testeOk: boolean;
  };
  completos: number;
  total: number;
  viu_tutorial_inicial?: boolean;
}

const DEMO = process.env.NEXT_PUBLIC_DEMO_WHATSAPP ?? '';
function formatDemo(raw: string) {
  if (!raw) return '';
  const n = raw.replace(/\D/g, '');
  if (n.length === 13) return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 9)}-${n.slice(9)}`;
  if (n.length === 12) return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 8)}-${n.slice(8)}`;
  return raw;
}

export default function InicioPage() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/onboarding', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok) {
          setData(json as Status);
          if (!json.viu_tutorial_inicial) setShowModal(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>;
  }

  const { passos, completos, total } = data;
  const pct = Math.round((completos / total) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      {showModal && (
        <BemVindoModal onClose={() => setShowModal(false)} />
      )}
      <PopupCampanhaFundador />
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-1">🎉 Bem-vindo ao SutoGas!</h1>
        <p className="text-gray-700 text-sm">
          Complete os passos abaixo para começar a atender seus clientes automaticamente.
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700">Progresso</span>
            <span className="font-semibold">{completos}/{total} passos</span>
          </div>
          <div className="h-2 w-full bg-white/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Step
          n={1}
          done={passos.contaCriada}
          icon={null}
          title="Conta criada"
          description="Tudo certo, sua conta foi criada com sucesso."
        />
        <Step
          n={2}
          done={passos.promptOk}
          icon={<MessageSquareText size={18} />}
          title="Personalize seu agente"
          description="Edite o prompt com o nome do seu depósito e produtos."
          href="/dashboard/configuracoes"
          cta="Personalizar"
          tutorialHref="/tutorial/prompt"
        />
        <Step
          n={3}
          done={passos.entregadoresOk}
          icon={<Users size={18} />}
          title="Cadastre seus entregadores"
          description="Adicione pelo menos 1 entregador com WhatsApp."
          href="/dashboard/entregadores"
          cta="Cadastrar"
          tutorialHref="/tutorial/entregadores"
        />
        <Step
          n={4}
          done={passos.conexaoOk}
          icon={<Plug size={18} />}
          title="Conecte seu WhatsApp"
          description="Escolha como quer receber os pedidos (demo, Z-API ou Meta)."
          href="/dashboard/conexao"
          cta="Conectar"
          tutorialHref="/tutorial/zapi"
        />
        <Step
          n={5}
          done={passos.testeOk}
          icon={<FlaskConical size={18} />}
          title="Faça um pedido de teste"
          description="Mande uma mensagem para o número demo e veja funcionando."
          tutorialHref="/tutorial/teste"
          extra={
            DEMO ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold text-gray-900">
                  {formatDemo(DEMO)}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(DEMO);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {}
                  }}
                  className="inline-flex items-center gap-1 text-xs bg-white border border-orange-200 hover:bg-orange-50 text-orange-700 px-2 py-1 rounded"
                >
                  <Copy size={12} /> {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <a
                  href={`https://wa.me/${DEMO}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded"
                >
                  Abrir no WhatsApp
                </a>
              </div>
            ) : null
          }
        />
      </div>

      {completos === total && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-green-900 font-semibold">
            🚀 Tudo pronto! Seu bot já está atendendo.
          </p>
        </div>
      )}
    </div>
  );
}

function Step({
  n,
  done,
  icon,
  title,
  description,
  href,
  cta,
  extra,
  tutorialHref,
}: {
  n: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  cta?: string;
  extra?: React.ReactNode;
  tutorialHref?: string;
}) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border ${
        done ? 'bg-green-50/40 border-green-200' : 'bg-white border-gray-200'
      }`}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
          done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {done ? <Check size={18} /> : n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          {done && (
            <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-800 border border-green-200 px-1.5 py-0.5 rounded-full font-semibold">
              Completo
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{description}</p>
        {tutorialHref && (
          <Link
            href={tutorialHref}
            className="inline-flex items-center gap-1 mt-2 text-xs text-orange-600 hover:text-orange-700 hover:underline"
          >
            <PlayCircle size={13} />
            Ver tutorial
          </Link>
        )}
        {extra}
      </div>
      {href && !done && (
        <Link
          href={href}
          className="shrink-0 self-center bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          {cta ?? 'Configurar'}
        </Link>
      )}
      {href && done && (
        <Link
          href={href}
          className="shrink-0 self-center text-sm text-gray-500 hover:text-gray-800"
        >
          Revisar
        </Link>
      )}
      {!href && done && <Circle className="text-transparent shrink-0" size={1} />}
    </div>
  );
}
