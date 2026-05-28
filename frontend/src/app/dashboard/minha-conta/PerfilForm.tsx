'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  inicial: {
    nome_deposito: string;
    cidade: string;
    estado: string;
    cpf_cnpj: string;
  };
  completo: boolean;
}

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function formatarCpfCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export default function PerfilForm({ inicial, completo }: Props) {
  const router = useRouter();
  const [nomeDeposito, setNomeDeposito] = useState(inicial.nome_deposito);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [estado, setEstado] = useState(inicial.estado);
  const [cpfCnpj, setCpfCnpj] = useState(formatarCpfCnpj(inicial.cpf_cnpj));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch('/api/minha-conta/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_deposito: nomeDeposito,
          cidade,
          estado,
          cpf_cnpj: cpfCnpj,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tipo: 'erro', texto: json.error ?? 'Erro ao salvar' });
      } else {
        setMsg({ tipo: 'ok', texto: 'Perfil atualizado!' });
        router.refresh();
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Falha de rede' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Dados do depósito</h2>
        {completo ? (
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full font-semibold">
            <CheckCircle2 size={12} /> Completo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-semibold">
            <AlertCircle size={12} /> Incompleto
          </span>
        )}
      </div>

      <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome do depósito">
          <input
            type="text"
            value={nomeDeposito}
            onChange={(e) => setNomeDeposito(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Depósito de Gás Central"
          />
        </Field>

        <Field label="CPF ou CNPJ">
          <input
            type="text"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
        </Field>

        <Field label="Cidade">
          <input
            type="text"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Uberlândia"
          />
        </Field>

        <Field label="Estado (UF)">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">Selecione...</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </Field>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            {salvando ? 'Salvando...' : 'Salvar perfil'}
          </button>
          {msg && (
            <span
              className={`text-sm ${msg.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}
            >
              {msg.texto}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
