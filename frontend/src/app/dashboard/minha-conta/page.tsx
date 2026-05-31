import Link from 'next/link';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { Crown } from 'lucide-react';
import PerfilForm from './PerfilForm';
import SenhaForm from './SenhaForm';
import { perfilCompleto } from '@/lib/perfil';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function diasRestantes(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

const PLANO_LABEL: Record<string, string> = {
  trial: 'Trial',
  basico: 'Básico',
  pro: 'Pro',
};

export default async function MinhaContaPage() {
  const session = await auth();
  const nomeUsuario = session?.user?.name ?? '—';
  const emailUsuario = session?.user?.email ?? '—';
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;

  const db = supabaseAdmin();
  const { data: ag } = agenciaId
    ? await db
        .from('agencias')
        .select(
          'nome, plano, status_conta, trial_inicio, trial_atendimentos, vencimento_plano, limite_atendimentos, programa_fundador, fundador_desconto_ate, whatsapp_dono, proxima_cobranca, recorrencia_ativa, nome_deposito, cidade, estado, cpf_cnpj, inadimplente_desde, suspensa_em',
        )
        .eq('id', agenciaId)
        .maybeSingle()
    : { data: null };

  const plano = ag?.plano ?? 'trial';
  const ehTrial = plano === 'trial';
  const trialFim = ag?.trial_inicio
    ? new Date(new Date(ag.trial_inicio).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const diasTrial = ehTrial ? diasRestantes(trialFim) : null;
  const diasVencimento = !ehTrial ? diasRestantes(ag?.vencimento_plano) : null;

  // Banner de status: prioridade suspenso > inadimplente > vencimento próximo
  const statusConta = ag?.status_conta;
  let banner: { tipo: 'suspenso' | 'inadimplente' | 'vencendo'; titulo: string; mensagem: string } | null = null;
  if (statusConta === 'suspenso') {
    banner = {
      tipo: 'suspenso',
      titulo: 'Sua conta está suspensa',
      mensagem: 'O agente parou de atender seus clientes. Renove o pagamento para reativar.',
    };
  } else if (statusConta === 'inadimplente') {
    const desde = ag?.inadimplente_desde ? new Date(ag.inadimplente_desde) : null;
    const diasDecorridos = desde
      ? Math.floor((Date.now() - desde.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    const diasRestantesSuspensao = Math.max(0, 3 - diasDecorridos);
    banner = {
      tipo: 'inadimplente',
      titulo: 'Sua última cobrança não foi aprovada',
      mensagem:
        diasRestantesSuspensao > 0
          ? `Renove em até ${diasRestantesSuspensao} dia${diasRestantesSuspensao === 1 ? '' : 's'} para o agente não suspender o atendimento.`
          : 'Sua conta será suspensa a qualquer momento. Renove agora.',
    };
  } else if (!ehTrial && diasVencimento != null && diasVencimento <= 3) {
    banner = {
      tipo: 'vencendo',
      titulo: `Sua renovação vence em ${diasVencimento} dia${diasVencimento === 1 ? '' : 's'}`,
      mensagem: ag?.recorrencia_ativa
        ? 'A cobrança automática deve acontecer na data do vencimento. Se algo der errado, avisamos por email.'
        : 'Sua assinatura não tem recorrência ativa. Renove para não interromper o atendimento.',
    };
  }

  // Contagem de pedidos confirmados nos últimos 30 dias (plano pago)
  // ou desde o início do trial (trial). Usado para mostrar uso vs limite.
  let pedidosUsados = 0;
  if (agenciaId) {
    const desde = ehTrial && ag?.trial_inicio
      ? new Date(ag.trial_inicio).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('agencia_id', agenciaId)
      .neq('status', 'cancelado')
      .gte('criado_em', desde);
    pedidosUsados = count ?? 0;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-gray-600 text-sm mt-1">
          Seus dados e o status da sua assinatura.
        </p>
      </div>

      {banner && <BannerStatus banner={banner} />}

      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Dados da conta</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Titular" value={nomeUsuario} />
          <Field label="E-mail" value={emailUsuario} />
          <Field label="WhatsApp" value={ag?.whatsapp_dono ?? '—'} />
        </dl>
      </section>

      <PerfilForm
        inicial={{
          nome_deposito: ag?.nome_deposito ?? '',
          cidade: ag?.cidade ?? '',
          estado: ag?.estado ?? '',
          cpf_cnpj: ag?.cpf_cnpj ?? '',
        }}
        completo={perfilCompleto(ag)}
      />

      <SenhaForm />

      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Assinatura</h2>
          {ag?.programa_fundador && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-semibold">
              <Crown size={12} /> Premium Fundador
            </span>
          )}
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field
            label="Plano atual"
            value={`${PLANO_LABEL[plano] ?? plano}${ag?.status_conta ? ` · ${ag.status_conta}` : ''}`}
          />
          {ehTrial ? (
            <Field
              label="Trial encerra em"
              value={
                diasTrial != null
                  ? `${diasTrial} dia${diasTrial === 1 ? '' : 's'} (${formatDate(trialFim)})`
                  : '—'
              }
            />
          ) : (
            <Field
              label="Vencimento"
              value={
                diasVencimento != null
                  ? `${diasVencimento} dia${diasVencimento === 1 ? '' : 's'} (${formatDate(ag?.vencimento_plano)})`
                  : '—'
              }
            />
          )}
          <Field
            label={ehTrial ? 'Pedidos no trial' : 'Pedidos no mês'}
            value={
              ehTrial
                ? `${pedidosUsados} / 20`
                : ag?.limite_atendimentos == null
                  ? `${pedidosUsados} pedidos · ilimitado`
                  : `${pedidosUsados} / ${ag.limite_atendimentos}`
            }
          />
          {!ehTrial && (
            <Field
              label="Próxima cobrança"
              value={
                ag?.recorrencia_ativa
                  ? formatDate(ag?.proxima_cobranca)
                  : 'sem recorrência'
              }
            />
          )}
          {ag?.programa_fundador && (
            <Field
              label="Desconto fundador até"
              value={formatDate(ag?.fundador_desconto_ate)}
            />
          )}
        </dl>

        <div className="mt-5">
          <Link
            href="/dashboard/planos"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            {ehTrial ? 'Assinar agora' : 'Fazer upgrade / renovar'}
          </Link>
        </div>
      </section>
    </div>
  );
}

function BannerStatus({
  banner,
}: {
  banner: { tipo: 'suspenso' | 'inadimplente' | 'vencendo'; titulo: string; mensagem: string };
}) {
  const estilos: Record<typeof banner.tipo, { box: string; titulo: string; texto: string; botao: string; ctaLabel: string }> = {
    suspenso: {
      box: 'bg-red-50 border-red-300',
      titulo: 'text-red-900',
      texto: 'text-red-800',
      botao: 'bg-red-600 hover:bg-red-700',
      ctaLabel: 'Reativar minha conta',
    },
    inadimplente: {
      box: 'bg-amber-50 border-amber-300',
      titulo: 'text-amber-900',
      texto: 'text-amber-800',
      botao: 'bg-amber-600 hover:bg-amber-700',
      ctaLabel: 'Regularizar agora',
    },
    vencendo: {
      box: 'bg-sky-50 border-sky-300',
      titulo: 'text-sky-900',
      texto: 'text-sky-800',
      botao: 'bg-sky-600 hover:bg-sky-700',
      ctaLabel: 'Renovar',
    },
  };
  const s = estilos[banner.tipo];
  return (
    <div className={`border rounded-2xl p-5 ${s.box}`}>
      <h2 className={`font-semibold ${s.titulo}`}>{banner.titulo}</h2>
      <p className={`text-sm mt-1 ${s.texto}`}>{banner.mensagem}</p>
      <Link
        href="/dashboard/planos"
        className={`inline-block mt-4 text-white font-medium px-4 py-2 rounded-lg transition ${s.botao}`}
      >
        {s.ctaLabel}
      </Link>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900 break-words">{value}</dd>
    </div>
  );
}
