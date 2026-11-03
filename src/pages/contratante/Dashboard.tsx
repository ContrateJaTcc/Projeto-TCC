import { useEffect, useState } from 'react'
import FaixaEvento from '../../components/evento/faixaevento'
import { useNavigate } from 'react-router-dom'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import type { ItemProjeto } from '../../components/dashboard/projectlistitem'
import { Plus } from 'lucide-react'
import Candidatos from './Candidatos'

interface Servico {
  serv_id: number
  tipo_id: number
  categoria: string
  serv_titulo: string
  serv_desc: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_data_inicio: string | null
  serv_qtd_dias: number | null
  serv_local: 'remoto' | 'hibrido' | 'presencial'
  serv_cidade: string | null
  serv_estado: string | null
  serv_status: string
  serv_data_criacao: string
  serv_moderacao?: 'pendente' | 'aprovado' | 'recusado' | null
  serv_moderacao_motivo?: string | null
}

export default function ContratanteDashboard() {
  const [projetos, setProjetos] = useState<ItemProjeto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()
  const criar = () => navigate('/contratante/criar-projeto', { viewTransition: true })

  useEffect(() => {
    async function carregarProjetos() {
      try {
        const dados = await api<{ projetos: Servico[] }>('/servicos/meus')

        /* Mesmos campos que o card lê (valor, tipoValor, prazoDias) */
        const projetosFormatados: ItemProjeto[] = dados.projetos.map((servico) => ({
          id: servico.serv_id,
          status: servico.serv_status,
          titulo: servico.serv_titulo,
          categoria: servico.categoria,
          descricao: servico.serv_desc,
          valor: Number(servico.serv_valor) || 0,
          tipoValor: servico.serv_tipo_valor,
          prazoDias: servico.serv_qtd_dias,
          local:
            servico.serv_local === 'remoto'
              ? 'Remoto'
              : servico.serv_cidade
                ? `${servico.serv_cidade}${servico.serv_estado ? ` - ${servico.serv_estado}` : ''}`
                : servico.serv_local,
          postadoEm: servico.serv_data_criacao,
          moderacao: servico.serv_moderacao ?? null,
          moderacaoMotivo: servico.serv_moderacao_motivo ?? null,
        }))

        setProjetos(projetosFormatados)
        
      } catch (erro) {
        console.error(erro)
        setErro(erro instanceof ErroApi ? erro.message : 'Não foi possível conectar ao servidor.')
      } finally {
        setCarregando(false)
      }
    }

    carregarProjetos()
  }, [])

  if (carregando) {
    return <Carregando variante="lista" />
  }

  if (erro) {
    return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  }

  return (
    <>
    <FaixaEvento />
    <ProjectListSection
      papel="contratante"
      titulo="Seus projetos"
      buscaPlaceholder="Procure nos seus projetos.."
      
abas={[
  {
    rotulo: 'Publicados',
    filtro: (projeto) => projeto.status !== 'rascunho',
  },
  {
    rotulo: 'Rascunhos',
    filtro: (projeto) => projeto.status === 'rascunho',
  },
  {
    rotulo: 'Candidaturas',
    filtro: () => false,
    conteudo: <Candidatos />,
  },
]}

      projetos={projetos}
      linkBase="/contratante/projetos"
     acao={
  <button
    type="button"
    onClick={criar}
  >
    <Plus size={18} strokeWidth={2.5} />
    Criar projeto
  </button>
}
      vazio={{
        titulo: 'Você ainda não tem projetos publicados',
        texto: 'Crie o primeiro projeto e comece a receber propostas.',
        acao: (
          <button type="button" onClick={criar}>
            Criar projeto
          </button>
        ),
      }}
    />
    </>
  )
}