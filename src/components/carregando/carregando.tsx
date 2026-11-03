import styles from './carregando.module.css'

interface CarregandoProps {
  /* Variante */
  variante?: 'lista' | 'perfil' | 'detalhe' | 'cartoes' | 'projetos'
  quantidade?: number
}

/* Carregando */
export default function Carregando({ variante = 'lista', quantidade = 3 }: CarregandoProps) {
  const repetir = (n: number) => Array.from({ length: n }, (_, i) => i)

  if (variante === 'perfil') {
    return (
      <div className={styles.pagina} role="status" aria-busy="true" aria-label="Carregando">
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
      <div className={styles.pagina} role="status" aria-busy="true" aria-label="Carregando">
        <div className={`skeleton ${styles.titulo}`} style={{ width: '55%' }} />
        <div className={`skeleton ${styles.linha}`} style={{ width: '90%' }} />
        <div className={`skeleton ${styles.linha}`} style={{ width: '75%' }} />
        <div className={`skeleton ${styles.faixa}`} />
      </div>
    )
  }

  /* Mesmo formato dos cartões de projeto: categoria, título, descrição, etiquetas, valor e botão */
  if (variante === 'projetos') {
    return (
      <div className={styles.projetos} role="status" aria-busy="true" aria-label="Carregando projetos">
        {repetir(quantidade).map((i) => (
          <div key={i} className={styles.projeto}>
            <div className={`skeleton ${styles.linha}`} style={{ width: '16%', height: 10 }} />
            <div className={`skeleton ${styles.linha}`} style={{ width: '45%', height: 24 }} />
            <div className={`skeleton ${styles.linha}`} style={{ width: '78%' }} />
            <div className={styles.projetoRodape}>
              <div className={styles.etiquetas}>
                {repetir(3).map((j) => <div key={j} className={`skeleton ${styles.etiqueta}`} />)}
              </div>
              <div className={styles.etiquetas}>
                <div className={`skeleton ${styles.etiqueta}`} style={{ width: 96 }} />
                <div className={`skeleton ${styles.botao}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variante === 'cartoes') {
    return (
      <div className={styles.grade} role="status" aria-busy="true" aria-label="Carregando">
        {repetir(quantidade).map((i) => <div key={i} className={`skeleton ${styles.bloco}`} />)}
      </div>
    )
  }

  return (
    <div className={styles.pagina} role="status" aria-busy="true" aria-label="Carregando">
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
