'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErro(json.error ?? 'Erro ao processar solicitação');
      } else {
        setEnviado(true);
      }
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-orange-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo variant="full" size={64} className="flex-col text-center" />
          <p className="text-gray-500 text-sm mt-3">Redefinir senha</p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              Se este email estiver cadastrado, enviamos um link para redefinir sua senha. Confira sua caixa de entrada (e também a pasta de spam).
              <br /><br />
              <strong>O link expira em 1 hora.</strong>
            </div>
            <Link
              href="/login"
              className="block text-center text-orange-600 hover:underline text-sm"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Digite o email cadastrado e enviaremos um link para você criar uma nova senha.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="voce@empresa.com"
                autoComplete="email"
              />
            </div>

            {erro && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 rounded-lg transition"
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <p className="text-sm text-center text-gray-600">
              Lembrou a senha?{' '}
              <Link href="/login" className="text-orange-600 hover:underline">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
