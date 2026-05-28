'use client';

import { useState, FormEvent } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function SenhaForm() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (novaSenha.length < 8) {
      setMsg({ tipo: 'erro', texto: 'Nova senha precisa ter ao menos 8 caracteres' });
      return;
    }
    if (novaSenha !== confirma) {
      setMsg({ tipo: 'erro', texto: 'As senhas não coincidem' });
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/minha-conta/senha', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tipo: 'erro', texto: json.error ?? 'Erro ao trocar senha' });
      } else {
        setMsg({ tipo: 'ok', texto: 'Senha atualizada!' });
        setSenhaAtual('');
        setNovaSenha('');
        setConfirma('');
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Falha de rede' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={18} className="text-gray-700" />
        <h2 className="text-lg font-semibold">Segurança</h2>
      </div>

      <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Senha atual
          </label>
          <div className="relative">
            <input
              type={mostrar ? 'text' : 'password'}
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              aria-label={mostrar ? 'Ocultar' : 'Mostrar'}
              className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
            >
              {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Nova senha
          </label>
          <input
            type={mostrar ? 'text' : 'password'}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Confirmar nova senha
          </label>
          <input
            type={mostrar ? 'text' : 'password'}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            autoComplete="new-password"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            {salvando ? 'Salvando...' : 'Trocar senha'}
          </button>
          {msg && (
            <span className={`text-sm ${msg.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
              {msg.texto}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
