import { Star } from 'lucide-react'
import { CategoryIcon } from '../../data/categoryIcons'
import styles from './projectcard.module.css'

export interface Projeto {
  titulo: string
  categoria: string
  orcamento: string
  prazo: string
  nota: number
  descricao: string
}

export default function ProjectCard({ projeto }: { projeto: Projeto }) {
  return (
    <article className={styles.card}>
      <div className={styles.topo}>
        <span className={styles.icone}><CategoryIcon categoria={projeto.categoria} size={17} strokeWidth={2.2} /></span>
        <span className={styles.categoria}>{projeto.categoria}</span>
      </div>
      <h3>{projeto.titulo}</h3>
      <p>{projeto.descricao}</p>
      <div className={styles.infos}>
        <span>{projeto.orcamento}</span>
        <span>{projeto.prazo}</span>
        <span className={styles.nota}><Star size={13} strokeWidth={2.4} fill="currentColor" /> {projeto.nota}</span>
      </div>
      <button type="button" className={styles.botao}>Ver projeto</button>
    </article>
  )
}
