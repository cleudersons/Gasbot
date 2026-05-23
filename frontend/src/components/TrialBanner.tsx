import Link from 'next/link';

interface Props {
  statusConta: string | null;
  trialInicio: string | null;
  trialAtendimentos: number;
}

const LIMITE_ATEND = 20;
const LIMITE_DIAS = 7;

export default function TrialBanner({ statusConta, trialInicio, trialAtendimentos }: Props) {
  if (statusConta !== 'trial') return null;

  const inicio = trialInicio ? new Date(trialInicio).getTime() : Date.now();
  const diasPassados = (Date.now() - inicio) / (24 * 60 * 60 * 1000);
  const diasRestantes = Math.max(0, Math.ceil(LIMITE_DIAS - diasPassados));
  const atendRestantes = Math.max(0, LIMITE_ATEND - (trialAtendimentos ?? 0));
  const expirado = diasPassados > LIMITE_DIAS || trialAtendimentos >= LIMITE_ATEND;

  if (expirado) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between gap-3">
        <div className="text-sm text-red-800">
          <strong>⏰ Trial expirado.</strong> Assine para continuar atendendo seus clientes.
        </div>
        <Link
          href="/dashboard/configuracoes"
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
        >
          Assinar agora
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between gap-3">
      <div className="text-sm text-yellow-900">
        🎉 <strong>Trial:</strong> {atendRestantes} atendimentos restantes ·{' '}
        {diasRestantes} dia(s) restantes
      </div>
      <Link
        href="/dashboard/configuracoes"
        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
      >
        Assinar agora
      </Link>
    </div>
  );
}
