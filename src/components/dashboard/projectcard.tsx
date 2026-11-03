import { Link } from 'react-router-dom'
import { Star, Sparkles } from 'lucide-react'
import { CategoryIcon } from '../../data/categoryIcons'
import styles from './projectcard.module.css'

export interface Projeto {
  id: string
  titulo: string
  categoria: string
  orcamento: string
  prazo: string
  /* Média do contratante; sem avaliações fica de fora */
  nota: number | null
  descricao: string
  link: string
  /* Publicado nas últimas 48 horas */
  novo?: boolean
  /* Por que combina com o freelancer ("Na sua área: Design") */
  motivo?: string | null
}

export default function ProjectCard({ projeto }: { projeto: Projeto }) {
  return (
    <article className={styles.card}>
      <div className={styles.topo}>
        <span className={styles.icone}><CategoryIcon categoria={projeto.categoria} size={17} strokeWidth={2.2} /></span>
        <span className={styles.categoria}>{projeto.categoria}</span>
        {projeto.novo && <span className={styles.novo}>Novo</span>}
      </div>
      {projeto.motivo && (
        <span className={styles.motivo}>
          <Sparkles size={13} strokeWidth={2.4} aria-hidden="true" /> {projeto.motivo}
        </span>
      )}
      <h3>{projeto.titulo}</h3>
      <p>{projeto.descricao}</p>
      <div className={styles.infos}>
        <span>{projeto.orcamento}</span>
        <span>{projeto.prazo}</span>
        {projeto.nota !== null && (
          <span className={styles.nota} title="Nota do contratante">
            <Star size={13} strokeWidth={2.4} fill="currentColor" /> {projeto.nota}
          </span>
        )}
      </div>
      <Link to={projeto.link} className={styles.botao}>Ver projeto</Link>
    </article>
  )
}
