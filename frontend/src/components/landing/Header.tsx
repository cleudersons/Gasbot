import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Header() {
  return (
    <header className="bg-white/95 backdrop-blur sticky top-0 z-30 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Logo variant="row" size={32} />
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          <Link
            href="/login"
            className="px-3 py-1.5 text-gray-700 hover:text-orange-600 font-medium"
          >
            Entrar
          </Link>
          <a
            href="#cadastro"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition"
          >
            Criar conta grátis
          </a>
        </nav>
      </div>
    </header>
  );
}
