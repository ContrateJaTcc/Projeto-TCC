/*
 * Enfeites do cenário: os dos eventos do ano (Halloween, Natal...) e os cenários comprados na loja
 * (outono, cerejeira, vaga-lumes, aurora). Os de evento entram nas camadas do desenho, na mesma escala;
 * os de partículas ficam por cima de tudo, como o clima.
 */
import { useEffect } from 'react'
import { ALTURA, LARGURA, type Tema } from './camadas'
import Desenho from '../pixel/desenho'
import { comemorar } from '../../utils/preferencias'
import type { CodigoEvento } from '../../utils/eventos'
import styles from './enfeites.module.css'

/* ---------- Halloween ---------- */

const ABOBORA = ['....s....', '...s.....', '.ooOoOoo.', 'ooyoooyoo', 'oooOoOooo', 'oyyyyyyyo', '.ooyoyoo.', '..ooooo..']
const COR_ABOBORA = { o: '#e0782a', O: '#a84b16', y: '#ffd45e', s: '#4c7a2e' }

const MORCEGO_A = ['1.........1', '11..1.1..11', '111.111.111', '11111e1111.', '.1111111...', '...1...1...']
const MORCEGO_B = ['....1.1....', '...11111...', '.1111e11111', '11111111111', '1..1...1..1', '...........']
const COR_MORCEGO = { 1: '#0b0b13', e: '#ff6b5e' }

function Halloween({ camada }: { camada: string }) {
  if (camada === 'frente') {
    return (
      <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        {[[104, 278], [148, 279], [292, 279], [352, 278], [398, 279]].map(([x, y]) => (
          <Desenho key={x} className={styles.abobora} linhas={ABOBORA} cores={COR_ABOBORA} x={x} y={y} />
        ))}
      </svg>
    )
  }
  if (camada === 'ceu') {
    return (
      <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        {[[214, 70, ''], [262, 98, styles.atrasado], [292, 58, styles.atrasado2]].map(([x, y, extra]) => (
          <g key={String(x)} className={`${styles.morcego} ${extra}`}>
            <Desenho className={styles.asaA} linhas={MORCEGO_A} cores={COR_MORCEGO} x={Number(x)} y={Number(y)} />
            <Desenho className={styles.asaB} linhas={MORCEGO_B} cores={COR_MORCEGO} x={Number(x)} y={Number(y)} />
          </g>
        ))}
      </svg>
    )
  }
  return null
}

/* ---------- Natal ---------- */

const PINHEIRO = [
  '.....y.....',
  '....ggg....',
  '...ggrgg...',
  '..ggggggg..',
  '...gbggg...',
  '..ggggygg..',
  '.ggrggggg..',
  'gggggggbgg.',
  '.....t.....',
  '.....t.....',
]
const COR_PINHEIRO = { g: '#2f7a46', y: '#ffd45e', r: '#ff6b5e', b: '#5ec4d6', t: '#5a3a26' }
const ESTRELA = ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.']
const CORES_LUZ = ['#ff6b5e', '#ffd45e', '#5fe0a0', '#5ec4d6']

function Natal({ camada }: { camada: string }) {
  if (camada === 'castelo') {
    /* Varal de luzinhas caindo de leve de uma torre à outra, e a estrela na ponta da torre do meio */
    const luzes = Array.from({ length: 21 }, (_, i) => {
      const x = 178 + i * 6
      const y = 151 + Math.round(Math.sin((i / 20) * Math.PI) * 4)
      return { x, y, cor: CORES_LUZ[i % CORES_LUZ.length], par: i % 2 === 0 }
    })
    return (
      <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        <polyline points={luzes.map((l) => `${l.x + 0.5},${l.y - 0.5}`).join(' ')} fill="none" stroke="#0b0b13" strokeWidth="1" />
        {luzes.map((l) => (
          <rect key={l.x} x={l.x} y={l.y} width="1" height="2" fill={l.cor} className={l.par ? styles.piscaA : styles.piscaB} />
        ))}
        <Desenho className={styles.brilho} linhas={ESTRELA} cores={{ y: '#ffd45e' }} x={238} y={14} />
      </svg>
    )
  }
  if (camada === 'frente') {
    return (
      <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        <Desenho linhas={PINHEIRO} cores={COR_PINHEIRO} x={318} y={276} />
        <Desenho linhas={PINHEIRO} cores={COR_PINHEIRO} x={120} y={276} />
      </svg>
    )
  }
  return null
}

/* ---------- Festa Junina ---------- */

const BANDEIRA = ['11111', '11111', '.111.', '..1..']
const CORES_BANDEIRA = ['#ff6b5e', '#ffd45e', '#5ec4d6', '#5fe0a0', '#c69fa5']
const BALAO = ['.rrr.', 'rryrr', 'rrrrr', 'ryrry', '.rrr.', '..f..']
const FOGUEIRA = ['...y...', '..yyy..', '..yoy..', '.yooy..', '.yoooy.', 'yoorooy', '.ooroo.', 'tt.t.tt']

function FestaJunina({ camada }: { camada: string }) {
  if (camada === 'ceu') {
    const pontos = Array.from({ length: 33 }, (_, i) => {
      const x = i * 15
      const y = 24 + Math.round(Math.sin(((i % 11) / 10) * Math.PI) * 8)
      return { x, y, cor: CORES_BANDEIRA[i % CORES_BANDEIRA.length] }
    })
    return (
      <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        <polyline points={pontos.map((p) => `${p.x + 2.5},${p.y}`).join(' ')} fill="none" stroke="#3d2618" strokeWidth="1" />
        {pontos.map((p) => (
          <Desenho key={p.x} linhas={BANDEIRA} cores={{ 1: p.cor }} x={p.x} y={p.y} />
        ))}
        {[[60, ''], [380, styles.atrasado], [170, styles.atrasado2]].map(([x, extra]) => (
          <g key={String(x)} className={`${styles.balao} ${extra}`}>
            <Desenho linhas={BALAO} cores={{ r: '#ff6b5e', y: '#ffd45e', f: '#ffd45e' }} x={Number(x)} y={220} />
          </g>
        ))}
      </svg>
    )
  }
  if (camada === 'frente') {
    return (
      <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
        <Desenho className={styles.fogo} linhas={FOGUEIRA} cores={{ y: '#ffd45e', o: '#e0782a', r: '#ff6b5e', t: '#5a3a26' }} x={322} y={276} />
      </svg>
    )
  }
  return null
}

/* ---------- Ano Novo ---------- */

function AnoNovo({ camada }: { camada: string }) {
  if (camada !== 'ceu') return null
  const estrelas = [[40, 40], [120, 22], [180, 60], [320, 30], [400, 64], [450, 26], [90, 90], [360, 110]]
  return (
    <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
      {estrelas.map(([x, y], i) => (
        <g key={x} className={i % 2 ? styles.piscaA : styles.piscaB}>
          <rect x={x} y={y - 1} width="1" height="3" fill="#ffd45e" />
          <rect x={x - 1} y={y} width="3" height="1" fill="#ffd45e" />
        </g>
      ))}
    </svg>
  )
}

/* Enfeites de cada camada do desenho para o evento de agora */
export function EnfeitesDoEvento({ codigo, camada }: { codigo: CodigoEvento | null; camada: string }) {
  if (codigo === 'halloween') return <Halloween camada={camada} />
  if (codigo === 'natal') return <Natal camada={camada} />
  if (codigo === 'festa_junina') return <FestaJunina camada={camada} />
  if (codigo === 'ano_novo') return <AnoNovo camada={camada} />
  return null
}

/* Por cima de tudo: confete do Carnaval e fogos de vez em quando no Ano Novo */
export function SobreposicaoEvento({ codigo, animar, escala }: { codigo: CodigoEvento | null; animar: boolean; escala: number }) {
  useEffect(() => {
    if (codigo !== 'ano_novo' || !animar) return
    const id = setInterval(comemorar, 45_000)
    return () => clearInterval(id)
  }, [codigo, animar])

  if (codigo !== 'carnaval') return null
  return (
    <div className={animar ? '' : styles.parada} style={{ '--s': escala } as React.CSSProperties}>
      <div className={styles.confete} />
    </div>
  )
}

/* Cenário comprado na loja (só para quem comprou e equipou) */
export function EfeitoTema({ tema, cena, animar, escala }: { tema: string | null; cena: Tema; animar: boolean; escala: number }) {
  if (!tema) return null
  return (
    <div className={animar ? '' : styles.parada} style={{ '--s': escala } as React.CSSProperties} data-tema-cenario={tema}>
      {tema === 'tema_outono' && <div className={styles.folhas} />}
      {tema === 'tema_cerejeira' && <div className={styles.petalas} />}
      {tema === 'tema_vagalumes' && (
        <>
          <div className={`${styles.vagalumes} ${cena === 'claro' ? styles.vagalumesDia : ''}`} />
          <div className={`${styles.vagalumes} ${styles.vagalumes2} ${cena === 'claro' ? styles.vagalumesDia : ''}`} />
        </>
      )}
      {tema === 'tema_aurora' && <div className={`${styles.aurora} ${cena === 'claro' ? styles.auroraDia : ''}`} />}
    </div>
  )
}
