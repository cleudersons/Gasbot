import { PedidoItem } from './pedidos.service';

export interface PedidoParsed {
  itens: PedidoItem[];
  endereco: string;
  formaPagamento: string | null;
  valorTotal: number | null;
}

const TOKEN_PREFIX = 'PEDIDO_CONFIRMADO:';

function parseValor(raw: string): number | null {
  if (!raw) return null;
  // Aceita "265,00", "265.00", "R$ 265,00" — extrai dígitos + separador
  const limpo = raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '');
  const norm = limpo.replace(',', '.');
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse do bloco de itens. Aceita formatos:
 *   "botijão 13kg*2+água 20L*1"   (novo, multi-item)
 *   "botijão 13kg|2"              (antigo, produto + quantidade em campos separados)
 *   "botijão 13kg"                (antigo, qtd em campo seguinte)
 */
function parseItens(bloco: string, qtdLegado?: string): PedidoItem[] {
  // Se tem '*' ou '+' tratamos como novo formato
  if (bloco.includes('*') || bloco.includes('+')) {
    const partes = bloco.split('+').map((p) => p.trim()).filter(Boolean);
    const itens: PedidoItem[] = [];
    for (const p of partes) {
      const m = p.match(/^(.+?)\*(\d+)$/);
      if (m) {
        itens.push({ produto: m[1].trim(), quantidade: parseInt(m[2], 10) || 1 });
      } else {
        itens.push({ produto: p, quantidade: 1 });
      }
    }
    return itens;
  }
  // Antigo: produto único
  const qtd = qtdLegado ? parseInt(qtdLegado.trim(), 10) || 1 : 1;
  return [{ produto: bloco.trim(), quantidade: qtd }];
}

/**
 * Detecta e parseia o token PEDIDO_CONFIRMADO no texto.
 * Suporta:
 *   NOVO:    PEDIDO_CONFIRMADO:itens|endereco|pagamento|total
 *   ANTIGO4: PEDIDO_CONFIRMADO:produto|qtd|endereco|pagamento
 *   ANTIGO3: PEDIDO_CONFIRMADO:produto|qtd|endereco
 */
export function parsePedidoConfirmado(text: string): PedidoParsed | null {
  const idx = text.indexOf(TOKEN_PREFIX);
  if (idx < 0) return null;

  const linha = text.slice(idx + TOKEN_PREFIX.length).split('\n')[0].trim();
  const campos = linha.split('|').map((c) => c.trim());

  // Novo formato: 4 campos E o primeiro contém '*' ou '+' (assinatura inequívoca)
  if (campos.length === 4 && (campos[0].includes('*') || campos[0].includes('+'))) {
    const itens = parseItens(campos[0]);
    return {
      itens,
      endereco: campos[1],
      formaPagamento: campos[2] || null,
      valorTotal: parseValor(campos[3]),
    };
  }

  // Antigo 4 campos: produto|qtd|endereco|pagamento
  if (campos.length === 4) {
    return {
      itens: parseItens(campos[0], campos[1]),
      endereco: campos[2],
      formaPagamento: campos[3] || null,
      valorTotal: null,
    };
  }

  // Antigo 3 campos: produto|qtd|endereco
  if (campos.length === 3) {
    return {
      itens: parseItens(campos[0], campos[1]),
      endereco: campos[2],
      formaPagamento: null,
      valorTotal: null,
    };
  }

  return null;
}

export function removerTokenPedido(text: string): string {
  return text.replace(/PEDIDO_CONFIRMADO:[^\n]+/g, '').trim();
}

/** Resumo curto p/ guardar em `produto` (compat com UIs antigas que leem essa coluna). */
export function resumoItens(itens: PedidoItem[]): { produto: string; quantidade: number } {
  if (itens.length === 1) {
    return { produto: itens[0].produto, quantidade: itens[0].quantidade };
  }
  const desc = itens.map((i) => `${i.quantidade}x ${i.produto}`).join(' + ');
  const qtdTotal = itens.reduce((s, i) => s + i.quantidade, 0);
  return { produto: desc, quantidade: qtdTotal };
}
