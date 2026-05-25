'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PlanoItem {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  categoria: 'basico' | 'pro';
  preco_normal: number | null;
  limite_atendimentos: number | null;
  duracao_dias: number;
  fundador: boolean;
  ativo: boolean;
}

const CAT_STYLES: Record<string, string> = {
  basico: 'bg-blue-100 text-blue-800 border-blue-200',
  pro: 'bg-purple-100 text-purple-800 border-purple-200',
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 60);
}

function formatPreco(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MasterPlanosPage() {
  const [planos, setPlanos] = useState<PlanoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoItem | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoria, setCategoria] = useState<'basico' | 'pro'>('basico');
  const [preco, setPreco] = useState('');
  const [limite, setLimite] = useState('');
  const [duracao, setDuracao] = useState('30');
  const [fundador, setFundador] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [descricao, setDescricao] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/planos', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setPlanos(json.planos ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setNome('');
    setSlug('');
    setSlugTouched(false);
    setCategoria('basico');
    setPreco('');
    setLimite('');
    setDuracao('30');
    setFundador(false);
    setAtivo(true);
    setDescricao('');
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: PlanoItem) {
    setEditing(p);
    setNome(p.nome);
    setSlug(p.slug);
    setSlugTouched(true);
    setCategoria(p.categoria);
    setPreco(p.preco_normal != null ? String(p.preco_normal) : '');
    setLimite(p.limite_atendimentos != null ? String(p.limite_atendimentos) : '');
    setDuracao(String(p.duracao_dias));
    setFundador(p.fundador);
    setAtivo(p.ativo);
    setDescricao(p.descricao ?? '');
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug,
        nome,
        descricao: descricao || null,
        categoria,
        preco_normal: preco === '' ? null : Number(preco),
        limite_atendimentos: limite === '' ? null : Number(limite),
        duracao_dias: Number(duracao),
        fundador,
        ativo,
      };
      const url = editing ? `/api/master/planos/${editing.id}` : '/api/master/planos';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(p: PlanoItem) {
    if (!confirm(`${p.ativo ? 'Desativar' : 'Reativar'} o plano "${p.nome}"?`)) return;
    try {
      const res = await fetch(`/api/master/planos/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !p.ativo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao alternar');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-gray-600 text-sm mt-1">
            Cadastro dos planos vendidos pela Sutofly. O slug deve bater com o slug da
            oferta cadastrada lá. Plano com <code>ativo=false</code> não ativa novas
            agências, mas mantém histórico.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> Novo plano
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size={28} />
        </div>
      ) : error && !modalOpen ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Preço</th>
                <th className="px-4 py-2 font-medium">Limite</th>
                <th className="px-4 py-2 font-medium">Duração</th>
                <th className="px-4 py-2 font-medium">Fundador</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.id} className={`border-t border-gray-100 ${!p.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-2">{p.nome}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${CAT_STYLES[p.categoria]}`}>
                      {p.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-2">{formatPreco(p.preco_normal)}</td>
                  <td className="px-4 py-2">{p.limite_atendimentos ?? 'ilimitado'}</td>
                  <td className="px-4 py-2">{p.duracao_dias}d</td>
                  <td className="px-4 py-2">{p.fundador ? '👑' : '—'}</td>
                  <td className="px-4 py-2">
                    {p.ativo ? (
                      <span className="text-green-700 text-xs font-medium">ativo</span>
                    ) : (
                      <span className="text-gray-500 text-xs font-medium">inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      title="Editar"
                      className="p-1.5 rounded hover:bg-gray-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleAtivo(p)}
                      title={p.ativo ? 'Desativar' : 'Reativar'}
                      className="p-1.5 rounded hover:bg-gray-100"
                    >
                      <Power size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {planos.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Nenhum plano cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Editar plano' : 'Novo plano'}
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block font-medium mb-1">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (!slugTouched && !editing) setSlug(slugify(e.target.value));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Ex: Pro Anual"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Slug <span className="text-gray-500 font-normal">(precisa bater com a oferta Sutofly)</span>
            </label>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono"
              placeholder="sutogasanualpro"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as 'basico' | 'pro')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="basico">Básico</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="247.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">
                Limite atendimentos <span className="text-gray-500 font-normal">(vazio = ilimitado)</span>
              </label>
              <input
                type="number"
                min="0"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="200"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Duração (dias)</label>
              <input
                type="number"
                min="1"
                required
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={fundador}
                onChange={(e) => setFundador(e.target.checked)}
                className="h-4 w-4 accent-amber-600"
              />
              <span>Fundador (50% desconto + ativa flag)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
              <span>Ativo</span>
            </label>
          </div>

          {error && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium"
            >
              {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
