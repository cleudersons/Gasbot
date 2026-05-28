import { MessageCircle, Bot, Truck } from 'lucide-react';

const PASSOS = [
  {
    icon: MessageCircle,
    titulo: 'Conecte seu WhatsApp',
    texto:
      'Em 2 minutos via Meta API oficial ou Z-API. Seu número de sempre, sem mudar nada na operação.',
  },
  {
    icon: Bot,
    titulo: 'IA atende e registra pedidos',
    texto:
      'Cliente manda mensagem, agente responde, confirma o pedido com pagamento e cria entrada no painel.',
  },
  {
    icon: Truck,
    titulo: 'Entregador recebe e confirma',
    texto:
      'Distribuição automática (todos, revezamento, zonas ou manual). Entregador responde ACEITO no WhatsApp.',
  },
];

export default function ComoFunciona() {
  return (
    <section className="bg-[#F8F5F0] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-orange-600 font-semibold text-sm uppercase tracking-wider mb-2">
            Como funciona
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E]">
            3 passos pra colocar tudo no automático
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {PASSOS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.titulo}
                className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-100 hover:shadow-md transition relative"
              >
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                  {i + 1}
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={24} className="text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{p.titulo}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{p.texto}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
