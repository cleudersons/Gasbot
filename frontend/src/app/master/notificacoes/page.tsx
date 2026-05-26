'use client';

import { useEffect, useState } from 'react';
import { Bell, Trash2, Plus, Megaphone, AlertTriangle, Info } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Categoria = 'promocao' | 'aviso' | 'alerta' | 'sistema';
type AlvoFundador = 'todos' | 'fundador' | 'nao_fundador';

interface Campanha {
  id: string;
  categoria: Categoria;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  alvo_plano: string | null;
  alvo_fundador: AlvoFundador;
  expira_em: string;
  total_envios: number;
  total_lidas: number;
  criada_em: string;
}

const CATEGORIA_LABEL: Record<Categoria, { label: string; cor: string; icon: any }> = {
  promocao: { label: 'Promoção', cor: 'bg-green-100 text-green-800 border-green-300', icon: Megaphone },
  aviso:    { label: 'Aviso',    cor: 'bg-blue-100 text-blue-800 border-blue-300',    icon: Info },
  alerta:   { label: 'Alerta',   cor: 'bg-red-100 text-red-800 border-red-300',       icon: AlertTriangle },
  sistema:  { label: 'Sistema',  cor: 'bg-gray-100 text-gray-800 border-gray-300',    icon: Bell },
};

export default function MasterNotificacoesPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function carregar() {
    const res = await fetch('/api/master/notificacoes', { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setCampanhas(json.campanhas ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function excluir(id: string) {
    if (!confirm('Excluir essa campanha e todas as notificações relacionadas?')) return;
    const res = await fetch(`/api/master/notificacoes/${id}`, { method: 'DELETE' });
    if (res.ok) carregar();
    else alert('Erro ao excluir');
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-gray-600 mt-1">
            Envie avisos, promoções e alertas pro sininho do dashboard dos clientes.
            Cada notificação expira em 30 dias se não for apagada.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> Nova notificação
        </button>
      </div>

      {formOpen && (
        <FormCampanha
          onClose={() => setFormOpen(false)}
          onCriou={() => {
            setFormOpen(false);
            carregar();
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center p-10"><LoadingSpinner size={28} /></div>
      ) : campanhas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-600">
          Nenhuma campanha criada ainda.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Categoria</th>
                <th className="text-left px-4 py-2">Título</th>
                <th className="text-left px-4 py-2">Alvo</th>
                <th className="text-left px-4 py-2">Envios</th>
                <th className="text-left px-4 py-2">Lidas</th>
                <th className="text-left px-4 py-2">Criada</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campanhas.map((c) => {
                const cat = CATEGORIA_LABEL[c.categoria];
                const Icon = cat.icon;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cat.cor}`}>
                        <Icon size={12} /> {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{c.titulo}</div>
                      {c.mensagem && (
                        <div className="text-xs text-gray-500 line-clamp-1">{c.mensagem}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {c.alvo_plano ?? 'todos os planos'}
                      <br />
                      {c.alvo_fundador === 'todos'
                        ? '· todos'
                        : c.alvo_fundador === 'fundador'
                          ? '· só fundadores'
                          : '· só não-fundadores'}
                    </td>
                    <td className="px-4 py-2">{c.total_envios}</td>
                    <td className="px-4 py-2">{c.total_lidas}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {new Date(c.criada_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => excluir(c.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormCampanha({ onClose, onCriou }: { onClose: () => void; onCriou: () => void }) {
  const [categoria, setCategoria] = useState<Categoria>('aviso');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [link, setLink] = useState('');
  const [alvoPlano, setAlvoPlano] = useState<string>('');
  const [alvoFundador, setAlvoFundador] = useState<AlvoFundador>('todos');
  const [preview, setPreview] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ fundador: alvoFundador });
    if (alvoPlano) params.set('plano', alvoPlano);
    fetch(`/api/master/notificacoes/preview?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setPreview(j.total ?? 0))
      .catch(() => setPreview(null));
  }, [alvoPlano, alvoFundador]);

  async function enviar() {
    if (!titulo.trim()) return;
    setEnviando(true);
    const res = await fetch('/api/master/notificacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria,
        titulo: titulo.trim(),
        mensagem: mensagem.trim() || undefined,
        link: link.trim() || undefined,
        alvo_plano: alvoPlano || null,
        alvo_fundador: alvoFundador,
      }),
    });
    setEnviando(false);
    if (res.ok) onCriou();
    else alert('Erro ao enviar');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h2 className="font-semibold">Nova notificação</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="promocao">🎁 Promoção</option>
            <option value="aviso">ℹ️ Aviso</option>
            <option value="alerta">⚠️ Alerta</option>
            <option value="sistema">🔔 Sistema</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Link (opcional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/dashboard/planos"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Mensagem</label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Plano alvo</label>
          <select
            value={alvoPlano}
            onChange={(e) => setAlvoPlano(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos os planos</option>
            <option value="trial">Trial</option>
            <option value="basico">Básico</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fundador</label>
          <select
            value={alvoFundador}
            onChange={(e) => setAlvoFundador(e.target.value as AlvoFundador)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="fundador">Só fundadores</option>
            <option value="nao_fundador">Só não-fundadores</option>
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
        Vai notificar{' '}
        <strong>{preview === null ? '…' : `${preview} agência(s)`}</strong>.
        Expira em 30 dias.
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={enviar}
          disabled={enviando || !titulo.trim()}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium"
        >
          {enviando ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
