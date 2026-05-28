import { Clock, ListChecks, Users, Brain, BarChart3, Plug } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock,
    titulo: 'Atendimento 24h no WhatsApp',
    texto: 'Sua IA nunca dorme. Cliente manda às 2h da manhã, o agente atende.',
  },
  {
    icon: ListChecks,
    titulo: 'Pedidos automáticos no painel',
    texto: 'Pedido confirmado vira card no dashboard em tempo real, com endereço e Google Maps.',
  },
  {
    icon: Users,
    titulo: 'Distribuição entre entregadores',
    texto: '4 modos: todos, revezamento, zonas geográficas ou manual. Você escolhe.',
  },
  {
    icon: Brain,
    titulo: 'Inteligência preditiva de recompra',
    texto: 'Sistema prevê quando o cliente vai precisar de gás novamente e dispara lembrete.',
  },
  {
    icon: BarChart3,
    titulo: 'Relatórios automáticos',
    texto: 'Diário, semanal ou mensal — direto no seu WhatsApp ou painel.',
  },
  {
    icon: Plug,
    titulo: 'Meta API oficial e Z-API',
    texto: 'Conecte com o jeito que preferir. Suporte aos dois sem mudar nada na operação.',
  },
];

export default function Features() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-orange-600 font-semibold text-sm uppercase tracking-wider mb-2">
            Tudo o que você precisa
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">
            Um sistema completo pra depósitos de gás
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.titulo}
                className="bg-[#F8F5F0] rounded-2xl p-6 hover:bg-orange-50 transition border border-transparent hover:border-orange-200"
              >
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
                  <Icon size={22} className="text-orange-600" />
                </div>
                <h3 className="text-base font-bold text-[#1A1A2E] mb-1.5">{f.titulo}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.texto}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
