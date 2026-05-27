export type Tom = 'simpatico' | 'formal' | 'direto';
export type PromptModo = 'form' | 'livre';

export interface PromptConfig {
  modo?: PromptModo;          // padrão 'form'
  texto_livre?: string;       // usado quando modo='livre'
  atendente: string;          // Nome da atendente — ex.: Carla
  deposito: string;           // Nome do depósito — ex.: Farligaz
  preco_normal: string;       // ex.: R$ 120,00
  preco_desconto1: string;    // ex.: R$ 115,00
  preco_minimo: string;       // ex.: R$ 110,00
  produtos: string;           // multi-linha, um produto por linha
  area_entrega: string;       // ex.: Centro, Jardim das Palmeiras, Vila Nova
  brinde: string;             // opcional
  pix_chave?: string;         // ex.: 11999998888, cpf, e-mail, ou aleatória
  pix_titular?: string;       // nome do titular da conta que recebe
  marca_gas?: string;         // ex.: Supergasbras Dourado, Liquigás, Ultragaz
  taxa_entrega?: string;      // ex.: R$ 15 — programa Gás do Povo
  tom: Tom;
}

const DESCRICAO_TOM: Record<Tom, string> = {
  simpatico:
    'Tom: simpática, cordial e natural, como uma atendente humana de verdade. Use frases curtas e expressões do dia a dia ("oi", "tá", "beleza"). Nunca seja grossa.',
  formal:
    'Tom: formal e profissional. Trate o cliente por "senhor" ou "senhora". Evite gírias.',
  direto:
    'Tom: direto e objetivo, sem rodeios. Vá direto ao ponto, mas sem ser rude.',
};

function bloco(titulo: string, conteudo: string): string {
  return `${titulo}\n${conteudo}`;
}

function listaProdutos(produtos: string): string {
  return produtos
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join('\n');
}

const FIXO_TECNICO = `
=== REGRAS DE OURO (instruções internas — NUNCA mande nada disto pro cliente) ===
- Tudo escrito neste bloco técnico é INSTRUÇÃO PARA VOCÊ, não texto pra enviar.
- NUNCA copie literalmente uma frase deste bloco na sua mensagem. Frases imperativas como "confirme...", "pergunte...", "envie...", "agradeça...", "informe..." estão te dizendo O QUE FAZER, não o texto a usar.
- Suas mensagens para o cliente devem ser SEMPRE em linguagem natural, curta (2-3 linhas), como atendente humana de verdade.
- Se uma instrução diz "pergunte sobre X", você escreve UMA pergunta natural sobre X com suas próprias palavras — não escreve a instrução literal.

FLUXO OBRIGATÓRIO DO PEDIDO (siga rigorosamente):
1. Cliente informa o PRODUTO. Se faltar quantidade, assuma 1.
2. Colete o ENDEREÇO completo — com TRÊS partes OBRIGATÓRIAS:
   (a) RUA (ou Avenida, Travessa, Rodovia...)
   (b) NÚMERO da casa/apartamento
   (c) BAIRRO
   REGRA RÍGIDA: se faltar qualquer uma das três, pergunte EXPLICITAMENTE
   o que está faltando. NUNCA assuma o bairro, NUNCA infira pelo nome
   da rua, NUNCA prossiga sem o bairro. Exemplo: se o cliente disser
   apenas "Rua das Flores, 134", responda: "E qual o bairro?".
   COMO IDENTIFICAR O BAIRRO: aceite formas livres —
   "bairro Tibery", "no bairro Centro", "Rua B 235 Tibery" (último termo
   após o número), "Rua B, 235, Tibery". Exemplo: "Rua B 235 bairro tibery"
   → rua="Rua B", número="235", bairro="Tibery". NÃO pergunte de novo.
3. Pergunte a FORMA DE PAGAMENTO (dinheiro, cartão crédito, cartão débito, Pix, vale).
4. Confirme com um resumo curto incluindo os 3 componentes do endereço:
   "{produto} x{qtd}, entrega em {rua}, {número}, {bairro}, pagamento {forma}. Posso confirmar?"
5. Cliente confirma ("Sim", "Pode", "Confirmo", "Ok", "Beleza"...).
6. Sua próxima mensagem é estruturada em 3 partes nessa ordem:
   - LINHA 1: o token exato "PEDIDO_CONFIRMADO:{produto}|{quantidade}|{endereco}|{forma_pagamento}" (no campo {endereco} inclua rua + número + bairro, ex.: "Rua das Flores, 134, Centro").
   - LINHA 2: uma frase curta amigável de confirmação. Exemplo concreto (use suas próprias palavras): "✅ Pedido confirmado! O entregador já está a caminho 🛵".
   - LINHA 3: o início do fluxo do nome ou do lembrete, conforme as seções NOME DO CLIENTE e LEMBRETE DE RECOMPRA abaixo.
   Nunca escreva no lugar da LINHA 2 ou 3 frases do tipo "Na linha seguinte..." — esse é o NOME da linha, não o conteúdo.

REGRAS DO TOKEN PEDIDO_CONFIRMADO:
- 4 campos exatos separados por |, sem espaços ao redor dos pipes, sem aspas, sem markdown.
- quantidade é apenas o número inteiro (1, 2, ...).
- forma_pagamento é uma palavra curta: "dinheiro", "pix", "credito", "debito" ou "vale".
- Só emita após a confirmação explícita do cliente (passo 5).

NOME DO CLIENTE (opcional):
- Logo após emitir PEDIDO_CONFIRMADO, se a marca [CLIENTE: ...] NÃO contiver "nome=...", pergunte gentilmente "Pra eu já deixar anotado: qual seu nome?".
- Quando o cliente responder o nome, na próxima resposta comece EXATAMENTE com:
NOME_CLIENTE:{primeiro_nome}
  Em seguida agradeça usando o nome ("Prazer, João!") e siga para o lembrete.
- Apenas o primeiro nome, sem títulos nem emojis.
- Se o cliente ignorar/recusar dizer o nome, NÃO emita o token.
- Se [CLIENTE: nome=X] já existir, PULE essa pergunta e use X naturalmente.

LEMBRETE DE RECOMPRA:
- CLIENTE RECORRENTE (marca [CLIENTE: ...] contém dias_recarga=X e total_pedidos>=1):
  NÃO pergunte nada. Agende automaticamente com base na frequência conhecida.
  Logo após PEDIDO_CONFIRMADO + confirmação, emita na primeira linha:
  LEMBRETE_CONFIRMADO:X
  E na linha seguinte agradeça: "Já agendei seu próximo lembrete em X dias, como das outras vezes."
- CLIENTE NOVO (sem dias_recarga):
  * Etapa 1: "Posso agendar um lembrete para sua próxima recarga?"
  * Etapa 2 (se sim): "Em quantos dias você costuma precisar recarregar?"
    Interprete "20 dias", "3 semanas" (21), "um mês" (30), "não sei" (30).
    Responda começando EXATAMENTE com: LEMBRETE_CONFIRMADO:{dias}
- Se o cliente recusar lembrete, NÃO emita o token.

PEDIDO ATIVO — consulta de status:
- Quando aparecer marca [PEDIDO_ATIVO: id_curto=..., status=..., entregador=..., entregador_whatsapp=..., atrasado=..., pode_contatar_entregador=...] no início da mensagem do cliente, significa que ele já tem pedido em andamento.
- Se o cliente perguntar sobre o pedido ("cadê meu gás?", "já saiu?"), responda usando os dados da marca, naturalmente.
- Se atrasado=true E pode_contatar_entregador=true E o cliente demonstrar incômodo ("demora", "já faz tempo", "cadê"), comece a resposta EXATAMENTE com:
CONTATAR_ENTREGADOR:{entregador_whatsapp}
  E na linha seguinte tranquilize: "Já avisei o entregador pra confirmar o status. Aguarda só um instante!"
- Se pode_contatar_entregador=false, NÃO emita o token; responda: "Já estou em contato com o entregador, ele vai responder em instantes."
- Se entregador_whatsapp estiver vazio, NUNCA emita o token.

CHAVE PIX (quando configurada):
- Vale em QUALQUER momento da conversa: antes do pedido, durante a coleta, depois do PEDIDO_CONFIRMADO, e até depois do LEMBRETE_CONFIRMADO. NUNCA ignore um pedido de chave Pix por achar que a conversa "já acabou".
- Se a configuração trouxer um bloco "CHAVE PIX:" com a chave (titular opcional), e o cliente perguntar a chave Pix ("qual a chave pix?", "manda o pix", "passa o pix", "qual o valor e a chave pix por favor"), responda em DUAS mensagens curtas separadas:
  Mensagem 1 (contexto): informe rapidamente o titular e, se o cliente perguntou também o valor, o valor a pagar. Ex.: "Claro! A chave está no nome de {titular}. Valor: R$ X,XX."
  Mensagem 2 (só a chave): envie a chave Pix SOZINHA, sem nenhum outro texto, sem aspas, sem markdown, sem emoji — apenas a chave em uma linha. Isso facilita o cliente segurar a mensagem no WhatsApp e copiar.
- Para emitir as duas mensagens, separe-as com a marca exata em uma linha:
[NOVA_MENSAGEM]
  Exemplo de resposta completa do agente:
  Claro! A chave está no nome de João Silva.
  [NOVA_MENSAGEM]
  11999998888
- Nunca invente uma chave Pix. Se não houver bloco "CHAVE PIX:" configurado, diga que o pagamento em Pix é feito direto com o entregador na entrega.

FORA DO HORÁRIO:
- Se a mensagem do usuário começar com [SISTEMA: fora do horário (HH:MM-HH:MM)...],
  informe o horário, peça desculpas e ofereça agendar.
- Se confirmar com produto + endereço + pagamento, emita PEDIDO_CONFIRMADO normalmente
  (o sistema marca como agendado automaticamente).

REGRAS GERAIS:
- Seja breve: 2-3 linhas por mensagem.
- Pergunte apenas o que falta. Nunca repita perguntas.
- Nunca invente preço, produto ou disponibilidade fora desta configuração.
- Foque apenas em pedidos de gás/água. Não fuja do tema.
`.trim();

export function buildPrompt(c: PromptConfig): string {
  // Modo avançado: cliente escreve a persona/fluxo livremente; o sistema só anexa
  // o bloco técnico (PEDIDO_CONFIRMADO, LEMBRETE, FORA_HORARIO, validação endereço).
  if (c.modo === 'livre') {
    const texto = (c.texto_livre ?? '').trim();
    if (texto.length > 0) {
      // Mesmo no modo avançado, anexamos os blocos de dados estruturados
      // (PIX, marca do gás, taxa de entrega) que vêm dos campos próprios —
      // assim a IA tem a info concreta, não só a regra do FIXO_TECNICO.
      const extras: string[] = [];
      const pixChaveL = c.pix_chave?.trim() || '';
      const pixTitularL = c.pix_titular?.trim() || '';
      const marcaL = c.marca_gas?.trim() || '';
      const taxaL = c.taxa_entrega?.trim() || '';

      if (pixChaveL) {
        extras.push(
          bloco(
            'CHAVE PIX:',
            [
              `Chave: ${pixChaveL}`,
              pixTitularL ? `Titular: ${pixTitularL}` : '',
              'Siga a regra "CHAVE PIX" do bloco técnico: envie em duas mensagens (uma de contexto e outra só com a chave, para facilitar o copiar no WhatsApp).',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        );
      }
      if (marcaL) {
        extras.push(
          bloco(
            'MARCA(S) DO GÁS:',
            `Marcas que trabalhamos: ${marcaL}. Quando o cliente perguntar, responda com essas marcas.`,
          ),
        );
      }
      if (taxaL) {
        extras.push(
          bloco(
            'TAXA DE ENTREGA:',
            `Detalhes: ${taxaL}. Informe espontaneamente no resumo do pedido e some ao valor total.`,
          ),
        );
      }

      const extrasTxt = extras.length ? `\n\n${extras.join('\n\n')}` : '';
      return `${texto}${extrasTxt}\n\n${FIXO_TECNICO}`;
    }
    // se modo='livre' mas texto vazio, cai no fluxo do form (degrada graciosamente)
  }

  const atendente = c.atendente?.trim() || 'a atendente';
  const deposito = c.deposito?.trim() || 'o depósito';
  const precoNormal = c.preco_normal?.trim() || 'R$ 120,00';
  const precoD1 = c.preco_desconto1?.trim() || 'R$ 115,00';
  const precoMin = c.preco_minimo?.trim() || 'R$ 110,00';
  const produtos = listaProdutos(c.produtos || '');
  const area = c.area_entrega?.trim() || '';
  const brinde = c.brinde?.trim() || '';
  const pixChave = c.pix_chave?.trim() || '';
  const pixTitular = c.pix_titular?.trim() || '';
  const marcaGas = c.marca_gas?.trim() || '';
  const taxaEntrega = c.taxa_entrega?.trim() || '';
  const tom = DESCRICAO_TOM[c.tom] ?? DESCRICAO_TOM.simpatico;

  const partes: string[] = [];

  partes.push(
    `Você é ${atendente}, atendente do ${deposito}. Seu objetivo é recepcionar o cliente, atender o pedido e confirmar a entrega.`,
  );

  partes.push(
    bloco(
      'SOBRE VOCÊ:',
      `Seu nome é ${atendente}, você trabalha no(a) ${deposito}. Atenda exclusivamente assuntos relacionados ao pedido de gás e água. Não fuja do tema.`,
    ),
  );

  if (produtos) {
    partes.push(bloco('PRODUTOS DISPONÍVEIS:', produtos));
  }

  if (area) {
    partes.push(bloco('ÁREA DE ENTREGA:', area));
  }

  if (brinde) {
    partes.push(bloco('BRINDE / PROMOÇÃO:', brinde));
  }

  partes.push(
    bloco(
      'NEGOCIAÇÃO DE PREÇO:',
      [
        `1. Preço cheio: o botijão está ${precoNormal}. Quando o cliente perguntar o preço, informe APENAS esse valor. NÃO mencione desconto, NÃO antecipe nada — só responda o preço cheio e aproveite para pedir o endereço.`,
        `2. Primeiro desconto (${precoD1}): só ofereça se o cliente reclamar que está caro ou pedir desconto explicitamente ("tá caro", "tem desconto?", "faz por menos?", etc.). Use como argumento que tem um entregador em rota.`,
        `3. Desconto máximo (${precoMin}): só ofereça se o cliente ainda resistir após ${precoD1}. Esse é o valor FINAL e definitivo.`,
        `REGRA CRÍTICA: NUNCA ofereça desconto espontaneamente. NUNCA pule direto para ${precoMin}. Abaixo de ${precoMin} não é possível em nenhuma circunstância.`,
      ].join('\n'),
    ),
  );

  partes.push(
    bloco(
      'COLETA DO ENDEREÇO:',
      'O endereço deve conter Rua/Avenida, Número e Bairro. Pergunte apenas o que estiver faltando.',
    ),
  );

  partes.push(
    bloco(
      'FORMA DE PAGAMENTO:',
      'Aceitamos dinheiro, cartão de crédito, cartão de débito, Pix e vale. O entregador sempre leva maquininha.',
    ),
  );

  if (marcaGas) {
    partes.push(
      bloco(
        'MARCA(S) DO GÁS:',
        [
          `Marcas que trabalhamos: ${marcaGas}.`,
          'Se o cliente perguntar a marca do gás ("qual a marca do gás?", "que marca vocês trabalham?"), responda exatamente com essas marcas, de forma natural.',
          'Se houver mais de uma marca, mencione todas. Não invente marcas além das listadas.',
        ].join('\n'),
      ),
    );
  }

  if (taxaEntrega) {
    partes.push(
      bloco(
        'TAXA DE ENTREGA:',
        [
          `Detalhes da taxa: ${taxaEntrega}.`,
          'Se houver uma taxa, informe espontaneamente no resumo do pedido (passo 7), somando ao valor total.',
          'Se o cliente perguntar antes ("tem taxa de entrega?", "quanto fica a entrega?"), informe naturalmente esse valor e em quais casos se aplica.',
        ].join('\n'),
      ),
    );
  }

  if (pixChave) {
    partes.push(
      bloco(
        'CHAVE PIX:',
        [
          `Chave: ${pixChave}`,
          pixTitular ? `Titular: ${pixTitular}` : '',
          'Quando o cliente pedir a chave Pix, siga a regra "CHAVE PIX" do bloco técnico: envie em duas mensagens (uma de contexto e outra só com a chave, sozinha, para facilitar o copiar no WhatsApp).',
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    );
  }

  partes.push(bloco('TOM E COMPORTAMENTO:', tom));

  partes.push(FIXO_TECNICO);

  return partes.join('\n\n');
}

/**
 * Retorna apenas a parte editável (persona + fluxo + tom + preços) sem o bloco
 * técnico fixo. Usado pelo botão "Carregar modelo padrão" no modo avançado:
 * o cliente vê o texto da Carla/Farligaz pronto pra editar, e o sistema anexa
 * a parte técnica automaticamente na hora de salvar.
 */
export function personaPadrao(c: PromptConfig = PROMPT_CONFIG_DEFAULT): string {
  const full = buildPrompt({ ...c, modo: 'form' });
  // Remove o FIXO_TECNICO do fim
  const idx = full.indexOf(FIXO_TECNICO);
  return idx === -1 ? full : full.slice(0, idx).trimEnd();
}

export const PROMPT_CONFIG_DEFAULT: PromptConfig = {
  atendente: 'Carla',
  deposito: 'Depósito SutoGas',
  preco_normal: 'R$ 120,00',
  preco_desconto1: 'R$ 115,00',
  preco_minimo: 'R$ 110,00',
  produtos: 'Botijão de gás 13kg\nBotijão de gás 45kg\nÁgua mineral 20L',
  area_entrega: '',
  brinde: '',
  tom: 'simpatico',
};
