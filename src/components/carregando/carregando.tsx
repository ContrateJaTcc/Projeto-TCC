import styles from './carregando.module.css'

interface CarregandoProps {
  /* Formato aproximado do conteúdo que vai aparecer, para a troca não "pular". */
  variante?: 'lista' | 'perfil' | 'detalhe' | 'cartoes'
  quantidade?: number
}

/*
 * Esqueleto de carregamento no lugar do texto "Carregando...".
 *
 * O texto aparecia sozinho no canto e depois era trocado de uma vez pela
 * página inteira, um salto brusco. O esqueleto já ocupa o espaço com a
 * forma do conteúdo, então a troca parece contínua.
 */
export default function Carregando({ variante = 'lista', quantidade = 3 }: CarregandoProps) {
  const repetir = (n: number) => Array.from({ length: n }, (_, i) => i)

  if (variante === 'perfil') {
    return (
      <div className={styles.pagina} aria-busy="true" aria-label="Carregando">
        <div className={`skeleton ${styles.titulo}`} />
        <div className={styles.cartao}>
          <div className={`skeleton ${styles.avatar}`} />
          <div className={styles.linhas}>
            <div className={`skeleton ${styles.linha}`} style={{ width: '40%' }} />
            <div className={`skeleton ${styles.linha}`} style={{ width: '70%' }} />
            <div className={`skeleton ${styles.linha}`} style={{ width: '90%' }} />
          </div>
        </div>
        <div className={`skeleton ${styles.faixa}`} />
        <div className={styles.grade}>
          {repetir(4).map((i) => <div key={i} className={`skeleton ${styles.bloco}`} />)}
        </div>
      </div>
    )
  }

  if (variante === 'detalhe') {
    return (
      <div className={styles.pagina} aria-busy="true" aria-label="Carregando">
        <div className={`skeleton ${styles.titulo}`} style={{ width: '55%' }} />
        <div className={`skeleton ${styles.linha}`} style={{ width: '90%' }} />
        <div className={`skeleton ${styles.linha}`} style={{ width: '75%' }} />
        <div className={`skeleton ${styles.faixa}`} />
      </div>
    )
  }

  if (variante === 'cartoes') {
    return (
      <div className={styles.grade} aria-busy="true" aria-label="Carregando">
        {repetir(quantidade).map((i) => <div key={i} className={`skeleton ${styles.bloco}`} />)}
      </div>
    )
  }

  return (
    <div className={styles.pagina} aria-busy="true" aria-label="Carregando">
      <div className={`skeleton ${styles.titulo}`} />
      {repetir(quantidade).map((i) => (
        <div key={i} className={styles.item}>
          <div className={styles.linhas}>
            <div className={`skeleton ${styles.linha}`} style={{ width: '35%' }} />
            <div className={`skeleton ${styles.linha}`} style={{ width: '85%' }} />
            <div className={`skeleton ${styles.linha}`} style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
