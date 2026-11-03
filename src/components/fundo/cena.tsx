import type { Clima } from '../../utils/preferencias'
import { CAMADAS, type Tema } from './camadas'
import styles from './fundopixel.module.css'

/*
 * As camadas do desenho para um tema; "noCeu" fica atrás do castelo e anda junto com ele.
 * "extras" desenha por cima de uma camada pelo nome (ex.: a fase da lua no céu, o gato no castelo)
 */
export function Camadas({ tema, animar, telaPequena = false, refs, noCeu, extras = {} }: { tema: Tema; animar: boolean; telaPequena?: boolean; refs?: React.RefObject<(HTMLDivElement | null)[]>; noCeu?: React.ReactNode; extras?: Partial<Record<string, React.ReactNode>> }) {
  return CAMADAS.map((c, i) => (
    <div
      key={c.nome}
      className={`${styles.camada} ${c.deriva && animar ? styles.deriva : ''} ${c.plana && animar ? styles.plana : ''}`}
      ref={
        refs
          ? (el) => {
              refs.current[i] = el
            }
          : undefined
      }
    >
      {c.nome === 'castelo' && noCeu}
      {/* Com animação, a camada "substitui" já vem inteira no SVG (ex.: o dragão batendo as asas) */}
      {!(c.substitui && animar) && <img src={`/fundo/${c.nome}-${tema}.png`} alt="" draggable={false} />}
      {c.anim && animar && !(c.detalhe && telaPequena) && <img src={`/fundo/${c.nome}-anim-${tema}.svg`} alt="" draggable={false} />}
      {extras[c.nome]}
    </div>
  ))
}

/* Chuva, tempestade, neve e o véu da neblina; "escala" = tamanho de um pixel do desenho na tela */
export function CamadasClima({ clima, tema, animar, escala }: { clima: Clima; tema: Tema; animar: boolean; escala: number }) {
  return (
    <div className={animar ? '' : styles.parada} style={{ '--s': escala } as React.CSSProperties}>
      {(clima === 'chuva' || clima === 'tempestade') && <div className={styles.chuva} />}
      {clima === 'tempestade' && <div className={styles.chuvaForte} />}
      {clima === 'tempestade' && animar && <div className={`${styles.raio} ${tema === 'claro' ? styles.raioDia : ''}`} />}
      {clima === 'neve' && <div className={styles.neve} />}
      {clima === 'neblina' && <div className={`${styles.veuNeblina} ${tema === 'claro' ? styles.veuNeblinaDia : ''}`} />}
    </div>
  )
}
