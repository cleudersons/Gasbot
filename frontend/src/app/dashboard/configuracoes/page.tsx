'use client';

import { useCallback, useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';
import {
  buildPrompt,
  PromptConfig,
  PROMPT_CONFIG_DEFAULT,
  Tom,
  PromptModo,
  personaPadrao,
} from '@/lib/prompt-builder';
import HistoricoPrompt from './HistoricoPrompt';

interface Agencia {
  id: string;
  nome?: string;
  whatsapp_dono?: string | null;
  relatorio_frequencia?: string | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  atendimento_ativo?: boolean | null;
  timezone?: string | null;
  distribuicao_modo?: string | null;
  agente_ativo?: boolean | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ConfiguracoesPage() {
  const [agencia, setAgencia] = useState<Agencia | null>(null);

  const [promptConfig, setPromptConfig] = useState<PromptConfig>(PROMPT_CONFIG_DEFAULT);
  const [promptModo, setPromptModo] = useState<PromptModo>('form');
  const [textoLivre, setTextoLivre] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);

  const [whatsappDono, setWhatsappDono] = useState('');
  const [frequencia, setFrequencia] = useState('diario');

  const [atendimentoAtivo, setAtendimentoAtivo] = useState(true);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('22:00');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  const [distribuicaoModo, setDistribuicaoModo] = useState('todos');

  const [agenteAtivo, setAgenteAtivo] = useState(true);
  const [savingAgente, setSavingAgente] = useState(false);

  type Tab = 'agente' | 'relatorios' | 'horario' | 'entregadores';
  const [tab, setTab] = useState<Tab>('agente');

  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingRelatorio, setSavingRelatorio] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);
  const [savingDistribuicao, setSavingDistribuicao] = useState(false);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        fetch('/api/configuracoes', { cache: 'no-store' }),
        fetch('/api/configuracoes/prompt', { cache: 'no-store' }),
      ]);
      const aJson = await aRes.json();
      const pJson = await pRes.json();

      if (aRes.ok && aJson.agencia) {
        const a = aJson.agencia as Agencia;
        setAgencia(a);
        setWhatsappDono(a.whatsapp_dono ?? '');
        setFrequencia(a.relatorio_frequencia ?? 'diario');
        setAtendimentoAtivo(a.atendimento_ativo ?? true);
        setHorarioInicio((a.horario_inicio ?? '08:00:00').slice(0, 5));
        setHorarioFim((a.horario_fim ?? '22:00:00').slice(0, 5));
        setTimezone(a.timezone ?? 'America/Sao_Paulo');
        setDistribuicaoModo(a.distribuicao_modo ?? 'todos');
        setAgenteAtivo(a.agente_ativo ?? true);
      }

      if (pRes.ok && pJson.config && Object.keys(pJson.config).length > 0) {
        const cfg = { ...PROMPT_CONFIG_DEFAULT, ...(pJson.config as PromptConfig) };
        setPromptConfig(cfg);
        setPromptModo(cfg.modo ?? 'form');
        setTextoLivre(cfg.texto_livre ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function setField<K extends keyof PromptConfig>(key: K, value: PromptConfig[K]) {
    setPromptConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function togglePausa(novoValor: boolean) {
    setSavingAgente(true);
    setMsg(null);
    const res = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agente_ativo: novoValor }),
    });
    setSavingAgente(false);
    if (res.ok) {
      setAgenteAtivo(novoValor);
      setMsg(novoValor ? '✅ Agente ativado' : '⏸ Agente pausado — não vai responder mensagens');
    } else {
      setMsg('Erro ao atualizar estado do agente');
    }
  }

  async function salvarPrompt() {
    setSavingPrompt(true);
    setMsg(null);
    const payload: PromptConfig = {
      ...promptConfig,
      modo: promptModo,
      texto_livre: textoLivre,
    };
    const res = await fetch('/api/configuracoes/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSavingPrompt(false);
    setMsg(res.ok ? '✅ Configurações da atendente salvas!' : 'Erro ao salvar');
  }

  function trocarModo(novo: PromptModo) {
    if (novo === promptModo) return;
    if (novo === 'form' && textoLivre.trim().length > 0) {
      const ok = window.confirm(
        'Você tem um prompt no modo avançado. Trocar pro modo simples não apaga ' +
          'ele, mas só os campos do formulário serão usados quando salvar. Continuar?',
      );
      if (!ok) return;
    }
    setPromptModo(novo);
  }

  function carregarModeloPadrao() {
    if (textoLivre.trim().length > 0) {
      const ok = window.confirm(
        'Isso vai SUBSTITUIR o texto atual do modo avançado pelo modelo padrão da Carla/Farligaz. Continuar?',
      );
      if (!ok) return;
    }
    setTextoLivre(personaPadrao());
  }

  async function salvarRelatorio() {
    setSavingRelatorio(true);
    setMsg(null);
    const res = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsapp_dono: whatsappDono.trim() || null,
        relatorio_frequencia: frequencia,
      }),
    });
    setSavingRelatorio(false);
    setMsg(res.ok ? '✅ Configurações de relatório salvas!' : 'Erro ao salvar');
    if (res.ok) fetchAll();
  }

  async function enviarRelatorioAgora() {
    if (!agencia) return;
    setEnviandoTeste(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/agencias/${agencia.id}/relatorio/teste`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setMsg('✅ Relatório enviado!');
    } catch (err: any) {
      setMsg(`Erro: ${err?.message ?? err}`);
    } finally {
      setEnviandoTeste(false);
    }
  }

  async function salvarHorario() {
    setSavingHorario(true);
    setMsg(null);
    const res = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atendimento_ativo: atendimentoAtivo,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        timezone,
      }),
    });
    setSavingHorario(false);
    setMsg(res.ok ? '✅ Horário salvo!' : 'Erro ao salvar horário');
  }

  async function salvarDistribuicao(modo: string) {
    setSavingDistribuicao(true);
    setMsg(null);
    const res = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distribuicao_modo: modo }),
    });
    setSavingDistribuicao(false);
    if (res.ok) {
      setDistribuicaoModo(modo);
      setMsg('✅ Distribuição atualizada!');
    } else {
      setMsg('Erro ao salvar distribuição');
    }
  }

  if (loading) {
    return <div className="p-10 flex justify-center"><LoadingSpinner size={28} /></div>;
  }

  const promptPreview = buildPrompt({
    ...promptConfig,
    modo: promptModo,
    texto_livre: textoLivre,
  });

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'agente', label: 'Agente', icon: '🤖' },
    { id: 'relatorios', label: 'Relatórios', icon: '📊' },
    { id: 'horario', label: 'Horário', icon: '🕐' },
    { id: 'entregadores', label: 'Entregadores', icon: '🛵' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 border-b border-gray-200 pb-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-t-lg text-sm transition ${
                active
                  ? 'bg-orange-500 text-white font-semibold shadow-sm'
                  : 'bg-transparent text-gray-600 hover:text-orange-600 hover:bg-orange-50 border-b-2 border-transparent'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* Atendente Virtual                                            */}
      {/* ============================================================ */}
      <section
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-5"
        hidden={tab !== 'agente'}
      >
        <div
          className={`rounded-xl border p-4 flex items-center justify-between ${
            agenteAtivo
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div>
            <div className="font-semibold">
              {agenteAtivo ? '🟢 Agente ativo' : '⏸ Agente pausado'}
            </div>
            <p className="text-xs text-gray-600">
              {agenteAtivo
                ? 'O bot está respondendo automaticamente as mensagens dos seus clientes.'
                : 'O bot NÃO responde mensagens enquanto estiver pausado. Pedidos não serão criados.'}
            </p>
          </div>
          <button
            onClick={() => togglePausa(!agenteAtivo)}
            disabled={savingAgente}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
              agenteAtivo
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } disabled:opacity-60`}
          >
            {savingAgente ? '...' : agenteAtivo ? 'Pausar' : 'Ativar'}
          </button>
        </div>

        <div>
          <h2 className="font-semibold mb-1">Sua atendente virtual</h2>
          <p className="text-sm text-gray-500">
            Escolha como quer configurar o roteiro da atendente.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => trocarModo('form')}
            className={`px-4 py-2 ${
              promptModo === 'form'
                ? 'bg-orange-500 text-white font-semibold'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Simples (formulário)
          </button>
          <button
            type="button"
            onClick={() => trocarModo('livre')}
            className={`px-4 py-2 border-l border-gray-300 ${
              promptModo === 'livre'
                ? 'bg-orange-500 text-white font-semibold'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✍️ Avançado (texto livre)
          </button>
        </div>

        {promptModo === 'livre' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              ⚠️ A parte técnica (formato de PEDIDO_CONFIRMADO, lembretes, validação de
              endereço e horário) é mantida automaticamente pelo sistema. Você escreve só
              a parte da persona, fluxo de atendimento e regras de negócio.
            </div>

            <button
              type="button"
              onClick={carregarModeloPadrao}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm"
            >
              📥 Carregar modelo padrão (Carla / Farligaz)
            </button>

            <textarea
              value={textoLivre}
              onChange={(e) => setTextoLivre(e.target.value)}
              rows={20}
              placeholder="Escreva aqui o roteiro completo da sua atendente virtual..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={salvarPrompt}
                disabled={savingPrompt || textoLivre.trim().length === 0}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-sm"
              >
                {savingPrompt ? 'Salvando...' : 'Salvar configurações'}
              </button>
              <button
                onClick={() => setPreviewOpen(true)}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                Ver como ficou o prompt
              </button>
              <button
                onClick={() => setHistoricoOpen(true)}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                📜 Histórico
              </button>
            </div>
          </div>
        )}

        {promptModo === 'form' && (
        <>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
          Preencha os campos abaixo — o sistema monta o roteiro completo automaticamente.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome da atendente" placeholder="Carla" value={promptConfig.atendente} onChange={(v) => setField('atendente', v)} />
          <Field label="Nome do depósito" placeholder="Farligaz" value={promptConfig.deposito} onChange={(v) => setField('deposito', v)} />
        </div>

        <div>
          <p className="font-semibold mb-2 text-sm">Preços do botijão 13kg</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Preço normal" placeholder="R$ 120,00" value={promptConfig.preco_normal} onChange={(v) => setField('preco_normal', v)} />
            <Field label="Primeiro desconto" placeholder="R$ 115,00" value={promptConfig.preco_desconto1} onChange={(v) => setField('preco_desconto1', v)} />
            <Field label="Desconto máximo" placeholder="R$ 110,00" value={promptConfig.preco_minimo} onChange={(v) => setField('preco_minimo', v)} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            A atendente só chega no desconto máximo se o cliente insistir.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Produtos disponíveis</label>
          <textarea
            value={promptConfig.produtos}
            onChange={(e) => setField('produtos', e.target.value)}
            rows={4}
            placeholder={'Botijão 13kg\nBotijão 45kg\nÁgua 20L'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">Um produto por linha.</p>
        </div>

        <div>
          <p className="font-semibold mb-2 text-sm">Informações do depósito</p>
          <div className="space-y-3">
            <Field
              label="Área de entrega / bairros atendidos"
              placeholder="Centro, Jardim das Palmeiras, Vila Nova"
              value={promptConfig.area_entrega}
              onChange={(v) => setField('area_entrega', v)}
            />
            <Field
              label="Marca(s) do gás"
              placeholder="Supergasbras Dourado, Liquigás, Ultragaz"
              value={promptConfig.marca_gas ?? ''}
              onChange={(v) => setField('marca_gas', v)}
            />
            <p className="text-xs text-gray-500 -mt-2">
              Quando o cliente perguntar a marca do gás, a atendente vai responder com o que estiver aqui.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Taxa de entrega <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={promptConfig.taxa_entrega ?? ''}
                onChange={(e) => setField('taxa_entrega', e.target.value)}
                rows={2}
                placeholder="Ex.: Taxa de entrega de R$ 15 para pedidos referentes ao programa Gás do Povo."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Descreva o valor e em quais casos se aplica. A atendente soma no resumo do pedido.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                WhatsApp alternativo (Gás do Povo / Vale Gás){' '}
                <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={promptConfig.whatsapp_alternativo ?? ''}
                onChange={(e) => setField('whatsapp_alternativo', e.target.value)}
                placeholder="Ex.: +55 77 8803-2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cliente que escolher pagar com Gás do Povo ou Vale Gás vai ser direcionado pra esse número fazer a retirada por lá. Deixe em branco se você não trabalha com essas formas.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Alguma promoção ou brinde? <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={promptConfig.brinde}
                onChange={(e) => setField('brinde', e.target.value)}
                rows={3}
                placeholder="Ex.: Brinde em todo pedido. Cliente que faz 10 pedidos ganha brinde especial!"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2 text-sm">Chave Pix do depósito <span className="text-gray-400 font-normal">(opcional)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="Chave Pix"
              placeholder="11999998888, CPF, e-mail ou chave aleatória"
              value={promptConfig.pix_chave ?? ''}
              onChange={(v) => setField('pix_chave', v)}
            />
            <Field
              label="Nome do titular"
              placeholder="João da Silva"
              value={promptConfig.pix_titular ?? ''}
              onChange={(v) => setField('pix_titular', v)}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Quando o cliente pedir a chave Pix, a atendente envia o nome do titular numa
            mensagem e a chave sozinha em outra — assim o cliente segura a mensagem no
            WhatsApp e copia em um toque.
          </p>
        </div>

        <div>
          <p className="font-semibold mb-2 text-sm">Tom de atendimento</p>
          <div className="space-y-2">
            {(
              [
                { v: 'simpatico', label: '😊 Simpático e informal (recomendado)' },
                { v: 'formal', label: '👔 Formal e profissional' },
                { v: 'direto', label: '⚡ Direto e objetivo' },
              ] as { v: Tom; label: string }[]
            ).map((opt) => (
              <label key={opt.v} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tom"
                  checked={promptConfig.tom === opt.v}
                  onChange={() => setField('tom', opt.v)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={salvarPrompt}
            disabled={savingPrompt}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-sm"
          >
            {savingPrompt ? 'Salvando...' : 'Salvar configurações'}
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
          >
            Ver como ficou o prompt
          </button>
        </div>
        </>
        )}
      </section>

      {/* ============================================================ */}
      {/* Relatórios                                                   */}
      {/* ============================================================ */}
      <section className="bg-white rounded-xl border border-gray-200 p-5" hidden={tab !== 'relatorios'}>
        <h2 className="font-semibold mb-2">Relatórios</h2>
        <p className="text-sm text-gray-500 mb-3">
          Receba um resumo automático dos pedidos no WhatsApp do dono.
        </p>

        <div className="space-y-3">
          <Field
            label="WhatsApp do dono"
            placeholder="5511999999999"
            value={whatsappDono}
            onChange={setWhatsappDono}
          />

          <div>
            <span className="block text-sm font-medium mb-1">Frequência</span>
            <div className="flex gap-4 flex-wrap">
              {[
                { v: 'diario', label: 'Diário (20h)' },
                { v: 'semanal', label: 'Semanal (dom, 20h)' },
                { v: 'mensal', label: 'Mensal (último dia, 20h)' },
                { v: 'todos', label: 'Todos' },
              ].map((opt) => (
                <label key={opt.v} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="freq"
                    value={opt.v}
                    checked={frequencia === opt.v}
                    onChange={() => setFrequencia(opt.v)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={salvarRelatorio}
              disabled={savingRelatorio}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-sm"
            >
              {savingRelatorio ? 'Salvando...' : 'Salvar configurações'}
            </button>
            <button
              onClick={enviarRelatorioAgora}
              disabled={enviandoTeste || !whatsappDono}
              className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm"
            >
              {enviandoTeste ? 'Enviando...' : 'Enviar relatório agora'}
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Horário                                                      */}
      {/* ============================================================ */}
      <section className="bg-white rounded-xl border border-gray-200 p-5" hidden={tab !== 'horario'}>
        <h2 className="font-semibold mb-2">Horário de Atendimento</h2>
        <p className="text-sm text-gray-500 mb-3">
          Fora do horário, pedidos confirmados entram como agendados e são disparados
          aos entregadores na abertura.
        </p>

        <label className="inline-flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={atendimentoAtivo}
            onChange={(e) => setAtendimentoAtivo(e.target.checked)}
          />
          <span className="text-sm">Ativar horário de atendimento (desligado = 24h)</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Início</label>
            <input
              type="time"
              value={horarioInicio}
              onChange={(e) => setHorarioInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fim</label>
            <input
              type="time"
              value={horarioFim}
              onChange={(e) => setHorarioFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              <option value="America/Manaus">America/Manaus</option>
              <option value="America/Belem">America/Belem</option>
              <option value="America/Fortaleza">America/Fortaleza</option>
              <option value="America/Recife">America/Recife</option>
              <option value="America/Cuiaba">America/Cuiaba</option>
            </select>
          </div>
        </div>

        <button
          onClick={salvarHorario}
          disabled={savingHorario}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-sm"
        >
          {savingHorario ? 'Salvando...' : 'Salvar horário'}
        </button>
      </section>

      {/* ============================================================ */}
      {/* Distribuição                                                 */}
      {/* ============================================================ */}
      <section className="bg-white rounded-xl border border-gray-200 p-5" hidden={tab !== 'entregadores'}>
        <h2 className="font-semibold mb-2">Distribuição de Entregadores</h2>
        <p className="text-sm text-gray-500 mb-3">
          Como os novos pedidos são enviados aos entregadores ativos.
        </p>
        <div className="space-y-2">
          {[
            { v: 'todos', label: '🔔 Todos ao mesmo tempo' },
            { v: 'revezamento', label: '🔄 Revezamento automático' },
            { v: 'zonas', label: '🗺️ Por zona de entrega' },
            { v: 'manual', label: '👆 Manual (dono escolhe)' },
          ].map((opt) => (
            <label key={opt.v} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="distribuicao"
                value={opt.v}
                checked={distribuicaoModo === opt.v}
                disabled={savingDistribuicao}
                onChange={() => salvarDistribuicao(opt.v)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}

      <HistoricoPrompt
        isOpen={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
        onRestaurou={fetchAll}
      />

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Prompt completo gerado"
      >
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {promptPreview}
        </pre>
        <p className="text-xs text-gray-500 mt-3">
          Esse é o roteiro que a atendente segue. A parte de fluxo de pedido, lembretes
          e formato técnico é mantida pelo sistema automaticamente.
        </p>
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}
