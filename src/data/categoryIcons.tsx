import { createElement } from 'react'
import {
  Monitor, Scale, DollarSign, Megaphone, Wrench, Briefcase,
  Code2, PenLine, Video, Languages, Camera, Headphones, Palette, GraduationCap,
  type LucideIcon,
} from 'lucide-react'

const categoryIcons: Record<string, LucideIcon> = {
  'Web Design': Monitor,
  'Serviços legais': Scale,
  'Finanças': DollarSign,
  'Marketing e vendas': Megaphone,
  'Marketing': Megaphone,
  'Administração': Wrench,
  'Desenvolvimento': Code2,
  'Redação e conteúdo': PenLine,
  'Vídeo e animação': Video,
  'Tradução': Languages,
  'Fotografia': Camera,
  'Suporte técnico': Headphones,
}

interface CategoryIconProps {
  categoria: string
  size?: number
  strokeWidth?: number
}

/* Categorias que vêm do banco com outros nomes: acha o ícone por palavra-chave */
const PALAVRAS: [RegExp, LucideIcon][] = [
  [/desenvolv|program|software|sistema|app/, Code2],
  [/design|grafic|logo|ilustra|arte/, Palette],
  [/web|site/, Monitor],
  [/reda|texto|conteudo|revis|escrit/, PenLine],
  [/aula|ensino|curso|professor|reforco/, GraduationCap],
  [/manuten|repar|instala|tecnic/, Wrench],
  [/marketing|venda|social/, Megaphone],
  [/financ|contab/, DollarSign],
  [/jurid|legal|advoc/, Scale],
  [/video|anima|edica/, Video],
  [/tradu|idioma/, Languages],
  [/foto/, Camera],
  [/suporte|atendimento/, Headphones],
]

function iconeDe(categoria: string) {
  if (categoryIcons[categoria]) return categoryIcons[categoria]
  const nome = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return PALAVRAS.find(([re]) => re.test(nome))?.[1] ?? Briefcase
}

export function CategoryIcon({ categoria, ...props }: CategoryIconProps) {
  return createElement(iconeDe(categoria), props)
}
