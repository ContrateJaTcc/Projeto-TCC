import Desenho from '../pixel/desenho'
import styles from './ilustracao.module.css'

/* Desenhinhos pixel dos estados vazios (portfólio, conversas, histórico, listas) */
export type TipoIlustracao = 'caldeirao' | 'coruja' | 'morcego'

/* Paleta do castelo: contorno, ardósias, roxos, rosa, pêssego e creme */
const CORES: Record<string, string> = {
  1: '#272744',
  2: '#383a61',
  3: '#494d7e',
  4: '#8b6d9c',
  5: '#6a5d8d',
  6: '#c69fa5',
  7: '#f2d3ab',
  8: '#fbf5ef',
}

/* Caldeirão vazio, só com um fiapo de fumaça */
const CALDEIRAO = {
  largura: 16,
  fumaca: ['......66........', '.....6..6.......', '......66..6.....', '.........6......'],
  corpo: [
    '..111111111111..',
    '.15555555555551.',
    '..111111111111..',
    '.13333333333221.',
    '1344333333332221',
    '1343333333332221',
    '1333333333322221',
    '.13333333322221.',
    '..112222222211..',
    '...1.111111.1...',
    '..11........11..',
  ],
}

/* Coruja-correio esperando no galho */
const CORUJA = {
  largura: 14,
  aberta: [
    '..1........1..',
    '..11......11..',
    '..1333333331..',
    '.133333333331.',
    '.138813318831.',
    '.138113311831.',
    '.133337733331.',
    '.134443344431.',
    '.134646646431.',
    '.134464464431.',
    '..1344444431..',
    '..1133333311..',
    '22227722772222',
  ],
  /* Mesmas linhas dos olhos, fechados */
  fechada: ['.133333333331.', '.137733337731.'],
}

/* Morcego dormindo de cabeça para baixo, com o "zzz" */
const MORCEGO = {
  largura: 20,
  corpo: [
    '22222222222222222222',
    '......1..1......',
    '.....133331.....',
    '....13344331....',
    '...1334444331...',
    '...1333443331...',
    '...1333333331...',
    '...1333333331...',
    '....13333331....',
    '....11333311....',
    '.....173371.....',
    '.....133331.....',
    '.....1....1.....',
  ],
  /* Um "z" de 4x4 ao lado do corpo, fora do galho */
  zzz: ['................6666', '..................6.', '.................6..', '................6666'],
}

export default function Ilustracao({ tipo, tamanho = 4 }: { tipo: TipoIlustracao; tamanho?: number }) {
  if (tipo === 'caldeirao') {
    const altura = CALDEIRAO.fumaca.length + CALDEIRAO.corpo.length
    return (
      <svg className={styles.ilustracao} viewBox={`0 0 ${CALDEIRAO.largura} ${altura}`} width={CALDEIRAO.largura * tamanho} height={altura * tamanho} shapeRendering="crispEdges" aria-hidden="true">
        <Desenho className={styles.fumaca} linhas={CALDEIRAO.fumaca} cores={CORES} />
        <Desenho linhas={CALDEIRAO.corpo} cores={CORES} y={CALDEIRAO.fumaca.length} />
      </svg>
    )
  }
  if (tipo === 'coruja') {
    const altura = CORUJA.aberta.length
    return (
      <svg className={styles.ilustracao} viewBox={`0 0 ${CORUJA.largura} ${altura}`} width={CORUJA.largura * tamanho} height={altura * tamanho} shapeRendering="crispEdges" aria-hidden="true">
        <Desenho linhas={CORUJA.aberta} cores={CORES} />
        <Desenho className={styles.piscar} linhas={CORUJA.fechada} cores={CORES} y={4} />
      </svg>
    )
  }
  const altura = MORCEGO.corpo.length
  return (
    <svg className={styles.ilustracao} viewBox={`0 0 ${MORCEGO.largura} ${altura}`} width={MORCEGO.largura * tamanho} height={altura * tamanho} shapeRendering="crispEdges" aria-hidden="true">
      <Desenho linhas={MORCEGO.corpo.slice(0, 1)} cores={CORES} />
      <g className={styles.balanco}>
        <Desenho linhas={MORCEGO.corpo.slice(1)} cores={CORES} y={1} />
      </g>
      <Desenho className={styles.zzz} linhas={MORCEGO.zzz} cores={CORES} y={4} />
    </svg>
  )
}
