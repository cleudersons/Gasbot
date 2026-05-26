import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import FormFeedbackFundador from './FormFeedbackFundador';

export default async function FeedbackFundadorPage() {
  const session = await auth();
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;
  if (!agenciaId) redirect('/login');

  const { data: ag } = await supabaseAdmin()
    .from('agencias')
    .select('nome, programa_fundador, fundador_feedback_prazo, fundador_feedback_token')
    .eq('id', agenciaId)
    .maybeSingle();

  if (!ag?.programa_fundador) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold">Pesquisa exclusiva pra fundadores</h1>
        <p className="text-sm text-gray-600 mt-2">
          Esse formulário é só pra clientes do Programa Premium Fundador.
        </p>
      </div>
    );
  }

  const publico = ag.fundador_feedback_token
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${ag.fundador_feedback_token}`
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <FormFeedbackFundador
        prazo={ag.fundador_feedback_prazo}
        agenciaNome={ag.nome ?? undefined}
        redirectAposEnvio="/dashboard"
      />
      {publico && (
        <p className="text-xs text-gray-500 text-center">
          Link público (você também pode responder por aqui):{' '}
          <span className="font-mono">{publico}</span>
        </p>
      )}
    </div>
  );
}
