'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Entregador {
  id: string;
  nome: string;
  whatsapp: string;
  ativo: boolean;
  agencia_id: string;
}

interface Zona {
  id: string;
  zona: string;
}

export default function EntregadoresPage() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [expedienteInicio, setExpedienteInicio] = useState('07:00');
  const [expedienteFim, setExpedienteFim] = useState('18:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modoDistribuicao, setModoDistribuicao] = useState<string>('todos');

  const [zonasOpen, setZonasOpen] = useState(false);
  const [zonasDe, setZonasDe] = useState<Entregador | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [novaZona, setNovaZona] = useState('');
  const [loadingZonas, setLoadingZonas] = useState(false);

  const fetchEntregadores = useCallback(async () => {
    try {
      const res = await fetch('/api/entregadores', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setEntregadores((json.entregadores ?? []) as Entregador[]);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao buscar entregadores');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModo = useCallback(async () => {
    try {
      const res = await fetch('/api/configuracoes', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.agencia) {
        setModoDistribuicao(json.agencia.distribuicao_modo ?? 'todos');
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchEntregadores();
    fetchModo();
  }, [fetchEntregadores, fetchModo]);

  async function toggleAtivo(e: Entregador) {
    const res = await fetch('/api/entregadores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, ativo: !e.ativo }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.error ?? `HTTP ${res.status}`);
    } else {
      fetchEntregadores();
    }
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/entregadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          whatsapp,
          expediente_inicio: expedienteInicio || null,
          expediente_fim: expedienteFim || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setNome('');
      setExpedienteInicio('07:00');
      setExpedienteFim('18:00');
      setWhatsapp('');
      setModalOpen(false);
      fetchEntregadores();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao cadastrar');
    } finally {
      setSaving(false);
    }
  }

  async function abrirZonas(e: Entregador) {
    setZonasDe(e);
    setZonasOpen(true);
    setLoadingZonas(true);
    try {
      const res = await fetch(`/api/entregadores/${e.id}/zonas`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setZonas(json.zonas ?? []);
    } finally {
      setLoadingZonas(false);
    }
  }

  async function adicionarZona(ev: FormEvent) {
    ev.preventDefault();
    if (!zonasDe || !novaZona.trim()) return;
    const res = await fetch(`/api/entregadores/${zonasDe.id}/zonas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona: novaZona.trim() }),
    });
    const json = await res.json();
    if (res.ok) {
      setZonas((prev) => [...prev, json.zona]);
      setNovaZona('');
    } else {
      setError(json?.error ?? 'Erro ao adicionar zona');
    }
  }

  async function removerZona(zonaId: string) {
    if (!zonasDe) return;
    const res = await fetch(`/api/entregadores/${zonasDe.id}/zonas/${zonaId}`, {
      method: 'DELETE',
    });
    if (res.ok) setZonas((prev) => prev.filter((z) => z.id !== zonaId));
  }

  const showZonasBtn = modoDistribuicao === 'zonas';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Entregadores</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          <Plus size={16} /> Novo Entregador
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>
        ) : entregadores.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">👆</div>
            <p className="font-semibold mb-1">Cadastre seu primeiro entregador</p>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Adicione o nome e WhatsApp de quem faz as entregas.
              Ele receberá uma notificação no WhatsApp a cada novo pedido!
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              <Plus size={16} /> Novo Entregador
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entregadores.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{e.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{e.whatsapp}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                        e.ativo
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {e.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAtivo(e)}
                        className="text-sm text-orange-600 hover:underline"
                      >
                        {e.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      {showZonasBtn && (
                        <button
                          onClick={() => abrirZonas(e)}
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <MapPin size={14} /> Gerenciar zonas
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Entregador">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="João Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp</label>
            <input
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="5511999999999"
            />
            <p className="text-xs text-gray-500 mt-1">Formato: DDI + DDD + número, sem espaços ou +.</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Horário de expediente</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={expedienteInicio}
                onChange={(e) => setExpedienteInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="time"
                value={expedienteFim}
                onChange={(e) => setExpedienteFim(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
            <p className="font-semibold">⚠️ Importante — orientação ao entregador</p>
            <p>
              10 minutos antes do expediente, o agente envia uma mensagem perguntando se ele
              está pronto. <strong>O entregador precisa responder</strong> (basta mandar
              "to pronto" ou qualquer texto) pra abrir a janela do WhatsApp e receber os pedidos
              do dia.
            </p>
            <p>
              <span className="bg-amber-200 text-amber-900 font-semibold px-1 rounded">
                ⚡ Caso use a API Oficial (Meta)
              </span>
              : se ele não responder, o WhatsApp Business pode bloquear o envio de novos pedidos
              pra ele até a próxima interação.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 rounded-lg"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={zonasOpen}
        onClose={() => setZonasOpen(false)}
        title={zonasDe ? `Zonas de ${zonasDe.nome}` : 'Zonas'}
      >
        {loadingZonas ? (
          <div className="flex justify-center py-6"><LoadingSpinner size={24} /></div>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {zonas.length === 0 && (
                <li className="text-sm text-gray-500">Nenhuma zona cadastrada.</li>
              )}
              {zonas.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <span>{z.zona}</span>
                  <button
                    onClick={() => removerZona(z.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={adicionarZona} className="flex gap-2">
              <input
                value={novaZona}
                onChange={(e) => setNovaZona(e.target.value)}
                placeholder="Ex.: Centro, Zona Norte"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                Adicionar
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-3">
              O pedido é enviado a este entregador quando o endereço do cliente
              contém o nome da zona (case-insensitive).
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
