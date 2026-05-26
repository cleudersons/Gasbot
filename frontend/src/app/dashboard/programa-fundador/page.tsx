import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import LandingFundador from './LandingFundador';

const CHECKOUT_BASE =
  process.env.NEXT_PUBLIC_CHECKOUT_BASE ?? 'https://pay.sutofly.com/checkout.php';

interface PlanoRow {
  slug: string;
  nome: string;
  categoria: 'basico' | 'pro';
  preco_normal: number | null;
  limite_atendimentos: number | null;
  fundador: boolean;
}

function brl(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function checkoutUrl(oferta: string, agenciaId: string, email: string, jaAssinante: boolean) {
  const modo = jaAssinante ? '1clickupgrade' : '1click';
  const params = new URLSearchParams({ o: oferta, m: modo, agencia_id: agenciaId, email });
  return `${CHECKOUT_BASE}?${params.toString()}`;
}

export default async function ProgramaFundadorPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;
  if (!agenciaId) redirect('/login');

  const db = supabaseAdmin();
  const [{ data: ag }, { data: cfg }, { data: planosRows }] = await Promise.all([
    db
      .from('agencias')
      .select('plano, plano_slug, status_conta, programa_fundador')
      .eq('id', agenciaId)
      .maybeSingle(),
    db
      .from('programa_fundador_config')
      .select('vagas_total, vagas_usadas, ativo')
      .eq('ativo', true)
      .maybeSingle(),
    db
      .from('planos')
      .select('slug, nome, categoria, preco_normal, limite_atendimentos, fundador')
      .eq('ativo', true)
      .eq('fundador', true)
      .order('categoria', { ascending: true }),
  ]);

  // Já é fundador: nada a oferecer, manda pra /planos
  if (ag?.programa_fundador) redirect('/dashboard/planos');

  const planos = (planosRows as PlanoRow[] | null) ?? [];
  const fundadores = planos.filter((p) => p.fundador);

  // Acha o preço normal equivalente (mesma categoria, não fundador) pra mostrar o riscado
  const { data: normais } = await db
    .from('planos')
    .select('slug, categoria, preco_normal')
    .eq('ativo', true)
    .eq('fundador', false);

  const normalPorCategoria: Record<string, number | null> = {};
  for (const n of normais ?? []) {
    normalPorCategoria[n.categoria] = n.preco_normal as number | null;
  }

  const jaAssinante =
    !!ag && (ag.plano ?? 'trial') !== 'trial' && ag.status_conta === 'ativo';

  const ofertas = fundadores.map((p) => {
    const normal = normalPorCategoria[p.categoria];
    return {
      slug: p.slug,
      nome: p.nome,
      categoria: p.categoria,
      preco_normal: brl(normal ?? p.preco_normal),
      preco_fundador: brl(p.preco_normal),
      limite:
        p.limite_atendimentos == null
          ? 'Atendimentos ilimitados'
          : `${p.limite_atendimentos} atendimentos/mês`,
      url_fundador: checkoutUrl(p.slug, agenciaId, email, jaAssinante),
      url_normal: normalPorCategoria[p.categoria]
        ? checkoutUrl(
            (normais ?? []).find((n) => n.categoria === p.categoria)?.slug ?? p.slug,
            agenciaId,
            email,
            jaAssinante,
          )
        : '/dashboard/planos',
    };
  });

  const vagasTotal = cfg?.vagas_total ?? 0;
  const vagasRestantes = Math.max(0, vagasTotal - (cfg?.vagas_usadas ?? 0));

  return (
    <LandingFundador
      vagasIniciais={{ vagas_total: vagasTotal, vagas_restantes: vagasRestantes }}
      ofertas={ofertas}
    />
  );
}
