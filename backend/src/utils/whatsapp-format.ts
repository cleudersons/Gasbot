/**
 * Gera variações de um número brasileiro com e sem o "9" após o DDD,
 * porque o WhatsApp normaliza alguns números antigos sem o nono dígito.
 *
 * Exemplos:
 *  - "5534991188437" → ["5534991188437", "553491188437"]
 *  - "553491188437"  → ["553491188437", "5534991188437"]
 *  - "1234"          → ["1234"]
 */
export function variantesWhatsappBR(numero: string): string[] {
  const n = numero.trim();
  const out = new Set<string>([n]);

  if (n.startsWith('55') && n.length === 13 && n[4] === '9') {
    // tem 9 → gera sem
    out.add(n.slice(0, 4) + n.slice(5));
  }
  if (n.startsWith('55') && n.length === 12) {
    // sem 9 → gera com
    out.add(n.slice(0, 4) + '9' + n.slice(4));
  }

  return Array.from(out);
}
