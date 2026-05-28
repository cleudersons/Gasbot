import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAgenciaId, isErrorResponse } from '@/lib/auth-server';
import { inferirTipoDocumento } from '@/lib/perfil';

const UF_VALIDAS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

export async function PATCH(req: Request) {
  const agenciaId = await requireAgenciaId();
  if (isErrorResponse(agenciaId)) return agenciaId;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'body inválido' }, { status: 400 });
  }

  const nome_deposito = typeof body.nome_deposito === 'string' ? body.nome_deposito.trim() : null;
  const cidade = typeof body.cidade === 'string' ? body.cidade.trim() : null;
  const estado = typeof body.estado === 'string' ? body.estado.trim().toUpperCase() : null;
  const cpfCnpjRaw = typeof body.cpf_cnpj === 'string' ? body.cpf_cnpj.trim() : null;

  if (estado && !UF_VALIDAS.has(estado)) {
    return NextResponse.json({ error: 'UF inválida' }, { status: 400 });
  }

  let cpf_cnpj: string | null = null;
  let tipo_documento: string | null = null;
  if (cpfCnpjRaw) {
    const apenasDigitos = cpfCnpjRaw.replace(/\D/g, '');
    const tipo = inferirTipoDocumento(apenasDigitos);
    if (!tipo) {
      return NextResponse.json(
        { error: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos' },
        { status: 400 },
      );
    }
    cpf_cnpj = apenasDigitos;
    tipo_documento = tipo;
  }

  const { error } = await supabaseAdmin()
    .from('agencias')
    .update({
      nome_deposito: nome_deposito || null,
      cidade: cidade || null,
      estado: estado || null,
      cpf_cnpj,
      tipo_documento,
    })
    .eq('id', agenciaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
