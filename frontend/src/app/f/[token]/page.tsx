import { supabaseAdmin } from '@/lib/supabase-server';
import Logo from '@/components/Logo';
import FormFeedbackFundador from '@/app/dashboard/feedback-fundador/FormFeedbackFundador';

export default async function FormularioPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: ag } = await supabaseAdmin()
    .from('agencias')
    .select('nome, programa_fundador, fundador_feedback_prazo')
    .eq('fundador_feedback_token', token)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <Logo variant="row" size={32} />
      </header>
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        {!ag || !ag.programa_fundador ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Link inválido</h1>
            <p className="text-sm text-gray-600 mt-2">
              Esse formulário não está disponível. Confira se o link está correto
              ou peça um novo ao suporte do SutoGas.
            </p>
          </div>
        ) : (
          <FormFeedbackFundador
            token={token}
            prazo={ag.fundador_feedback_prazo}
            agenciaNome={ag.nome ?? undefined}
          />
        )}
      </main>
    </div>
  );
}
