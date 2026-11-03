import styles from '../../pages/Configuracoes.module.css'

/* Chave liga/desliga das Configurações */
export default function Chave({ ligada, aoMudar, rotulo, dica, desativada = false }: { ligada: boolean; aoMudar: (v: boolean) => void; rotulo: string; dica: string; desativada?: boolean }) {
  return (
    <div className={styles.opcao}>
      <div className={styles.opcaoTexto}>
        <strong>{rotulo}</strong>
        <span>{dica}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligada}
        aria-label={rotulo}
        className={`${styles.chave} ${ligada ? styles.chaveLigada : ''}`}
        disabled={desativada}
        onClick={() => aoMudar(!ligada)}
      >
        <span className={styles.bolinha} />
      </button>
    </div>
  )
}
