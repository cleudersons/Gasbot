import Link from 'next/link';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { Crown } from 'lucide-react';

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
          'nome, plano, status_conta, trial_inicio, trial_atendimentos, vencimento_plano, limite_atendimentos, programa_fundador, fundador_desconto_ate, whatsapp_dono, proxima_cobranca, recorrencia_ativa',
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-gray-600 text-sm mt-1">
          Seus dados e o status da sua assinatura.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Dados da conta</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Nome" value={nomeUsuario} />
          <Field label="E-mail" value={emailUsuario} />
          <Field label="WhatsApp" value={ag?.whatsapp_dono ?? '—'} />
          <Field label="Depósito" value={ag?.nome ?? '—'} />
        </dl>
      </section>

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
            label="Atendimentos"
            value={
              ehTrial
                ? `${ag?.trial_atendimentos ?? 0} / 20 (trial)`
                : ag?.limite_atendimentos == null
                  ? `${ag?.trial_atendimentos ?? 0} usados · ilimitado`
                  : `${ag?.trial_atendimentos ?? 0} / ${ag.limite_atendimentos}`
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900 break-words">{value}</dd>
    </div>
  );
}
