export interface Autor {
  nome: string
  bio: string
  membroDesde: string
  numeroVerificado: boolean
  pagamentoVerificado: boolean
  totalPago: string
  servicosPostados: number
  nota: number
  totalAvaliacoes: number
}

export interface Projeto {
  id: string
  titulo: string
  categoria: string
  descricao: string
  orcamento: string
  prazo: string
  nota: number
  pagamentoVerificado: boolean
  local: string
  postadoEm: string
  autor: Autor
}

export interface ItemHistorico {
  id: string
  titulo: string
  categoria: string
  descricao: string
  valor: string
  data: string
  status: 'Concluído' | 'Em avaliação' | 'Cancelado'
  nota?: number
}

export interface Mensagem {
  id: string
  autor: 'eu' | 'outro'
  texto: string
  hora: string
}

export interface Conversa {
  id: string
  nome: string
  ultimaMensagem: string
  mensagens: Mensagem[]
}

const autores: Autor[] = [
  {
    nome: 'Julio Mairo de Souza',
    bio: 'Empreendedor buscando profissionais de confiança para escalar o negócio.',
    membroDesde: '15/07/2024',
    numeroVerificado: true,
    pagamentoVerificado: true,
    totalPago: 'R$ 5.362 pagos na plataforma',
    servicosPostados: 50,
    nota: 5,
    totalAvaliacoes: 320,
  },
  {
    nome: 'Marina Alves',
    bio: 'Gestora de marketing procurando parceiros criativos para campanhas.',
    membroDesde: '02/03/2025',
    numeroVerificado: true,
    pagamentoVerificado: true,
    totalPago: 'R$ 2.140 pagos na plataforma',
    servicosPostados: 18,
    nota: 4.8,
    totalAvaliacoes: 96,
  },
]

export const projetos: Projeto[] = [
  {
    id: '1',
    titulo: 'Landing page para lançamento de produto',
    categoria: 'Web Design',
    descricao:
      'Preciso de uma landing page moderna para o lançamento de um novo produto digital. O ideal é alguém com experiência em Figma e boas práticas de conversão, que consiga entregar um design responsivo e alinhado à nossa identidade visual.',
    orcamento: 'R$ 800 - 1.200',
    prazo: '10 dias',
    nota: 4.9,
    pagamentoVerificado: true,
    local: 'Remoto · Brasil',
    postadoEm: '15/07/2026',
    autor: autores[0],
  },
  {
    id: '2',
    titulo: 'Redesign completo de site institucional',
    categoria: 'Web Design',
    descricao:
      'Nosso site está desatualizado e precisa de um redesign completo, mantendo a estrutura de conteúdo mas modernizando o visual. Buscamos alguém que já tenha feito projetos parecidos e possa mostrar portfólio.',
    orcamento: 'R$ 1.500 - 2.000',
    prazo: '20 dias',
    nota: 4.7,
    pagamentoVerificado: true,
    local: 'Remoto · Brasil',
    postadoEm: '10/07/2026',
    autor: autores[1],
  },
  {
    id: '3',
    titulo: 'UI de aplicativo de delivery',
    categoria: 'Web Design',
    descricao:
      'Estamos criando um aplicativo de delivery para pequenos comércios e precisamos de telas de UI completas: onboarding, catálogo, carrinho e checkout. Protótipo navegável no Figma é obrigatório.',
    orcamento: 'R$ 2.200 - 3.000',
    prazo: '30 dias',
    nota: 5,
    pagamentoVerificado: true,
    local: 'Remoto · Brasil',
    postadoEm: '05/07/2026',
    autor: autores[0],
  },
]

export function getProjetos(): Projeto[] {
  return projetos
}

export function getProjetoPorId(id: string): Projeto | undefined {
  return projetos.find((p) => p.id === id)
}

export function getOutrosTrabalhos(autorNome: string, idAtual: string) {
  return projetos.filter((p) => p.autor.nome === autorNome && p.id !== idAtual)
}

export function getHistorico(): ItemHistorico[] {
  return [
    {
      id: 'h1',
      titulo: 'Identidade visual para cafeteria',
      categoria: 'Web Design',
      descricao: 'Criação de logo, paleta de cores e aplicação em materiais impressos.',
      valor: 'R$ 950',
      data: '28/05/2026',
      status: 'Concluído',
      nota: 5,
    },
    {
      id: 'h2',
      titulo: 'Revisão de contrato de prestação de serviços',
      categoria: 'Serviços legais',
      descricao: 'Análise e ajustes de cláusulas contratuais para autônomo.',
      valor: 'R$ 400',
      data: '12/04/2026',
      status: 'Concluído',
      nota: 4.8,
    },
    {
      id: 'h3',
      titulo: 'Planejamento financeiro mensal',
      categoria: 'Finanças',
      descricao: 'Organização de fluxo de caixa e relatório de despesas fixas.',
      valor: 'R$ 350',
      data: '02/04/2026',
      status: 'Em avaliação',
    },
    {
      id: 'h4',
      titulo: 'Landing page para lançamento de curso',
      categoria: 'Web Design',
      descricao: 'Página de vendas com formulário de inscrição e versão mobile.',
      valor: 'R$ 1.200',
      data: '15/06/2026',
      status: 'Em avaliação',
    },
    {
      id: 'h5',
      titulo: 'Campanha de tráfego pago',
      categoria: 'Marketing e vendas',
      descricao: 'Configuração de anúncios e relatório de desempenho das duas primeiras semanas.',
      valor: 'R$ 800',
      data: '09/06/2026',
      status: 'Em avaliação',
    },
  ]
}

/* Deriva de getHistorico() em vez de manter outra lista: um trabalho entregue
   é o mesmo registro do histórico, só que ainda pendente de avaliação. */
export function getEntregues(): ItemHistorico[] {
  return getHistorico().filter((item) => item.status === 'Em avaliação')
}

export interface Candidato {
  id: string
  nome: string
  especialidade: string
  nota: number
  proposta: string
  valorProposto: string
  projetoTitulo: string
}

export function getCandidatos(): Candidato[] {
  return [
    {
      id: 'cand1',
      nome: 'Bianca Souza',
      especialidade: 'Administração · Nível 15',
      nota: 4.9,
      proposta: 'Já trabalhei com landing pages parecidas, posso entregar em 8 dias com 2 rodadas de ajuste.',
      valorProposto: 'R$ 950',
      projetoTitulo: 'Landing page para lançamento de produto',
    },
    {
      id: 'cand2',
      nome: 'Lucas Tavares',
      especialidade: 'Marketing · Nível 9',
      nota: 4.7,
      proposta: 'Posso incluir também a versão mobile e testes de conversão sem custo extra.',
      valorProposto: 'R$ 1.100',
      projetoTitulo: 'Landing page para lançamento de produto',
    },
    {
      id: 'cand3',
      nome: 'Rafael Costa',
      especialidade: 'Finanças · Nível 7',
      nota: 4.6,
      proposta: 'Tenho disponibilidade imediata e experiência com redesign de sites institucionais.',
      valorProposto: 'R$ 1.800',
      projetoTitulo: 'Redesign completo de site institucional',
    },
  ]
}

export function getConversas(): Conversa[] {
  return [
    {
      id: 'c1',
      nome: 'Julio Mairo de Souza',
      ultimaMensagem: 'Perfeito, pode começar assim que possível!',
      mensagens: [
        { id: 'm1', autor: 'outro', texto: 'Oi! Vi sua proposta para a landing page, adorei o portfólio.', hora: '09:12' },
        { id: 'm2', autor: 'eu', texto: 'Que bom! Posso começar essa semana, te mando o cronograma.', hora: '09:15' },
        { id: 'm3', autor: 'outro', texto: 'Perfeito, pode começar assim que possível!', hora: '09:16' },
      ],
    },
    {
      id: 'c2',
      nome: 'Marina Alves',
      ultimaMensagem: 'Vou revisar a proposta e te retorno até amanhã.',
      mensagens: [
        { id: 'm1', autor: 'outro', texto: 'Olá, recebi seu orçamento para o redesign do site.', hora: '14:02' },
        { id: 'm2', autor: 'eu', texto: 'Oi Marina! Qualquer dúvida sobre os valores é só chamar.', hora: '14:10' },
        { id: 'm3', autor: 'outro', texto: 'Vou revisar a proposta e te retorno até amanhã.', hora: '14:12' },
      ],
    },
    {
      id: 'c3',
      nome: 'Lucas Tavares',
      ultimaMensagem: 'Consegue me enviar os arquivos em SVG também?',
      mensagens: [
        { id: 'm1', autor: 'outro', texto: 'Consegue me enviar os arquivos em SVG também?', hora: 'ontem' },
      ],
    },
  ]
}
