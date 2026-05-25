'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

type Status = {
  plano?: string | null;
  status_conta?: string | null;
  programa_fundador?: boolean | null;
};

const POLL_MS = 2000;
const MAX_TRIES = 15; // ~30s

export default function PagamentoConfirmadoPage() {
  const router = useRouter();
  const [ativado, setAtivado] = useState(false);
  const [data, setData] = useState<Status | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [timeout, setTimeoutFlag] = useState(false);

  useEffect(() => {
    if (ativado) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick(t: number) {
      try {
        const res = await fetch('/api/agencia/status', { cache: 'no-store' });
        const json = (await res.json()) as Status;
        if (cancelled) return;
        setData(json);
        if (json?.plano && json.plano !== 'trial' && json.status_conta === 'ativo') {
          setAtivado(true);
          return;
        }
      } catch {
        // segue tentando
      }
      if (t + 1 >= MAX_TRIES) {
        if (!cancelled) setTimeoutFlag(true);
        return;
      }
      setTentativas(t + 1);
      timer = setTimeout(() => tick(t + 1), POLL_MS);
    }

    tick(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ativado]);

  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        {ativado ? (
          <>
            <CheckCircle2 className="text-green-600 mx-auto" size={56} />
            <h1 className="text-2xl font-bold mt-4">Pagamento confirmado!</h1>
            <p className="text-gray-600 mt-2 text-sm">
              Seu plano <strong>{data?.plano?.toUpperCase()}</strong> está ativo.
              {data?.programa_fundador && (
                <>
                  {' '}Bem-vindo ao <strong>Programa Premium Fundador</strong>! 👑
                </>
              )}
            </p>
            <button
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
              className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              Ir para o painel
            </button>
          </>
        ) : timeout ? (
          <>
            <CheckCircle2 className="text-amber-500 mx-auto" size={56} />
            <h1 className="text-2xl font-bold mt-4">Tudo certo!</h1>
            <p className="text-gray-600 mt-2 text-sm">
              Seu pagamento foi processado. A ativação no painel pode levar mais
              alguns segundos. Você pode entrar agora — se o plano ainda não
              aparecer atualizado, recarregue a página.
            </p>
            <button
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
              className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              Ir para o painel
            </button>
          </>
        ) : (
          <>
            <Loader2 className="text-orange-500 mx-auto animate-spin" size={48} />
            <h1 className="text-xl font-bold mt-4">Confirmando seu pagamento…</h1>
            <p className="text-gray-600 mt-2 text-sm">
              Isso costuma levar alguns segundos. Não feche esta página.
            </p>
            <p className="text-gray-400 mt-3 text-xs">
              Tentativa {tentativas + 1} de {MAX_TRIES}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
