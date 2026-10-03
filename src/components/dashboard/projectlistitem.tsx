import { Link } from 'react-router-dom'
import { MapPin, Clock, CalendarDays, CircleCheck, ArrowRight } from 'lucide-react'
import { formatarValorServico, haQuanto } from '../../utils/formatar'
import styles from './projectlistitem.module.css'

/* O formato que os dois painéis (freelancer e contratante) montam a partir da API. */
export interface ItemProjeto {
  id: string | number
  titulo: string
  categoria: string
  descricao: string
  valor?: number
  tipoValor?: 'hora' | 'fixo'
  prazoDias?: number | null
  local: string
  status?: string
  postadoEm: string
  contratanteNome?: string
  jaCandidatado?: boolean
}

const ROTULO_STATUS: Record<string, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  finalizado: 'Concluído',
  cancelado: 'Cancelado',
}

interface ProjectListItemProps {
  projeto: ItemProjeto
  linkBase: string
  /* O contratante vê o status do próprio projeto; o freelancer, quem publicou. */
  mostrarStatus?: boolean
}

/*
 * Antes o card tinha um menu "..." cujas opções não faziam nada e uma
 * estrela com nota sempre 0. Os dois saíram; no lugar entrou o que ajuda a
 * decidir: categoria, há quanto tempo foi publicado e o prazo.
 * O card inteiro é clicável.
 */
export default function ProjectListItem({ projeto, linkBase, mostrarStatus = false }: ProjectListItemProps) {
  const rascunho = projeto.status === 'rascunho'
  const destino = rascunho ? `/contratante/criar-projeto?id=${projeto.id}` : `${linkBase}/${projeto.id}`
  const valor = projeto.valor ?? 0
  const tipoValor = projeto.tipoValor ?? 'fixo'
  const statusClass = projeto.status ? styles[projeto.status] ?? '' : ''
  const statusLabel = projeto.status ? ROTULO_STATUS[projeto.status] ?? projeto.status : ''

  return (
    <Link to={destino} className={`${styles.card} elevavel`}>
      <div className={styles.topo}>
        <span className={styles.categoria}>{projeto.categoria}</span>
        {mostrarStatus ? (
          <span className={`${styles.status} ${statusClass}`}>
            {statusLabel}
          </span>
        ) : (
          projeto.jaCandidatado && (
            <span className={styles.enviada}>
              <CircleCheck size={14} strokeWidth={2.4} /> Candidatura enviada
            </span>
          )
        )}
      </div>

      <h3 className={styles.titulo}>{projeto.titulo}</h3>
      <p className={styles.descricao}>{projeto.descricao}</p>

      <div className={styles.rodape}>
        <div className={styles.tags}>
          <span><MapPin size={14} strokeWidth={2.2} /> {projeto.local}</span>
          <span>
            <CalendarDays size={14} strokeWidth={2.2} />
            {projeto.prazoDias ? `${projeto.prazoDias} dias` : 'Prazo a combinar'}
          </span>
          {projeto.postadoEm && (
            <span><Clock size={14} strokeWidth={2.2} /> {haQuanto(projeto.postadoEm)}</span>
          )}
          {projeto.contratanteNome && <span className={styles.autor}>por {projeto.contratanteNome}</span>}
        </div>

        <div className={styles.valorAcao}>
          <strong className={styles.valor}>{formatarValorServico(valor, tipoValor)}</strong>
          <span className={styles.botao}>
            {rascunho ? 'Continuar editando' : 'Ver projeto'}
            <ArrowRight size={16} strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </Link>
  )
}
