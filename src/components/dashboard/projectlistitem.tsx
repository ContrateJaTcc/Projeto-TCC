import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, X, Heart, CheckCircle2, Star, MapPin } from 'lucide-react'
import type { Projeto } from '../../data/mock'
import styles from './projectlistitem.module.css'

interface ProjectListItemProps {
  projeto: Projeto
  linkBase: string
}

export default function ProjectListItem({ projeto, linkBase }: ProjectListItemProps) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <article className={styles.card}>
      <div className={styles.topo}>
        <div>
          <h3 className={styles.titulo}>{projeto.titulo}</h3>
          <p className={styles.subtitulo}>{projeto.orcamento} · prazo de {projeto.prazo}</p>
        </div>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label="Mais opções"
          onClick={() => setMenuAberto(!menuAberto)}
        >
          <MoreHorizontal size={20} strokeWidth={2.2} />
        </button>
        {menuAberto && (
          <div className={styles.popup}>
            <button type="button" onClick={() => setMenuAberto(false)}><X size={16} strokeWidth={2.2} /> Não interessado</button>
            <button type="button" onClick={() => setMenuAberto(false)}><Heart size={16} strokeWidth={2.2} /> Mostrar mais trabalhos como esses</button>
          </div>
        )}
      </div>

      <p className={styles.descricao}>{projeto.descricao}</p>

      <div className={styles.tags}>
        {projeto.pagamentoVerificado && (
          <span className={styles.verificado}><CheckCircle2 size={14} strokeWidth={2.2} /> Pagamento verificado</span>
        )}
        <span className={styles.notaTag}><Star size={14} strokeWidth={2.2} fill="currentColor" /> {projeto.nota}</span>
        <span><MapPin size={14} strokeWidth={2.2} /> {projeto.local}</span>
      </div>

      <div className={styles.acoes}>
  {projeto.status === 'rascunho' ? (
    <Link
      to={`/contratante/criar-projeto?id=${projeto.id}`}
      className={styles.botao}
    >
      Editar projeto
    </Link>
  ) : (
    <Link
      to={`${linkBase}/${projeto.id}`}
      className={styles.botao}
    >
      Ver projeto
    </Link>
  )}
</div>
    </article>
  )
}
