'use client';

import { useCallback, useEffect, useState } from 'react';

export default function MasterConfiguracoesPage() {
  const [pausado, setPausado] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/master/configuracoes', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setPausado(json.agente_demo_pausado === true);
    } catch (err: any) {
      setMsg(`Erro ao carregar: ${err?.message ?? err}`);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function alternar() {
    if (pausado === null) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/master/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agente_demo_pausado: !pausado }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setPausado(json.agente_demo_pausado === true);
      setMsg('✅ Salvo');
    } catch (err: any) {
      setMsg(`Erro: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações Master</h1>

      <section
        className={`rounded-xl border p-5 flex items-center justify-between ${
          pausado ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}
      >
        <div>
          <div className="font-semibold">
            {pausado ? '⏸ Agente demo/teste pausado' : '🟢 Agente demo/teste ativo'}
          </div>
          <p className="text-xs text-gray-600 max-w-md">
            Pausa o bot para TODAS as conversas no número demo/teste de uma vez —
            diferente do "Pausar agente" dentro de cada agência, que só afeta uma
            conta trial já criada. Não mexe em agências pagas.
          </p>
        </div>
        <button
          onClick={alternar}
          disabled={pausado === null || saving}
          className={`px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-60 ${
            pausado ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {pausado === null ? 'Carregando…' : pausado ? 'Reativar agente demo' : 'Pausar agente demo'}
        </button>
      </section>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-2">Sobre o painel</h2>
        <p className="text-sm text-gray-600">
          Este painel é restrito aos administradores do SutoGas. Use o menu lateral para gerenciar
          agências e ver métricas globais.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-2">Credenciais globais</h2>
        <p className="text-sm text-gray-500">
          Configurações como <code>OPENAI_API_KEY</code>, <code>META_VERIFY_TOKEN</code> e chaves
          padrão da Z-API ficam no <code>.env</code> do backend. Para alterá-las, atualize o
          deploy.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-2">Jobs automáticos</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Entregas não confirmadas:</strong> roda a cada 10 minutos.</li>
          <li>• <strong>Relatórios:</strong> roda a cada 1 hora; envia às 20h conforme a frequência configurada por agência.</li>
        </ul>
      </section>
    </div>
  );
}
