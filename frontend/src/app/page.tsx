import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-orange-50">
      <Logo variant="full" size={88} className="flex-col text-center mb-6" />
      <p className="text-gray-700 mb-8 max-w-md text-center">
        Automação inteligente via WhatsApp para depósitos de gás e água mineral.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition font-medium"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition font-medium"
        >
          Criar conta grátis
        </Link>
      </div>
    </main>
  );
}
