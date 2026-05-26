import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { Check, Crown } from 'lucide-react';
import AssinarButton from './AssinarButton';

const CHECKOUT_BASE =
  process.env.NEXT_PUBLIC_CHECKOUT_BASE ?? 'https://pay.sutofly.com/checkout.php';

interface PlanoRow {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  categoria: 'basico' | 'pro';
  preco_normal: number | null;
  limite_atendimentos: number | null;
  duracao_dias: number;
  fundador: boolean;
}

// Features fixas por categoria (não estão na tabela ainda; futuro: coluna features JSONB)
const FEATURES_POR_CATEGORIA: Record<'basico' | 'pro', string[]> = {
  basico: [
    '1 número de WhatsApp (Z-API ou Meta API Oficial)',
    'IA completa',
    '2 entregadores',
    'Suporte prioritário',
  ],
  pro: [
    'Até 3 números de WhatsApp (Z-API ou Meta API Oficial)',
    'Mesmo agente nos 3 números',
    'Entregadores ilimitados',
    'Relatórios avançados',
  ],
};

function formatPreco(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function checkoutUrl(oferta: string, agenciaId: string, email: string, jaAssinante: boolean) {
  const modo = jaAssinante ? '1clickupgrade' : '1click';
  const params = new URLSearchParams({ o: oferta, m: modo, agencia_id: agenciaId, email });
  return `${CHECKOUT_BASE}?${params.toString()}`;
}

export default async function PlanosPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;

  const db = supabaseAdmin();

  const [{ data: ag }, { data: cfg }, { data: planosRows }] = await Promise.all([
    agenciaId
      ? db
          .from('agencias')
          .select('plano, plano_slug, status_conta, programa_fundador, fundador_desconto_ate')
          .eq('id', agenciaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from('programa_fundador_config')
      .select('vagas_total, vagas_usadas, ativo')
      .eq('ativo', true)
      .maybeSingle(),
    db
      .from('planos')
      .select('*')
      .eq('ativo', true)
      .eq('publico', true)
      .order('fundador', { ascending: true })
      .order('categoria', { ascending: true })
      .order('preco_normal', { ascending: true }),
  ]);

  const planos = (planosRows as PlanoRow[] | null) ?? [];
  const planoAtual = ag?.plano ?? 'trial';
  const planoSlugAtual = ag?.plano_slug ?? null;
  const jaAssinante = !!ag && planoAtual !== 'trial' && ag.status_conta === 'ativo';
  const ehFundador = !!ag?.programa_fundador;

  const vagasTotal = cfg?.vagas_total ?? 50;
  const vagasRestantes = cfg
    ? Math.max(0, (cfg.vagas_total ?? 0) - (cfg.vagas_usadas ?? 0))
    : 0;
  const fundadorDisponivel = !!cfg?.ativo && vagasRestantes > 0;

  // Separa normais x fundadores. Para cada normal, tenta achar o fundador equivalente
  // pela mesma categoria (basico fundador para basico normal, pro fundador para pro normal).
  const normais = planos.filter((p) => !p.fundador);
  const fundadores = planos.filter((p) => p.fundador);
  function fundadorPara(categoria: 'basico' | 'pro'): PlanoRow | undefined {
    return fundadores.find((f) => f.categoria === categoria);
  }

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
        {/* Trial fixo */}
        <PlanoCard
          atual={planoAtual === 'trial'}
          nome="Trial"
          preco="Grátis"
          detalhe="7 dias OU 20 atendimentos"
          features={['Número demo ou real', 'IA completa', '1 entregador', 'Sem cartão']}
          botao={
            <button
              disabled
              className="block w-full text-center bg-gray-100 text-gray-500 font-medium py-2 rounded-lg cursor-not-allowed"
            >
              {planoAtual === 'trial' ? 'Plano atual' : 'Indisponível'}
            </button>
          }
        />

        {/* Planos dinâmicos */}
        {normais.map((p) => {
          const fundador = fundadorPara(p.categoria);
          const precoNormal = formatPreco(p.preco_normal);
          const precoFundador = fundador ? formatPreco(fundador.preco_normal) : null;

          const urlNormal =
            agenciaId && email ? checkoutUrl(p.slug, agenciaId, email, jaAssinante) : '';
          const urlFundador =
            fundador && agenciaId && email
              ? checkoutUrl(fundador.slug, agenciaId, email, jaAssinante)
              : '';

          // Plano atual: bate por slug exato, ou (legado) pela categoria com slug nulo
          const atual =
            planoSlugAtual === p.slug ||
            planoSlugAtual === fundador?.slug ||
            (!planoSlugAtual && planoAtual === p.categoria);

          // Preço exibido: se já é fundador e há fundador equivalente, mostra com desconto
          const usarPrecoFundador = ehFundador && !!fundador;

          return (
            <PlanoCard
              key={p.id}
              atual={atual}
              nome={p.nome}
              preco={usarPrecoFundador && precoFundador ? precoFundador : precoNormal}
              precoRiscado={usarPrecoFundador ? precoNormal : undefined}
              detalhe={
                p.descricao ??
                `por ${p.duracao_dias} dias · ${
                  p.limite_atendimentos == null
                    ? 'atendimentos ilimitados'
                    : `${p.limite_atendimentos} atendimentos`
                }`
              }
              features={FEATURES_POR_CATEGORIA[p.categoria]}
              botao={
                !urlNormal ? (
                  <button
                    disabled
                    className="block w-full text-center bg-gray-100 text-gray-500 font-medium py-2 rounded-lg cursor-not-allowed"
                  >
                    {atual ? 'Plano atual' : 'Indisponível'}
                  </button>
                ) : ehFundador ? (
                  <a
                    href={urlFundador || urlNormal}
                    className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition"
                  >
                    {jaAssinante ? 'Fazer upgrade' : 'Assinar'}
                  </a>
                ) : (
                  <AssinarButton
                    planoNome={p.nome}
                    precoNormal={precoNormal}
                    precoFundador={precoFundador ?? precoNormal}
                    urlNormal={urlNormal}
                    urlFundador={urlFundador}
                    ofertaFundador={fundador?.slug ?? ''}
                    fundadorDisponivel={fundadorDisponivel && !!fundador}
                    jaAssinante={jaAssinante}
                    vagasRestantes={vagasRestantes}
                    vagasTotal={vagasTotal}
                  />
                )
              }
            />
          );
        })}
      </div>

      {normais.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
          Nenhum plano público disponível no momento. Entre em contato para mais informações.
        </div>
      )}
    </div>
  );
}

function PlanoCard({
  atual,
  nome,
  preco,
  precoRiscado,
  detalhe,
  features,
  botao,
}: {
  atual: boolean;
  nome: string;
  preco: string;
  precoRiscado?: string;
  detalhe: string;
  features: string[];
  botao: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-6 flex flex-col ${
        atual ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-bold">{nome}</h3>
        {atual && (
          <span className="text-xs uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
            Atual
          </span>
        )}
      </div>
      <div className="mt-3">
        <div>
          <span className="text-3xl font-bold">{preco}</span>
          {precoRiscado && (
            <span className="ml-2 text-sm text-gray-400 line-through">{precoRiscado}</span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{detalhe}</p>
      </div>

      <ul className="mt-4 space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">{botao}</div>
    </div>
  );
}
