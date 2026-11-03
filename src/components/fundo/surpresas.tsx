/* Desenhos das surpresas do cenário (quando e qual aparece fica em usesurpresa.ts) */
import { ALTURA, LARGURA, type Tema } from './camadas'
import Desenho from '../pixel/desenho'
import styles from './fundopixel.module.css'
import { CAMADA, type SurpresaAtual } from './usesurpresa'

/* Virada para a esquerda: vassoura na frente, cerdas e capa para trás */
const BRUXA = [
  '......1.............',
  '......11............',
  '.....111............',
  '.....1111...........',
  '...11111111.........',
  '......111...........',
  '......1111..........',
  '.....111111.11......',
  '.....1111111111.....',
  '2222221111222222333.',
  '......1..1.......333',
  '................33..',
]

/* Gato andando para a direita; as duas versões só mudam as patas */
/* Contorno de luar ("4") nas orelhas, na cabeça, na ponta do rabo e no lombo */
const GATO = ['.4......4..4', '4.......4441', '1.......11e1', '.1444444441.', '..11111111..']
const PATAS_A = '..1.1..1.1..'
const PATAS_B = '...1.1..1.1.'

/* Olhos grandes de 2x2 e bico; fechados, os olhos viram um risco */
const CORUJA = ['1.....1', '11...11', '1111111', '1ee1ee1', '1ee1ee1', '111b111', '.11111.', '..1.1..']
const CORUJA_OLHOS_FECHADOS = ['', '', '', '1111111', '1ss1ss1']

function Bruxa() {
  return (
    <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
      <g transform="translate(312 58)">
        <Desenho className={styles.bruxa} linhas={BRUXA} cores={{ 1: '#0b0b13', 2: '#1b1b30', 3: '#272744' }} />
      </g>
    </svg>
  )
}

function Gato({ tema }: { tema: Tema }) {
  /* Corpo preto com borda de luar: o recorte é o que separa o gato do muro escuro */
  const cores = tema === 'escuro' ? { 1: '#0b0b13', 4: '#c69fa5', e: '#fbf5ef' } : { 1: '#0b0b13', 4: '#f2d3ab', e: '#f2d3ab' }
  return (
    <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
      {/* Patas em cima do muro da esquerda do castelo (topo em y = 180) */}
      <g transform="translate(126 174)">
        <g className={styles.gato}>
          <Desenho linhas={GATO} cores={cores} />
          <Desenho className={styles.patasA} linhas={['', '', '', '', '', PATAS_A]} cores={cores} />
          <Desenho className={styles.patasB} linhas={['', '', '', '', '', PATAS_B]} cores={cores} />
        </g>
      </g>
    </svg>
  )
}

function Corujas() {
  const cores = { 1: '#0b0b13', e: '#f2d3ab', b: '#c69fa5', s: '#494d7e' }
  /* Cada uma num galho das árvores grandes da frente */
  const lugares: [number, number, string][] = [
    [73, 96, ''],
    [383, 113, styles.corujaAtrasada],
  ]
  return (
    <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
      {lugares.map(([x, y, extra]) => (
        <g key={x} className={`${styles.coruja} ${extra}`}>
          <Desenho className={styles.olhosAbertos} linhas={CORUJA} cores={cores} x={x} y={y} />
          <Desenho className={styles.olhosFechados} linhas={CORUJA_OLHOS_FECHADOS} cores={cores} x={x} y={y} />
        </g>
      ))}
    </svg>
  )
}

/* A surpresa da vez, desenhada só na camada certa (a bruxa no céu, o gato no castelo, as corujas na frente) */
export default function SurpresaNaCamada({ surpresa, camada, tema }: { surpresa: SurpresaAtual | null; camada: string; tema: Tema }) {
  if (!surpresa || CAMADA[surpresa.tipo] !== camada) return null
  const { tipo, id } = surpresa
  if (tipo === 'bruxa') return <Bruxa key={id} />
  if (tipo === 'gato') return <Gato key={id} tema={tema} />
  return <Corujas key={id} />
}
