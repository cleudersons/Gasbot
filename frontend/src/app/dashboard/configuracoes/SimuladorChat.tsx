'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2, MessageSquareText, X, Loader2 } from 'lucide-react';

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
  pedido_id?: string;
}

// Divide a resposta da IA em múltiplas bolhas quando ela usar [NOVA_MENSAGEM]
// (mesmo padrão que o WhatsApp envia em mensagens separadas).
function splitMensagens(texto: string): string[] {
  return texto
    .split(/\[NOVA_MENSAGEM\]/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

const STORAGE_KEY = 'sutogas:simulador-chat';

function carregar(): Mensagem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvar(msgs: Mensagem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40)));
  } catch {
    // sem espaço — ignora
  }
}

function ChatBox({
  messages,
  loading,
  onSend,
  onClear,
  onClose,
}: {
  messages: Mensagem[];
  loading: boolean;
  onSend: (text: string) => Promise<void>;
  onClear: () => void;
  onClose?: () => void;
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Mantém foco no input quando a resposta chega (loading fica false),
  // pra usuário continuar digitando sem clicar de novo.
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    // Mantém foco imediato após enviar (sem esperar resposta)
    inputRef.current?.focus();
    await onSend(text);
  }

  return (
    <div className="bg-[#0b141a] rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col w-full h-full">
      {/* Header WhatsApp */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-black/30">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">Simulador da atendente</p>
          <p className="text-[10px] text-gray-400">teste sem precisar do WhatsApp</p>
        </div>
        <button
          onClick={onClear}
          title="Limpar conversa"
          className="text-gray-400 hover:text-white p-1"
        >
          <Trash2 size={16} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            title="Fechar"
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Mensagens — fundo padrão WhatsApp escuro */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ backgroundColor: '#0b141a' }}
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs py-8">
            Mande uma mensagem como se fosse um cliente.<br />
            Ex: <em>"Oi, quanto tá o gás?"</em>
          </div>
        )}

        {messages.map((m, i) => {
          const partes = m.role === 'assistant' ? splitMensagens(m.content) : [m.content];
          return partes.map((parte, j) => (
            <div
              key={`${i}-${j}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-[#005c4b] text-white'
                    : 'bg-[#202c33] text-gray-100'
                }`}
              >
                {parte}
                {m.pedido_id && j === partes.length - 1 && (
                  <div className="text-[10px] text-green-300 mt-1 opacity-80">
                    ✅ pedido criado #{m.pedido_id.slice(0, 8)}
                  </div>
                )}
              </div>
            </div>
          ));
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#202c33] text-gray-400 rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              digitando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-[#202c33] p-2 flex gap-2 border-t border-black/30">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          autoFocus
          className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2 placeholder-gray-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-40 text-white rounded-full p-2 transition"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default function SimuladorChat() {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMessages(carregar());
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const novaUser: Mensagem = { role: 'user', content: text };
      const novoArray = [...messages, novaUser];
      setMessages(novoArray);
      salvar(novoArray);
      setLoading(true);

      try {
        const res = await fetch('/api/configuracoes/simular-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: messages, // só o que veio antes
          }),
        });
        const json = await res.json();
        const reply = res.ok
          ? json.reply ?? '(sem resposta)'
          : `⚠️ ${json.error ?? 'Erro'}`;
        const assistant: Mensagem = {
          role: 'assistant',
          content: reply,
          pedido_id: json.pedido_criado_id ?? undefined,
        };
        const final = [...novoArray, assistant];
        setMessages(final);
        salvar(final);
      } catch {
        const erro: Mensagem = { role: 'assistant', content: '⚠️ Falha de rede' };
        const final = [...novoArray, erro];
        setMessages(final);
        salvar(final);
      } finally {
        setLoading(false);
      }
    },
    [messages],
  );

  function handleClear() {
    if (!window.confirm('Limpar toda a conversa do simulador?')) return;
    setMessages([]);
    salvar([]);
  }

  return (
    <>
      {/* Desktop: lateral fixa, deslocada pra mais perto do conteúdo */}
      <div className="hidden xl:block fixed right-56 top-40 w-[360px] h-[600px] z-20">
        <ChatBox
          messages={messages}
          loading={loading}
          onSend={handleSend}
          onClear={handleClear}
        />
      </div>

      {/* Mobile/Tablet: botão flutuante + modal */}
      <button
        onClick={() => setMobileOpen(true)}
        className="xl:hidden fixed bottom-6 right-6 z-20 bg-[#00a884] hover:bg-[#06cf9c] text-white rounded-full p-4 shadow-2xl transition flex items-center gap-2"
      >
        <MessageSquareText size={20} />
        <span className="text-sm font-medium hidden sm:inline">Testar prompt</span>
      </button>

      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-30 bg-black/60 p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md h-[80vh] sm:h-[600px]">
            <ChatBox
              messages={messages}
              loading={loading}
              onSend={handleSend}
              onClear={handleClear}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
