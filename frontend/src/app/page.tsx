import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">SutoGas</h1>
      <p className="text-gray-600 mb-8">Automação inteligente para distribuidoras de gás.</p>
      <Link
        href="/login"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Entrar
      </Link>
    </main>
  );
}
