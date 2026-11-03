import ProjectCard, { type Projeto } from './projectcard'
import { formatarValorServico } from '../../utils/formatar'
import styles from './recommended.module.css'

export interface ServicoRecomendavel {
  serv_id: number
  categoria: string
  serv_titulo: string
  serv_desc: string
  serv_valor: number | string
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias: number | null
  serv_data_criacao: string
  contratante_nota?: number | string | null
}

interface RecommendedProps {
  /* Projetos abertos em que o freelancer ainda não se candidatou */
  servicos: ServicoRecomendavel[]
  /* Categorias das candidaturas dele, a mais frequente primeiro */
  interesses: string[]
  /* Áreas de atuação que ele marcou no perfil */
  areas?: string[]
  linkBase: string
}

const LIMITE = 6
/* Até quanto tempo depois de publicado o projeto ganha o selo "Novo" */
const NOVO_ATE = 48 * 3_600_000

/*
 * Combina com você: área marcada no perfil pesa mais, depois as categorias em que já se candidatou,
 * depois contratante bem avaliado; empate fica com o mais novo.
 */
function pontuar(servico: ServicoRecomendavel, interesses: string[], areas: string[]) {
  const naArea = areas.includes(servico.categoria) ? 12 : 0
  const posicao = interesses.indexOf(servico.categoria)
  const categoria = posicao < 0 ? 0 : 10 - Math.min(posicao, 5)
  const nota = Number(servico.contratante_nota) || 0
  return naArea + categoria + nota / 2
}

/* O motivo que aparece no cartão (o mais forte) */
function motivoDe(servico: ServicoRecomendavel, interesses: string[], areas: string[]) {
  const nota = Number(servico.contratante_nota) || 0
  if (areas.includes(servico.categoria)) return `Na sua área: ${servico.categoria}`
  if (interesses.includes(servico.categoria)) return 'Parecido com o que você já procurou'
  if (nota >= 4.5) return `Contratante nota ${nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`
  return null
}

function paraCard(servico: ServicoRecomendavel, linkBase: string, interesses: string[], areas: string[]): Projeto {
  const nota = Number(servico.contratante_nota)
  return {
    motivo: motivoDe(servico, interesses, areas),
    id: String(servico.serv_id),
    titulo: servico.serv_titulo,
    categoria: servico.categoria,
    orcamento: formatarValorServico(servico.serv_valor, servico.serv_tipo_valor),
    prazo: servico.serv_qtd_dias ? `${servico.serv_qtd_dias} ${servico.serv_qtd_dias === 1 ? 'dia' : 'dias'}` : 'Prazo flexível',
    nota: nota > 0 ? nota : null,
    descricao: servico.serv_desc,
    link: `${linkBase}/${servico.serv_id}`,
    novo: Date.now() - new Date(servico.serv_data_criacao).getTime() < NOVO_ATE,
  }
}

export default function Recommended({ servicos, interesses, areas = [], linkBase }: RecommendedProps) {
  const projetos = [...servicos]
    .sort(
      (a, b) =>
        pontuar(b, interesses, areas) - pontuar(a, interesses, areas) ||
        new Date(b.serv_data_criacao).getTime() - new Date(a.serv_data_criacao).getTime()
    )
    .slice(0, LIMITE)
    .map((s) => paraCard(s, linkBase, interesses, areas))

  if (projetos.length === 0) return null

  return (
    <section className={styles.recomendados}>
      <h2 className="placa">Combina com você</h2>
      <p className={`${styles.explica} placa`}>Escolhidos pelas áreas do seu perfil, pelo que você já procurou e pela nota dos contratantes.</p>
      <div className={styles.grid}>
        {projetos.map((p) => (
          <ProjectCard key={p.id} projeto={p} />
        ))}
      </div>
    </section>
  )
}
