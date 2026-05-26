'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('E-mail ou senha inválidos.');
      } else {
        // Descobre se é master pela sessão recém-criada
        let destino = '/dashboard';
        try {
          const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
          const session = await sessionRes.json();
          if (session?.user?.isMaster) destino = '/master';
        } catch {}
        router.push(destino);
        router.refresh();
      }
    } catch {
      setError('Falha ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-orange-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo variant="full" size={64} className="flex-col text-center" />
          <p className="text-gray-500 text-sm mt-3">Painel administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              E-mail
            </label>
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

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 rounded-lg transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-sm text-center text-gray-600">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-orange-600 hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
