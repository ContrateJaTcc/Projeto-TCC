import styles from './criterios.module.css'

export interface MediasCriterio {
  comunicacao: number | null
  prazo: number | null
  qualidade: number | null
  total: number
}

const ROTULOS: [keyof Omit<MediasCriterio, 'total'>, string][] = [
  ['comunicacao', 'Comunicação'],
  ['prazo', 'Prazo'],
  ['qualidade', 'Qualidade'],
]

/* Barrinhas de 1 a 5 de cada critério da avaliação (mostra em que a pessoa é mais forte) */
export default function NotasPorCriterio({ medias }: { medias: MediasCriterio | null | undefined }) {
  if (!medias?.total) return null
  const forte = ROTULOS.filter(([c]) => medias[c] !== null).sort((a, b) => (medias[b[0]] ?? 0) - (medias[a[0]] ?? 0))[0]
  return (
    <div className={styles.caixa}>
      <ul className={styles.lista} aria-label={`Notas por critério, de ${medias.total} ${medias.total === 1 ? 'avaliação' : 'avaliações'}`}>
        {ROTULOS.map(([c, rotulo]) =>
          medias[c] === null ? null : (
            <li key={c}>
              <span>{rotulo}</span>
              <span className={styles.barra} aria-hidden="true"><span style={{ width: `${((medias[c] ?? 0) / 5) * 100}%` }} /></span>
              <strong>{(medias[c] ?? 0).toLocaleString('pt-BR')}</strong>
            </li>
          )
        )}
      </ul>
      {forte && <small>Ponto forte: {forte[1].toLowerCase()}</small>}
    </div>
  )
}
