import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import ComoFunciona from '@/components/landing/ComoFunciona';
import Features from '@/components/landing/Features';
import FAQ from '@/components/landing/FAQ';
import CTAFinal from '@/components/landing/CTAFinal';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'SutoGas — Seu depósito no piloto automático',
  description:
    'IA que atende clientes no WhatsApp, organiza entregas e traz clientes de volta. Teste grátis por 7 dias.',
  keywords: 'depósito de gás, atendimento WhatsApp, automação, IA, pedidos automáticos, água mineral',
};

export default function Home() {
  return (
    <main className="bg-white">
      <Header />
      <Hero />
      <ComoFunciona />
      <Features />
      <FAQ />
      <CTAFinal />
      <Footer />
    </main>
  );
}
