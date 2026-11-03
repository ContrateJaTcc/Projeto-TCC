import Desenho from '../pixel/desenho'
import { corDaGuilda } from '../../utils/reino'
import styles from './reino.module.css'

/* Brasão da guilda em pixel art: escudo na cor escolhida com o símbolo no meio */

const ESCUDO = [
  '.OOOOOOOOOO.',
  'OCCCCCCCCCCO',
  'OCCCCCCCCCCO',
  'OCCCCCCCCCCO',
  'OCCCCCCCCCCO',
  'OCCCCCCCCCCO',
  'OCCCCCCCCCCO',
  'OCCCCCCCCCCO',
  '.OCCCCCCCCO.',
  '.OCCCCCCCCO.',
  '..OCCCCCCO..',
  '...OCCCCO...',
  '....OOOO....',
]

const SIMBOLOS: Record<string, string[]> = {
  escudo: ['..BB..', '..BB..', 'BBBBBB', 'BBBBBB', '..BB..', '..BB..'],
  espada: ['.....B', '....B.', '.B.B..', '..B...', '.B.B..', 'B.....'],
  dragao: ['B....B', 'BB..BB', 'BBBBBB', 'B.BB.B', 'BBBBBB', '.B..B.'],
  coroa: ['B.BB.B', 'B.BB.B', 'BBBBBB', 'BBBBBB', '.BBBB.', '......'],
  estrela: ['..BB..', '..BB..', 'BBBBBB', '.BBBB.', '.B..B.', 'B....B'],
  arvore: ['..BB..', '.BBBB.', 'BBBBBB', '.BBBB.', '..BB..', '..BB..'],
}

export default function Brasao({ brasao, cor, tamanho = 40, titulo }: { brasao: string; cor: string; tamanho?: number; titulo?: string }) {
  const cores = { O: '#1b1b30', C: corDaGuilda(cor), B: '#fff3d6' }
  return (
    <svg
      className={styles.brasao}
      width={tamanho}
      height={Math.round((tamanho * 13) / 12)}
      viewBox="0 0 12 13"
      shapeRendering="crispEdges"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <Desenho linhas={ESCUDO} cores={cores} />
      <Desenho linhas={SIMBOLOS[brasao] ?? SIMBOLOS.escudo} cores={cores} x={3} y={3} />
    </svg>
  )
}
