
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as IconeMapa } from 'lucide-react'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import type { ItemProjeto } from '../../components/dashboard/projectlistitem'
import Recommended, { type ServicoRecomendavel } from '../../components/dashboard/recommended'
import ConvitesRecebidos from '../../components/convites/convitesrecebidos'
import AlertasBusca from '../../components/alertas/alertasbusca'
import MissoesSemana from '../../components/gamificacao/missoes'
import FaixaEvento from '../../components/evento/faixaevento'
import PrimeirosPassos from '../../components/gamificacao/primeirospassos'
import RankingFreelancers from '../../components/gamificacao/ranking'
import VisitasPerfil from '../../components/dashboard/visitas'
import CartaoMascote from '../../components/dashboard/cartaomascote'
import gamificacao from '../../components/gamificacao/missoes.module.css'
import { api } from '../../services/api'
import { useSalvos } from '../../utils/salvos'
import { useToast } from '../../context/useToast'

interface ServicoApi {
  serv_id: number
  categoria: string
  serv_titulo: string
  serv_desc: string
  serv_valor: number | string
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias: number | null
  serv_local: string
  serv_cidade: string | null
  serv_estado: string | null
  serv_status: string
  serv_data_criacao: string
  contratante_nome?: string
  contratante_nota?: number | string | null
  serv_candidaturas_ate?: string | null
}

interface CandidaturaApi extends ServicoApi {
  cand_id: number
  cand_status: 'pendente' | 'aceita' | 'recusada' | 'cancelada'
}

function formatarServico(servico: ServicoApi): ItemProjeto {
  const local =
    servico.serv_local === 'remoto'
      ? 'Remoto'
      : [
          servico.serv_local === 'hibrido' ? 'Híbrido' : 'Presencial',
          servico.serv_cidade,
          servico.serv_estado,
        ]
          .filter(Boolean)
          .join(' · ')

  return {
    id: String(servico.serv_id),
    titulo: servico.serv_titulo,
    categoria: servico.categoria,
    descricao: servico.serv_desc,
    valor: Number(servico.serv_valor) || 0,
    tipoValor: servico.serv_tipo_valor,
    prazoDias: servico.serv_qtd_dias,
    local,
    status: servico.serv_status,
    postadoEm: servico.serv_data_criacao || '',
    contratanteNome: servico.contratante_nome,
    candidaturasAte: servico.serv_candidaturas_ate ?? null,
  }
}

export default function FreelancerDashboard() {
  const [projetos, setProjetos] = useState<ItemProjeto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sugestoes, setSugestoes] = useState<ServicoRecomendavel[]>([])
  const [interesses, setInteresses] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const toast = useToast()
  const navigate = useNavigate()
  const { ids: salvos, alternar } = useSalvos(true, (m) => toast.mostrar(m, 'erro'))

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true)
        setErro('')

        const [dadosAbertos, dadosCandidaturas] = await Promise.all([
          api<{ projetos: ServicoApi[] }>('/servicos/abertos'),
          api<{ candidaturas: CandidaturaApi[] }>('/candidaturas/minhas'),
        ])

        const candidaturasAtivas = dadosCandidaturas.candidaturas.filter(
          (candidatura) =>
            candidatura.cand_status === 'pendente' ||
            candidatura.cand_status === 'aceita' ||
            candidatura.cand_status === 'recusada'
        )

        const idsComCandidatura = new Set(
          candidaturasAtivas.map((candidatura) => String(candidatura.serv_id))
        )

        const semCandidatura = dadosAbertos.projetos.filter(
          (servico) => !idsComCandidatura.has(String(servico.serv_id))
        )
        const recomendados = semCandidatura.map(formatarServico)

        /* Categorias em que ele já se candidatou, da mais frequente para a menos */
        const contagem = new Map<string, number>()
        for (const c of dadosCandidaturas.candidaturas) {
          contagem.set(c.categoria, (contagem.get(c.categoria) ?? 0) + 1)
        }
        setInteresses([...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([categoria]) => categoria))
        setSugestoes(semCandidatura)
        api<{ areas: { tipo_nome: string }[] }>('/usuarios/eu/areas', { silencioso: true })
          .then((d) => setAreas(d.areas.map((a) => a.tipo_nome)))
          .catch(() => {})

        const minhasCandidaturas = dadosCandidaturas.candidaturas
          .filter(
            (candidatura) =>
              candidatura.cand_status === 'pendente' ||
              candidatura.cand_status === 'aceita'
          )
          .map((candidatura) => ({
            ...formatarServico(candidatura),
            statusCandidatura: candidatura.cand_status,
          }))

        setProjetos([...recomendados, ...minhasCandidaturas])
      } catch (erroApi) {
        console.error(erroApi)
        setErro('Não foi possível carregar seus serviços. Tente novamente.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [])

  return (
    <>
      <FaixaEvento />
      <ProjectListSection
        papel="freelancer"
        titulo="Encontre projetos"
        buscaPlaceholder="Procure projetos"
        abas={[
          {
            rotulo: 'Recomendados',
            filtro: (projeto) => !projeto.statusCandidatura,
          },
          ...(salvos
            ? [{ rotulo: 'Salvos', filtro: (projeto: ItemProjeto) => salvos.has(String(projeto.id)) }]
            : []),
          {
            rotulo: 'Contratados',
            filtro: (projeto) => projeto.statusCandidatura === 'aceita',
          },
          {
            rotulo: 'Minhas candidaturas',
            filtro: (projeto) => projeto.statusCandidatura === 'pendente',
          },
          {
            rotulo: 'Convites',
            filtro: () => false,
            conteudo: <ConvitesRecebidos />,
          },
        ]}
        projetos={projetos}
        linkBase="/freelancer/projetos"
        acao={
          <button type="button" onClick={() => navigate('/freelancer/mapa', { viewTransition: true })}>
            <IconeMapa size={18} strokeWidth={2.5} />
            Ver no mapa
          </button>
        }
        carregando={carregando}
        salvos={salvos}
        onSalvar={alternar}
        vazio={{
          titulo: erro ? 'Erro ao carregar' : 'Nada por aqui ainda',
          texto: erro || 'Ainda não há serviços disponíveis para esta aba.',
        }}
      />
      <AlertasBusca />
      <div className={gamificacao.grade}>
        <PrimeirosPassos />
        <MissoesSemana />
        <RankingFreelancers />
        <CartaoMascote />
        <VisitasPerfil />
      </div>
      <Recommended servicos={sugestoes} interesses={interesses} areas={areas} linkBase="/freelancer/projetos" />
    </>
  )
}
