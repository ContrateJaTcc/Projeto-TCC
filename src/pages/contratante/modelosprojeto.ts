import { BookOpen, Code2, Hammer, Megaphone, Palette, PenLine, type LucideIcon } from 'lucide-react'

/* Modelos de projeto: atalhos para quem não sabe por onde começar (os valores são só sugestão) */
export interface ModeloProjeto {
  nome: string
  icone: LucideIcon
  titulo: string
  descricao: string
  categoria: string
  tipoValor: 'fixo' | 'hora'
  valor: number
  dias: number
  habilidades: string
  local: 'remoto' | 'hibrido' | 'presencial'
}

export const MODELOS: ModeloProjeto[] = [
  {
    nome: 'Site simples',
    icone: Code2,
    titulo: 'Site para meu negócio',
    descricao: 'Preciso de um site com página inicial, sobre nós, serviços e contato (com botão de WhatsApp). Tem que funcionar bem no celular.',
    categoria: 'Desenvolvimento Web',
    tipoValor: 'fixo',
    valor: 800,
    dias: 15,
    habilidades: 'HTML, CSS, site responsivo',
    local: 'remoto',
  },
  {
    nome: 'Logo',
    icone: Palette,
    titulo: 'Criação de logo',
    descricao: 'Quero um logo novo para a minha marca, com duas ou três opções para escolher e os arquivos finais em PNG e SVG.',
    categoria: 'Design Gráfico',
    tipoValor: 'fixo',
    valor: 300,
    dias: 7,
    habilidades: 'identidade visual, Illustrator ou Figma',
    local: 'remoto',
  },
  {
    nome: 'Redes sociais',
    icone: Megaphone,
    titulo: 'Posts para redes sociais',
    descricao: 'Preciso de artes e legendas para as redes sociais do meu negócio durante um mês (3 posts por semana).',
    categoria: 'Design Gráfico',
    tipoValor: 'fixo',
    valor: 450,
    dias: 30,
    habilidades: 'Canva ou Figma, redação para redes',
    local: 'remoto',
  },
  {
    nome: 'Revisão de texto',
    icone: PenLine,
    titulo: 'Revisão de texto',
    descricao: 'Tenho um texto que precisa de revisão de ortografia, gramática e clareza antes de publicar.',
    categoria: 'Redação',
    tipoValor: 'hora',
    valor: 40,
    dias: 5,
    habilidades: 'revisão, norma culta',
    local: 'remoto',
  },
  {
    nome: 'Aulas',
    icone: BookOpen,
    titulo: 'Aulas particulares',
    descricao: 'Procuro aulas particulares duas vezes por semana, com exercícios e acompanhamento do progresso.',
    categoria: 'Aulas Particulares',
    tipoValor: 'hora',
    valor: 60,
    dias: 30,
    habilidades: 'didática, paciência',
    local: 'hibrido',
  },
  {
    nome: 'Pequeno reparo',
    icone: Hammer,
    titulo: 'Pequeno reparo no local',
    descricao: 'Preciso de alguém para um reparo rápido no local (instalação, conserto ou montagem). Envio fotos pelo chat.',
    categoria: 'Manutenção',
    tipoValor: 'hora',
    valor: 50,
    dias: 3,
    habilidades: 'ferramentas próprias',
    local: 'presencial',
  },
]
