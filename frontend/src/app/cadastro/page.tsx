'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showSenha2, setShowSenha2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha !== senha2) {
      setError('As senhas não conferem.');
      return;
    }
    const whatsappDigits = whatsapp.replace(/\D/g, '');
    if (whatsappDigits.length < 10) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }
    if (senha.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, whatsapp: whatsappDigits, senha }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      // login automático após cadastro
      const result = await signIn('credentials', {
        email,
        password: senha,
        redirect: false,
      });
      if (result?.error) {
        setError('Cadastro criado, mas falhou ao entrar. Tente fazer login.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-orange-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo variant="full" size={64} className="flex-col text-center" />
          <h2 className="text-2xl font-bold mt-3">Crie sua conta</h2>
          <p className="text-gray-500 text-sm">7 dias grátis · sem cartão</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Seu nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="voce@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp</label>
            <input
              required
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="(11) 91234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <div className="relative">
              <input
                required
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              >
                {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar senha</label>
            <div className="relative">
              <input
                required
                type={showSenha2 ? 'text' : 'password'}
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowSenha2((v) => !v)}
                aria-label={showSenha2 ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              >
                {showSenha2 ? <EyeOff size={18} /> : <Eye size={18} />}
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
            {loading ? 'Criando conta...' : 'Criar conta grátis — 7 dias'}
          </button>

          <p className="text-sm text-center text-gray-600">
            Já tem conta?{' '}
            <Link href="/login" className="text-orange-600 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
