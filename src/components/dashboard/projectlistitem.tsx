import { Link } from 'react-router-dom'
import { MapPin, Clock, CalendarDays, CircleCheck, ArrowRight, Bookmark, Hourglass, ShieldAlert } from 'lucide-react'
import { prazoCandidaturas } from '../../utils/salvos'
import { formatarValorServico, haQuanto } from '../../utils/formatar'
import styles from './projectlistitem.module.css'

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
  statusCandidatura?: 'pendente' | 'aceita' | 'recusada' | 'cancelada'
  /* Até quando aceita candidaturas (AAAA-MM-DD) */
  candidaturasAte?: string | null
  /* Filtro de spam: esperando a administração ou recusado (com o motivo) */
  moderacao?: 'pendente' | 'aprovado' | 'recusado' | null
  moderacaoMotivo?: string | null
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
  mostrarStatus?: boolean
  /* Projetos salvos: só aparece o botão quando os dois vêm */
  salvo?: boolean
  onSalvar?: () => void
}

export default function ProjectListItem({ projeto, linkBase, mostrarStatus = false, salvo = false, onSalvar }: ProjectListItemProps) {
  const rascunho = projeto.status === 'rascunho'
  const destino = rascunho ? `/contratante/criar-projeto?id=${projeto.id}` : `${linkBase}/${projeto.id}`
  const valor = projeto.valor ?? 0
  const tipoValor = projeto.tipoValor ?? 'fixo'
  const statusClass = projeto.status ? styles[projeto.status] ?? '' : ''
  const statusLabel = projeto.status ? ROTULO_STATUS[projeto.status] ?? projeto.status : ''
  const inscricoes = projeto.status === 'aberto' || !projeto.status ? prazoCandidaturas(projeto.candidaturasAte) : null

  return (
    <div className={styles.envolto}>
    <Link to={destino} className={`${styles.card} ${onSalvar ? styles.comSalvar : ''} elevavel`}>
      <div className={styles.topo}>
        <span className={styles.categoria}>{projeto.categoria}</span>
        {mostrarStatus && (projeto.moderacao === 'pendente' || projeto.moderacao === 'recusado') ? (
          <span className={`${styles.status} ${styles.revisao}`} title={projeto.moderacaoMotivo ?? undefined}>
            <ShieldAlert size={13} strokeWidth={2.4} aria-hidden="true" />
            {projeto.moderacao === 'pendente' ? 'Em revisão' : 'Não aprovado'}
          </span>
        ) : mostrarStatus ? (
          <span className={`${styles.status} ${statusClass}`}>
            {statusLabel}
          </span>
        ) : projeto.statusCandidatura ? (
          <span className={styles.enviada}>
            <CircleCheck size={14} strokeWidth={2.4} />
            {projeto.statusCandidatura === 'aceita'
              ? 'Candidatura aceita'
              : 'Candidatura enviada'}
          </span>
        ) : projeto.jaCandidatado ? (
          <span className={styles.enviada}>
            <CircleCheck size={14} strokeWidth={2.4} />
            Candidatura enviada
          </span>
        ) : null}
      </div>

      <h3 className={styles.titulo}>{projeto.titulo}</h3>
      <p className={styles.descricao}>{projeto.descricao}</p>
      {mostrarStatus && projeto.moderacao === 'recusado' && projeto.moderacaoMotivo && (
        <p className={styles.motivoRevisao}>Motivo: {projeto.moderacaoMotivo}. Edite o projeto para mandar de novo.</p>
      )}
      {mostrarStatus && projeto.moderacao === 'pendente' && (
        <p className={styles.motivoRevisao}>A administração confere este anúncio antes de ele aparecer para os freelancers.</p>
      )}

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
          {inscricoes && (
            <span className={inscricoes.urgente ? styles.urgente : ''}>
              <Hourglass size={14} strokeWidth={2.2} /> {inscricoes.texto}
            </span>
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
    {/* Fora do link (botão dentro de link não vale): fica por cima, no canto */}
    {onSalvar && (
      <button
        type="button"
        className={`${styles.salvar} ${salvo ? styles.salvo : ''}`}
        onClick={onSalvar}
        aria-pressed={salvo}
        aria-label={salvo ? `Tirar "${projeto.titulo}" dos salvos` : `Salvar "${projeto.titulo}"`}
        title={salvo ? 'Tirar dos salvos' : 'Salvar para ver depois'}
      >
        <Bookmark size={18} strokeWidth={2.2} fill={salvo ? 'currentColor' : 'none'} />
      </button>
    )}
    </div>
  )
}
