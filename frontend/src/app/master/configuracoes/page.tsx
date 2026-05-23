export default function MasterConfiguracoesPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações Master</h1>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-2">Sobre o painel</h2>
        <p className="text-sm text-gray-600">
          Este painel é restrito aos administradores do SutoGas. Use o menu lateral para gerenciar
          agências e ver métricas globais.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-2">Credenciais globais</h2>
        <p className="text-sm text-gray-500">
          Configurações como <code>OPENAI_API_KEY</code>, <code>META_VERIFY_TOKEN</code> e chaves
          padrão da Z-API ficam no <code>.env</code> do backend. Para alterá-las, atualize o
          deploy.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-2">Jobs automáticos</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Entregas não confirmadas:</strong> roda a cada 10 minutos.</li>
          <li>• <strong>Relatórios:</strong> roda a cada 1 hora; envia às 20h conforme a frequência configurada por agência.</li>
        </ul>
      </section>
    </div>
  );
}
