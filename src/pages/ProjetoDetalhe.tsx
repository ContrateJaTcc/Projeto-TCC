import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Star, BadgeCheck } from 'lucide-react'
import { getProjetoPorId, getOutrosTrabalhos } from '../data/mock'
import { useRole } from '../context/useRole'
import Avatar from '../components/avatar/avatar'
import styles from './ProjetoDetalhe.module.css'

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const { role } = useRole()
  const projeto = getProjetoPorId(id ?? '')
  const base = role === 'contratante' ? '/contratante' : '/freelancer'

  if (!projeto) {
    return (
      <div className={styles.pagina}>
        <p>Projeto não encontrado.</p>
        <Link to={base} className={styles.voltar} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.2} /></Link>
      </div>
    )
  }

  const outros = getOutrosTrabalhos(projeto.autor.nome, projeto.id)

  return (
    <div className={styles.pagina}>
      <div className={styles.principal}>
        <Link to={base} className={styles.voltar} aria-label="Voltar"><ArrowLeft size={18} strokeWidth={2.2} /></Link>

        <div className={styles.cabecalho}>
          <h1 className={styles.titulo}>{projeto.titulo}</h1>
          <div className={styles.meta}>
            <div>Postado em {projeto.postadoEm}</div>
            <div className={styles.estrelas}><Star size={14} strokeWidth={2.2} fill="currentColor" /> {projeto.autor.nota} de {projeto.autor.totalAvaliacoes} avaliações</div>
          </div>
        </div>

        <p className={styles.descricao}>{projeto.descricao}</p>

        <div className={styles.info}>
          <div>
            <strong>Categoria</strong>
            <span>{projeto.categoria}</span>
          </div>
          <div>
            <strong>Preço do serviço</strong>
            <span>{projeto.orcamento}</span>
          </div>
          <div>
            <strong>Prazo</strong>
            <span>{projeto.prazo}</span>
          </div>
        </div>
      </div>

      <aside>
        <div className={styles.autorCard}>
          <div className={styles.autorTopo}>
            <Avatar nome={projeto.autor.nome} size={58} />
            <div>
              <div className={styles.autorNome}>{projeto.autor.nome}</div>
              <div className={styles.autorNota}><Star size={13} strokeWidth={2.2} fill="currentColor" /> {projeto.autor.nota} de {projeto.autor.totalAvaliacoes} avaliações</div>
            </div>
          </div>
          <p className={styles.autorBio}>{projeto.autor.bio}</p>
          <div className={styles.autorStats}>
            <span>Membro desde {projeto.autor.membroDesde}</span>
            {projeto.autor.numeroVerificado && <span className={styles.verificado}><BadgeCheck size={15} strokeWidth={2.2} /> Número verificado</span>}
            {projeto.autor.pagamentoVerificado && <span className={styles.verificado}><BadgeCheck size={15} strokeWidth={2.2} /> Método de pagamento verificado</span>}
            <span>{projeto.autor.totalPago}</span>
            <span>{projeto.autor.servicosPostados} serviços postados</span>
          </div>
        </div>

        {outros.length > 0 && (
          <div className={styles.outros}>
            <h2>Outros trabalhos do mesmo usuário</h2>
            <div className={styles.outrosLista}>
              {outros.map((o) => (
                <Link key={o.id} to={`${base}/projetos/${o.id}`} className={styles.outroCard}>
                  <strong>{o.titulo}</strong>
                  <p>{o.descricao}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
