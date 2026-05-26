import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';

// GET — retorna se deve mostrar o popup de campanha e o estado das vagas.
// Mostra se: campanha ativa && vagas restantes > 0 && agência NÃO é fundadora
// && ainda não viu o popup.
export async function GET() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const db = supabaseAdmin();
  const [{ data: ag }, { data: cfg }] = await Promise.all([
    db
      .from('agencias')
      .select('programa_fundador, viu_popup_fundador')
      .eq('id', agenciaId)
      .maybeSingle(),
    db
      .from('programa_fundador_config')
      .select('vagas_total, vagas_usadas, ativo')
      .eq('ativo', true)
      .maybeSingle(),
  ]);

  const vagasTotal = cfg?.vagas_total ?? 0;
  const vagasRestantes = Math.max(0, vagasTotal - (cfg?.vagas_usadas ?? 0));
  const campanhaAtiva = !!cfg?.ativo && vagasRestantes > 0;
  const ehFundador = !!ag?.programa_fundador;
  const jaViu = !!ag?.viu_popup_fundador;

  return NextResponse.json({
    mostrar: campanhaAtiva && !ehFundador && !jaViu,
    vagas_total: vagasTotal,
    vagas_restantes: vagasRestantes,
  });
}

// POST — marca que a agência já viu o popup (não aparece de novo).
export async function POST() {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({ viu_popup_fundador: true })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
