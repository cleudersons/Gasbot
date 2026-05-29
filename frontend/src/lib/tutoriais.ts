// Catálogo de tutoriais. Pra gravar um vídeo: sobe no YouTube, copia o ID
// (o que vem depois de "v="), atualiza `youtubeId` no item correspondente
// abaixo e dá push. Sem ID, o tutorial mostra só o passo a passo em texto.

export interface PassoTexto {
  titulo: string;
  texto: string;
}

export interface Tutorial {
  slug: string;
  passoKey?: 'promptOk' | 'entregadoresOk' | 'conexaoOk' | 'testeOk';
  titulo: string;
  subtitulo: string;
  youtubeId?: string;
  passos: PassoTexto[];
  voltarPara?: { href: string; label: string };
}

export const TUTORIAIS: Tutorial[] = [
  {
    slug: 'prompt',
    passoKey: 'promptOk',
    titulo: 'Personalize seu agente',
    subtitulo: 'Configure o cérebro da sua IA com os dados do seu depósito',
    youtubeId: 'yEYz8XX3eOw',
    passos: [
      {
        titulo: 'Acesse Configurações',
        texto: 'No menu lateral do painel, clique em Configurações e abra a aba Agente.',
      },
      {
        titulo: 'Preencha o nome do depósito',
        texto: 'Esse nome vai aparecer pro cliente quando ele cumprimentar o atendimento.',
      },
      {
        titulo: 'Cadastre os produtos e preços',
        texto: 'Lista todos os produtos que você vende (P13, P45, Água 20L, etc.) com preços. A IA usa essa lista pra confirmar pedidos.',
      },
      {
        titulo: 'Adicione horário e taxa de entrega',
        texto: 'Informe horário de funcionamento e taxa de entrega por região (se houver). Isso evita que pedidos cheguem fora do horário.',
      },
      {
        titulo: 'Salve e teste',
        texto: 'Clica em "Salvar prompt". A nova versão fica como ativa imediatamente.',
      },
    ],
    voltarPara: { href: '/dashboard/configuracoes', label: 'Voltar para Configurações' },
  },
  {
    slug: 'entregadores',
    passoKey: 'entregadoresOk',
    titulo: 'Cadastre seus entregadores',
    subtitulo: 'Adicione quem vai receber os pedidos no WhatsApp',
    youtubeId: 'uDF3LedHlM4',
    passos: [
      {
        titulo: 'Acesse Entregadores',
        texto: 'No menu lateral, clica em Entregadores e depois em "Novo entregador".',
      },
      {
        titulo: 'Preencha nome e WhatsApp',
        texto: 'O WhatsApp deve ser o mesmo número que o entregador usa no celular dele. É por ele que vamos notificar os pedidos.',
      },
      {
        titulo: 'Escolha o modo de distribuição',
        texto: 'Em Configurações > Distribuição, escolha: Todos (broadcast), Revezamento (rodízio), Zonas (por bairro) ou Manual (você atribui).',
      },
      {
        titulo: 'Treine o entregador nos comandos',
        texto: 'Pede pro entregador responder "aceito" quando quiser pegar e "entregue" quando finalizar. Pra recusar, "não aceito".',
      },
    ],
    voltarPara: { href: '/dashboard/entregadores', label: 'Voltar para Entregadores' },
  },
  {
    slug: 'zapi',
    passoKey: 'conexaoOk',
    titulo: 'Conectar seu WhatsApp',
    subtitulo: 'Os 2 jeitos de ligar o WhatsApp do depósito ao SutoGas: Z-API (QR Code) ou Meta API (oficial)',
    // youtubeId: 'PREENCHA_QUANDO_GRAVAR',
    passos: [
      {
        titulo: 'Caminho 1 — Z-API (mais rápido, leitura de QR Code)',
        texto: 'Recomendado pra começar. Acesse Conexão no menu, escolha Z-API, pegue o celular do depósito, abra o WhatsApp → ⋮ → Dispositivos conectados → Conectar um dispositivo, e escaneie o QR Code que aparece. Em segundos o agente está atendendo.',
      },
      {
        titulo: 'Caminho 2 — Meta API (oficial, mais estável)',
        texto: 'Use quando quiser a API oficial da Meta. Em developers.facebook.com, abra ou crie um app de WhatsApp Business. Copie o Phone Number ID em WhatsApp → API Setup. Em Business Settings → System Users, gere um token com permissão whatsapp_business_messaging. Cole os dois no painel SutoGas → Conexão → Meta API.',
      },
      {
        titulo: 'Configure o webhook (só Meta API)',
        texto: 'No painel da Meta, configure o webhook apontando pra URL que o SutoGas mostra ao salvar as credenciais. Esse é o caminho que a Meta usa pra avisar o SutoGas de cada nova mensagem.',
      },
      {
        titulo: 'Pronto — agente atendendo 24/7',
        texto: 'Independente do caminho, depois de conectado o agente começa a responder seus clientes na hora. Pode testar mandando uma mensagem do seu celular pessoal pro número do depósito.',
      },
    ],
    voltarPara: { href: '/dashboard/conexao', label: 'Voltar para Conexão' },
  },
  {
    slug: 'teste',
    passoKey: 'testeOk',
    titulo: 'Faça um pedido de teste',
    subtitulo: 'Confirme que o agente está atendendo de verdade',
    // youtubeId: 'PREENCHA_QUANDO_GRAVAR',
    passos: [
      {
        titulo: 'Mande mensagem pro número conectado',
        texto: 'Do SEU celular pessoal, manda uma mensagem como se fosse um cliente: "Quero 1 botijão de 13kg".',
      },
      {
        titulo: 'A IA vai responder com preços',
        texto: 'O agente puxa os preços do prompt e confirma a forma de pagamento.',
      },
      {
        titulo: 'Confirme o endereço',
        texto: 'Mande seu endereço. A IA monta o pedido e pede confirmação final.',
      },
      {
        titulo: 'Confirme o pedido',
        texto: 'Responda "confirmar" ou "sim". O pedido entra no painel e os entregadores recebem aviso.',
      },
    ],
    voltarPara: { href: '/dashboard/inicio', label: 'Voltar para Início' },
  },
];

export function tutorialPorSlug(slug: string): Tutorial | undefined {
  return TUTORIAIS.find((t) => t.slug === slug);
}

export function tutorialPorPasso(passoKey: Tutorial['passoKey']): Tutorial | undefined {
  return TUTORIAIS.find((t) => t.passoKey === passoKey);
}
