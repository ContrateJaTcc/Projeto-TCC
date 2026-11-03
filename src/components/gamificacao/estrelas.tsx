import { Star } from 'lucide-react'
import styles from './gamificacao.module.css'

interface EstrelasProps {
  nota: number
  tamanho?: number
}

/* Estrelas */
export default function Estrelas({ nota, tamanho = 15 }: EstrelasProps) {
  const cheias = Math.round(nota)

  return (
    <span className={styles.estrelas} role="img" aria-label={`Nota ${nota.toLocaleString('pt-BR')} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={tamanho}
          strokeWidth={2}
          className={n <= cheias ? styles.estrelaCheia : styles.estrelaVazia}
        />
      ))}
    </span>
  )
}
