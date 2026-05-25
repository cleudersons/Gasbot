import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { Check, Crown } from 'lucide-react';
import AssinarButton from './AssinarButton';

const CHECKOUT_BASE =
  process.env.NEXT_PUBLIC_CHECKOUT_BASE ?? 'https://pay.sutofly.com/checkout.php';

function checkoutUrl(
  oferta: string,
  agenciaId: string,
  email: string,
  jaAssinante: boolean,
) {
  const modo = jaAssinante ? '1clickupgrade' : '1click';
  const params = new URLSearchParams({
    o: oferta,
    m: modo,
    agencia_id: agenciaId,
    email,
  });
  return `${CHECKOUT_BASE}?${params.toString()}`;
}

export default async function PlanosPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;

  const db = supabaseAdmin();

  const [{ data: ag }, { data: cfg }] = await Promise.all([
    agenciaId
      ? db
          .from('agencias')
          .select('plano, status_conta, programa_fundador, fundador_desconto_ate')
          .eq('id', agenciaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from('programa_fundador_config')
      .select('vagas_total, vagas_usadas, ativo')
      .eq('ativo', true)
      .maybeSingle(),
  ]);

  const planoAtual = ag?.plano ?? 'trial';
  const jaAssinante = !!ag && planoAtual !== 'trial' && ag.status_conta === 'ativo';
  const ehFundador = !!ag?.programa_fundador;

  const vagasTotal = cfg?.vagas_total ?? 50;
  const vagasRestantes = cfg
    ? Math.max(0, (cfg.vagas_total ?? 0) - (cfg.vagas_usadas ?? 0))
    : 0;
  const fundadorDisponivel = !!cfg?.ativo && vagasRestantes > 0;

  const planos = [
    {
      key: 'trial',
      nome: 'Trial',
      preco: 'Grátis',
      detalhe: '7 dias OU 20 atendimentos',
      features: ['Número demo', 'IA completa', 'Sem cartão'],
      oferta: null as string | null,
      ofertaFundador: null as string | null,
      precoFundador: null as string | null,
    },
    {
      key: 'basico',
      nome: 'Básico',
      preco: 'R$ 247',
      precoFundador: 'R$ 123,50',
      detalhe: 'por mês · 200 atendimentos',
      features: ['1 número WhatsApp', 'Z-API ou Meta API', 'Suporte prioritário'],
      oferta: 'sutogasbasico',
      ofertaFundador: 'sutogaspremiumfundador',
    },
    {
      key: 'pro',
      nome: 'Pro',
      preco: 'R$ 447',
      precoFundador: 'R$ 223,50',
      detalhe: 'por mês · atendimentos ilimitados',
      features: ['Até 3 números WhatsApp', 'Z-API ou Meta API', 'Relatórios avançados'],
      oferta: 'sutogaspro',
      ofertaFundador: 'sutogaspremiupro',
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-gray-600 text-sm mt-1">
          Escolha o plano ideal para o seu depósito.
        </p>
      </div>

      {ehFundador && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-5 flex items-center gap-4">
          <Crown className="text-amber-600 shrink-0" size={32} />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              Você faz parte do Programa Premium Fundador
            </p>
            <p className="text-sm text-amber-800">
              Preços com 50% de desconto aplicados abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planos.map((p) => {
          const atual = planoAtual === p.key;
          // Já é fundador: preço com desconto + checkout direto na oferta fundador, sem popup
          const usarPrecoFundador = ehFundador && !!p.precoFundador;

          const urlNormal =
            agenciaId && email && p.oferta
              ? checkoutUrl(p.oferta, agenciaId, email, jaAssinante)
              : '';
          const urlFundador =
            agenciaId && email && p.ofertaFundador
              ? checkoutUrl(p.ofertaFundador, agenciaId, email, jaAssinante)
              : '';

          return (
            <div
              key={p.key}
              className={`bg-white border rounded-2xl p-6 flex flex-col ${
                atual
                  ? 'border-orange-500 ring-2 ring-orange-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold">{p.nome}</h3>
                {atual && (
                  <span className="text-xs uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
                    Atual
                  </span>
                )}
              </div>
              <div className="mt-3">
                {usarPrecoFundador && p.precoFundador ? (
                  <div>
                    <span className="text-3xl font-bold">{p.precoFundador}</span>
                    <span className="ml-2 text-sm text-gray-400 line-through">
                      {p.preco}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold">{p.preco}</span>
                )}
                <p className="text-sm text-gray-600 mt-1">{p.detalhe}</p>
              </div>

              <ul className="mt-4 space-y-2 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {!p.oferta ? (
                  <button
                    disabled
                    className="block w-full text-center bg-gray-100 text-gray-500 font-medium py-2 rounded-lg cursor-not-allowed"
                  >
                    {atual ? 'Plano atual' : 'Indisponível'}
                  </button>
                ) : !urlNormal ? (
                  <button
                    disabled
                    className="block w-full text-center bg-gray-100 text-gray-500 font-medium py-2 rounded-lg cursor-not-allowed"
                  >
                    Indisponível
                  </button>
                ) : ehFundador ? (
                  // Já é fundador → direto na oferta com desconto, sem popup
                  <a
                    href={urlFundador || urlNormal}
                    className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition"
                  >
                    {jaAssinante ? 'Fazer upgrade' : 'Assinar'}
                  </a>
                ) : (
                  <AssinarButton
                    planoNome={p.nome}
                    precoNormal={p.preco}
                    precoFundador={p.precoFundador ?? p.preco}
                    urlNormal={urlNormal}
                    urlFundador={urlFundador}
                    fundadorDisponivel={fundadorDisponivel && !!p.ofertaFundador}
                    jaAssinante={jaAssinante}
                    vagasRestantes={vagasRestantes}
                    vagasTotal={vagasTotal}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
