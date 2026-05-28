'use client';

import { useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!token) {
      setErro('Link inválido — token ausente.');
      return;
    }
    if (senha.length < 8) {
      setErro('Senha precisa ter ao menos 8 caracteres');
      return;
    }
    if (senha !== confirma) {
      setErro('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? 'Erro ao redefinir senha');
      } else {
        setSucesso(true);
        setTimeout(() => router.push('/login'), 2500);
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
          <p className="text-gray-500 text-sm mt-3">Criar nova senha</p>
        </div>

        {sucesso ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              ✅ Senha atualizada com sucesso! Redirecionando para o login...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="senha">Nova senha</label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrar ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                >
                  {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="confirma">Confirmar nova senha</label>
              <input
                id="confirma"
                type={mostrar ? 'text' : 'password'}
                required
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                minLength={8}
                autoComplete="new-password"
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
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>

            <p className="text-sm text-center text-gray-600">
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
