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
    // youtubeId: 'PREENCHA_QUANDO_GRAVAR',
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
    // youtubeId: 'PREENCHA_QUANDO_GRAVAR',
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
    subtitulo: 'Em 1 minuto: escaneia o QR Code e o agente começa a atender',
    // youtubeId: 'PREENCHA_QUANDO_GRAVAR',
    passos: [
      {
        titulo: 'Acesse a tela Conexão',
        texto: 'No menu lateral do painel SutoGas, clica em Conexão. O QR Code vai aparecer pronto pra escanear.',
      },
      {
        titulo: 'Pegue o celular do depósito',
        texto: 'Use o celular com o WhatsApp do depósito (o número que seus clientes mandam mensagem). Abra o app.',
      },
      {
        titulo: 'Abra os Dispositivos Conectados',
        texto: 'No WhatsApp toque nos três pontinhos (⋮) → Dispositivos conectados → Conectar um dispositivo.',
      },
      {
        titulo: 'Escaneie o QR Code',
        texto: 'Aponta a câmera do celular pro QR Code que aparece na tela do SutoGas. Em segundos conecta.',
      },
      {
        titulo: 'Pronto — agente atendendo 24/7',
        texto: 'A partir desse momento, qualquer mensagem que chegar no seu WhatsApp do depósito vai ser atendida pelo agente automaticamente.',
      },
    ],
    voltarPara: { href: '/dashboard/conexao', label: 'Voltar para Conexão' },
  },
  {
    slug: 'meta-api',
    passoKey: 'conexaoOk',
    titulo: 'Conecte com Meta API (oficial)',
    subtitulo: 'API oficial da Meta — mais estável, requer aprovação',
    // youtubeId: 'PREENCHA_QUANDO_GRAVAR',
    passos: [
      {
        titulo: 'Acesse developers.facebook.com',
        texto: 'Cria ou abre seu app de WhatsApp Business.',
      },
      {
        titulo: 'Copie o Phone Number ID',
        texto: 'Em WhatsApp → API Setup, copia o Phone Number ID do número que você conectou.',
      },
      {
        titulo: 'Gere um token permanente',
        texto: 'Em Business Settings → System Users, cria um usuário de sistema com permissão whatsapp_business_messaging e gera o token.',
      },
      {
        titulo: 'Cole no painel SutoGas',
        texto: 'Na tela Conexão, escolha Meta, cole Phone Number ID e Token e clique em Conectar.',
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
