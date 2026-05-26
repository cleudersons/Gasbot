'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, Pencil, Check, X } from 'lucide-react';
import Modal from '@/components/Modal';

interface Versao {
  id: string;
  nome: string | null;
  modo: string | null;
  criado_em: string;
  preview: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestaurou: () => void; // recarrega a página/dados após restore
}

export default function HistoricoPrompt({ isOpen, onClose, onRestaurou }: Props) {
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [acao, setAcao] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch('/api/configuracoes/prompt/historico', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setVersoes(json.versoes ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) carregar();
  }, [isOpen]);

  async function restaurar(v: Versao) {
    if (!confirm('Isso vai substituir o roteiro atual da atendente. Continuar?')) return;
    setAcao(v.id);
    const res = await fetch(`/api/configuracoes/prompt/historico/${v.id}/restaurar`, {
      method: 'POST',
    });
    setAcao(null);
    if (res.ok) {
      onRestaurou();
      onClose();
    } else alert('Erro ao restaurar');
  }

  async function apagar(v: Versao) {
    if (!confirm('Apagar essa versão? Não dá pra desfazer.')) return;
    setAcao(v.id);
    const res = await fetch(`/api/configuracoes/prompt/historico/${v.id}`, {
      method: 'DELETE',
    });
    setAcao(null);
    if (res.ok) carregar();
    else alert('Erro ao apagar');
  }

  async function salvarNome(v: Versao) {
    setAcao(v.id);
    const res = await fetch(`/api/configuracoes/prompt/historico/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeTemp }),
    });
    setAcao(null);
    if (res.ok) {
      setEditando(null);
      carregar();
    } else alert('Erro ao renomear');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📜 Histórico de versões">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        <p className="text-xs text-gray-600">
          As 5 versões mais recentes ficam salvas. Você pode renomear, restaurar ou apagar.
        </p>

        {loading ? (
          <div className="text-sm text-gray-500 text-center py-6">Carregando…</div>
        ) : versoes.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
            Nenhuma versão salva ainda. As versões são criadas a cada vez que você salva o roteiro.
          </div>
        ) : (
          versoes.map((v) => {
            const dataFmt = new Date(v.criado_em).toLocaleString('pt-BR');
            const editandoEsse = editando === v.id;
            return (
              <article
                key={v.id}
                className="border border-gray-200 rounded-lg p-3 space-y-2"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editandoEsse ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={nomeTemp}
                          onChange={(e) => setNomeTemp(e.target.value)}
                          maxLength={80}
                          placeholder="Nome da versão"
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => salvarNome(v)}
                          disabled={acao === v.id}
                          className="p-1 rounded hover:bg-green-50 text-green-600"
                          title="Salvar"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditando(null)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">
                          {v.nome ?? dataFmt}
                        </p>
                        <button
                          onClick={() => {
                            setNomeTemp(v.nome ?? '');
                            setEditando(v.id);
                          }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          title="Renomear"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {v.modo === 'livre' ? 'Modo avançado' : 'Modo simples'} · {dataFmt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => restaurar(v)}
                      disabled={acao === v.id}
                      className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg"
                    >
                      <RotateCcw size={12} /> Restaurar
                    </button>
                    <button
                      onClick={() => apagar(v)}
                      disabled={acao === v.id}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      title="Apagar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </header>
                <pre className="bg-gray-50 border border-gray-100 rounded p-2 text-[10px] font-mono whitespace-pre-wrap line-clamp-4 max-h-20 overflow-hidden">
                  {v.preview}
                </pre>
              </article>
            );
          })
        )}
      </div>
    </Modal>
  );
}
