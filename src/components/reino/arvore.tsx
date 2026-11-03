import type { AreaArvore } from '../../utils/arvore'
import styles from './arvore.module.css'

/*
 * Árvore de habilidades de uma área em pixel art: o tronco sobe do "Primeiro passo" ao "Mestre",
 * e cada galho acende quando a meta é cumprida. compacta: só a fileira de quadradinhos (para o portfólio).
 */
export default function ArvoreArea({ area, compacta = false }: { area: AreaArvore; compacta?: boolean }) {
  return (
    <figure className={`${styles.arvore} ${compacta ? styles.compacta : ''}`}>
      <figcaption>
        <strong>{area.area}</strong>
        <span>{area.acesos} de {area.galhos.length}</span>
      </figcaption>
      <ol className={styles.galhos}>
        {area.galhos.map((g, i) => (
          <li key={g.codigo} className={g.aceso ? styles.aceso : ''} style={{ '--i': i } as React.CSSProperties}>
            <span className={styles.no} aria-hidden="true" />
            {!compacta && (
              <span className={styles.texto}>
                <strong>{g.titulo}</strong>
                <small>{g.descricao}{!g.aceso && g.meta > 1 ? ` (${g.progresso}/${g.meta})` : ''}</small>
              </span>
            )}
            <span className="sr-only">{g.aceso ? 'conquistado' : 'falta'}{compacta ? `: ${g.titulo}` : ''}</span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
