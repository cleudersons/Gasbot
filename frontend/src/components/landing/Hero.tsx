import LeadForm from './LeadForm';

export default function Hero() {
  return (
    <section id="cadastro" className="relative overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#1A1A2E] to-[#2a1a3e] text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-600 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Teste grátis por 7 dias
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            Seu depósito de gás no <span className="text-orange-400">piloto automático</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-6 leading-relaxed">
            IA que atende clientes no WhatsApp, organiza entregas e traz seus clientes de volta automaticamente.
          </p>

          <ul className="space-y-2 text-sm text-gray-300 max-w-md mx-auto md:mx-0">
            <Bullet>Atendimento 24h sem precisar contratar ninguém</Bullet>
            <Bullet>Pedidos confirmados direto no painel</Bullet>
            <Bullet>Distribuição automática entre entregadores</Bullet>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl mx-auto md:mx-0 w-full">
          <h2 className="text-[#1A1A2E] text-lg font-bold mb-1">Crie sua conta grátis</h2>
          <p className="text-gray-500 text-xs mb-5">2 minutos pra começar a atender no piloto automático.</p>
          <LeadForm />
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
