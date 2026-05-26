'use client';

import { useEffect, useState } from 'react';
import { Star, Crown, ExternalLink, Video, VideoOff } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Resposta {
  id: string;
  agencia_id: string | null;
  agencia_nome: string | null;
  origem: 'logado' | 'publico';
  satisfacao: number | null;
  sugestoes: string | null;
  video_ja_enviado: boolean;
  indicacao1_nome: string | null;
  indicacao1_whatsapp: string | null;
  indicacao2_nome: string | null;
  indicacao2_whatsapp: string | null;
  criado_em: string;
}

function wppHref(raw: string) {
  return `https://wa.me/${raw.replace(/\D/g, '')}`;
}

export default function MasterFundadorFeedbackPage() {
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('');

  async function carregar() {
    setLoading(true);
    const params = filtro ? `?satisfacao=${filtro}` : '';
    const res = await fetch(`/api/master/fundador-feedback${params}`, { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setRespostas(json.respostas ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtro]);

  const media =
    respostas.filter((r) => r.satisfacao).length === 0
      ? 0
      : respostas.reduce((s, r) => s + (r.satisfacao ?? 0), 0) /
        respostas.filter((r) => r.satisfacao).length;

  const totalIndicacoes = respostas.reduce(
    (s, r) => s + (r.indicacao1_nome ? 1 : 0) + (r.indicacao2_nome ? 1 : 0),
    0,
  );
  const videosEnviados = respostas.filter((r) => r.video_ja_enviado).length;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Respostas dos Fundadores</h1>
        <p className="text-sm text-gray-600 mt-1">
          Pesquisas, sugestões e indicações enviadas pelo formulário.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total" valor={respostas.length} />
        <Card label="Média de satisfação" valor={media ? media.toFixed(1) : '—'} sufixo="⭐" />
        <Card label="Indicações" valor={totalIndicacoes} />
        <Card label="Vídeos enviados" valor={videosEnviados} />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Filtrar por satisfação:</label>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} estrelas</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><LoadingSpinner size={28} /></div>
      ) : respostas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-600">
          Nenhuma resposta ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {respostas.map((r) => (
            <article
              key={r.id}
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <header className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown size={16} className="text-amber-600" />
                    <span className="font-semibold">
                      {r.agencia_nome ?? '(agência sem nome)'}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
                        r.origem === 'publico'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                    >
                      {r.origem === 'publico' ? 'link público' : 'logado'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(r.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={18}
                      className={n <= (r.satisfacao ?? 0) ? 'text-amber-500' : 'text-gray-200'}
                      fill={n <= (r.satisfacao ?? 0) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
              </header>

              {r.sugestoes && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sugestões</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{r.sugestoes}</p>
                </div>
              )}

              {(r.indicacao1_nome || r.indicacao2_nome) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Indicações</p>
                  <ul className="space-y-1 text-sm">
                    {r.indicacao1_nome && (
                      <li className="flex items-center gap-2">
                        <span>{r.indicacao1_nome}</span>
                        {r.indicacao1_whatsapp && (
                          <a
                            href={wppHref(r.indicacao1_whatsapp)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-green-700 hover:underline"
                          >
                            {r.indicacao1_whatsapp} <ExternalLink size={12} />
                          </a>
                        )}
                      </li>
                    )}
                    {r.indicacao2_nome && (
                      <li className="flex items-center gap-2">
                        <span>{r.indicacao2_nome}</span>
                        {r.indicacao2_whatsapp && (
                          <a
                            href={wppHref(r.indicacao2_whatsapp)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-green-700 hover:underline"
                          >
                            {r.indicacao2_whatsapp} <ExternalLink size={12} />
                          </a>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="text-xs flex items-center gap-1.5">
                {r.video_ja_enviado ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <Video size={14} /> Vídeo enviado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <VideoOff size={14} /> Vídeo pendente
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ label, valor, sufixo }: { label: string; valor: string | number; sufixo?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {valor}
        {sufixo && <span className="ml-1 text-base">{sufixo}</span>}
      </p>
    </div>
  );
}
