const STATUS_STYLES: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  aceito: 'bg-blue-100 text-blue-800 border-blue-200',
  em_entrega: 'bg-purple-100 text-purple-800 border-purple-200',
  entregue: 'bg-green-100 text-green-800 border-green-200',
  entregue_nao_confirmado: 'bg-orange-100 text-orange-800 border-orange-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  em_entrega: 'Em entrega',
  entregue: 'Entregue',
  entregue_nao_confirmado: '⚠️ Não confirmado',
  cancelado: 'Cancelado',
};

export default function Badge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${style}`}
    >
      {label}
    </span>
  );
}
