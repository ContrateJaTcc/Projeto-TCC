import { progressoXp } from '../../utils/xp'
import styles from './barraxp.module.css'

interface BarraXpProps {
  xp: number
  /* Cabeçalho */
  compacta?: boolean
}

const SEGMENTOS = 10

/* Barra de XP em blocos */
export default function BarraXp({ xp, compacta = false }: BarraXpProps) {
  const p = progressoXp(xp)
  const cheios = Math.floor((p.percentual / 100) * SEGMENTOS)

  return (
    <div
      className={`${styles.barraXp} ${compacta ? styles.compacta : ''}`}
      title={`${p.faltam} XP para o nível ${p.nivel + 1}`}
    >
      <span className={styles.nivel}>
        <small>NV</small>
        {p.nivel}
      </span>
      <div className={styles.corpo}>
        <div
          className={styles.trilho}
          role="progressbar"
          aria-label={`Nível ${p.nivel}: ${p.xp} de ${p.proximo} XP`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.percentual)}
        >
          {Array.from({ length: SEGMENTOS }, (_, i) => (
            <span
              key={i}
              className={`${styles.segmento} ${i < cheios ? styles.cheio : ''} ${i === cheios ? styles.atual : ''}`}
            />
          ))}
        </div>
        <span className={styles.texto}>
          {p.xp}/{p.proximo} XP
        </span>
      </div>
    </div>
  )
}
