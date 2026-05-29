import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, PlayCircle } from 'lucide-react';
import { TUTORIAIS, tutorialPorSlug } from '@/lib/tutoriais';
import VideoEmbed from '@/components/VideoEmbed';

export function generateStaticParams() {
  return TUTORIAIS.map((t) => ({ slug: t.slug }));
}

export default function TutorialPage({ params }: { params: { slug: string } }) {
  const tutorial = tutorialPorSlug(params.slug);
  if (!tutorial) notFound();

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href={tutorial.voltarPara?.href ?? '/dashboard/inicio'}
          className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
        >
          <ChevronLeft size={16} />
          {tutorial.voltarPara?.label ?? 'Voltar'}
        </Link>

        <header className="bg-white rounded-2xl border border-gray-200 p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] mb-1">
            {tutorial.titulo}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">{tutorial.subtitulo}</p>
        </header>

        {tutorial.youtubeId ? (
          <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
            <VideoEmbed youtubeId={tutorial.youtubeId} titulo={tutorial.titulo} />
          </section>
        ) : (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <PlayCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              Vídeo em produção. Por enquanto, siga o passo a passo abaixo.
            </p>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-[#1A1A2E] mb-4">Passo a passo</h2>
          <ol className="space-y-4">
            {tutorial.passos.map((p, i) => (
              <li key={p.titulo} className="flex gap-3">
                <div className="shrink-0 w-7 h-7 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1A2E]">{p.titulo}</h3>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {tutorial.voltarPara && (
          <div className="text-center">
            <Link
              href={tutorial.voltarPara.href}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition"
            >
              {tutorial.voltarPara.label}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
