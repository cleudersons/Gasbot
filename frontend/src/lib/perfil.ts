export interface PerfilCampos {
  nome_deposito?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cpf_cnpj?: string | null;
}

function preenchido(v: string | null | undefined): boolean {
  return !!v && v.trim().length > 0;
}

export function perfilCompleto(ag: PerfilCampos | null | undefined): boolean {
  if (!ag) return false;
  return (
    preenchido(ag.nome_deposito) &&
    preenchido(ag.cidade) &&
    preenchido(ag.estado) &&
    preenchido(ag.cpf_cnpj)
  );
}

export function inferirTipoDocumento(cpfCnpj: string): 'cpf' | 'cnpj' | null {
  const digitos = cpfCnpj.replace(/\D/g, '');
  if (digitos.length === 11) return 'cpf';
  if (digitos.length === 14) return 'cnpj';
  return null;
}
