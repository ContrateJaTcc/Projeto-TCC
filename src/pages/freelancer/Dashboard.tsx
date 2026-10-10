
import { useEffect, useState } from 'react'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import type { ItemProjeto } from '../../components/dashboard/projectlistitem'
import Recommended from '../../components/dashboard/recommended'
import { api } from '../../services/api'

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
  }
}

export default function FreelancerDashboard() {
  const [projetos, setProjetos] = useState<ItemProjeto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

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

        const recomendados = dadosAbertos.projetos
          .filter((servico) => !idsComCandidatura.has(String(servico.serv_id)))
          .map(formatarServico)

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
      <ProjectListSection
        papel="freelancer"
        titulo="Encontre projetos"
        buscaPlaceholder="Procure projetos"
        abas={[
          {
            rotulo: 'Recomendados',
            filtro: (projeto) => !projeto.statusCandidatura,
          },
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
          },
        ]}
        projetos={projetos}
        linkBase="/freelancer/projetos"
        vazio={{
          titulo: carregando
            ? 'Carregando serviços...'
            : erro
              ? 'Erro ao carregar'
              : 'Nada por aqui ainda',
          texto: carregando
            ? 'Estamos buscando seus serviços e candidaturas.'
            : erro ||
              'Ainda não há serviços disponíveis para esta aba.',
        }}
      />
      <Recommended />
    </>
  )
}
