import LeadForm from './LeadForm';

export default function CTAFinal() {
  return (
    <section className="bg-gradient-to-br from-[#1A1A2E] to-[#2a1a3e] py-16 sm:py-24 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Comece grátis em 2 minutos
        </h2>
        <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-xl mx-auto">
          Teste por 7 dias sem cartão de crédito. Se gostar, assina. Se não gostar, cancela.
        </p>

        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl max-w-md mx-auto">
          <LeadForm ctaLabel="Quero testar grátis" variant="final" />
        </div>
      </div>
    </section>
  );
}
