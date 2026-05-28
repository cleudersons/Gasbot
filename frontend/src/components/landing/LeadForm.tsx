'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

function formatarWhatsapp(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

interface Props {
  ctaLabel?: string;
  variant?: 'hero' | 'final';
}

export default function LeadForm({ ctaLabel = 'Criar conta grátis', variant = 'hero' }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emailDuplicado, setEmailDuplicado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEmailDuplicado(false);

    const wsDigitos = whatsapp.replace(/\D/g, '');
    if (wsDigitos.length < 10) {
      setErro('WhatsApp incompleto (com DDD)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, whatsapp: wsDigitos }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) setEmailDuplicado(true);
        setErro(json.error ?? 'Erro ao criar conta');
        return;
      }

      const senha = json.senha_temporaria;
      if (!senha) {
        setErro('Conta criada, mas faça login manualmente.');
        router.push('/login');
        return;
      }

      const result = await signIn('credentials', {
        email,
        password: senha,
        redirect: false,
      });

      if (result?.error) {
        setErro('Conta criada, mas o login falhou. Tente entrar manualmente.');
        router.push('/login');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-md">
      <input
        type="text"
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome"
        className={inputBase}
        autoComplete="name"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        className={inputBase}
        autoComplete="email"
      />
      <input
        type="tel"
        required
        value={whatsapp}
        onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))}
        placeholder="WhatsApp (com DDD)"
        className={inputBase}
        autoComplete="tel"
      />

      {erro && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
          {emailDuplicado && (
            <>
              {' '}
              <Link href="/login" className="font-semibold underline">
                Fazer login
              </Link>
              .
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-lg transition shadow-lg shadow-orange-500/20"
      >
        {loading ? 'Criando sua conta...' : ctaLabel}
      </button>

      <p className="text-xs text-center text-gray-500">
        Trial grátis por 7 dias · Sem cartão · Cancele quando quiser
      </p>
    </form>
  );
}
