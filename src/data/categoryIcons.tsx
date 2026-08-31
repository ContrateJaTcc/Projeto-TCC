import { createElement } from 'react'
import {
  Monitor, Scale, DollarSign, Megaphone, Wrench, Briefcase,
  Code2, PenLine, Video, Languages, Camera, Headphones,
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

export function CategoryIcon({ categoria, ...props }: CategoryIconProps) {
  return createElement(categoryIcons[categoria] ?? Briefcase, props)
}
