import { useEffect, useState } from 'react'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import type { Projeto } from '../../data/mock'

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
}

export default function ContratanteDashboard() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarProjetos() {
      try {
        const token = localStorage.getItem('token')

        if (!token) {
          setErro('Você precisa estar logado para ver seus projetos.')
          return
        }

        const resposta = await fetch(
          'https://backendtcc-zeta.vercel.app/servicos/meus',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
          setErro(dados.erro || 'Erro ao carregar projetos.')
          return
        }

        const projetosFormatados: Projeto[] = dados.projetos.map(
          (servico: Servico) => ({
            id: String(servico.serv_id),
            status: servico.serv_status,
            titulo: servico.serv_titulo,
            categoria: servico.categoria,
            descricao: servico.serv_desc,

            orcamento:
              servico.serv_tipo_valor === 'hora'
                ? `R$ ${Number(servico.serv_valor).toFixed(2)}/hora`
                : `R$ ${Number(servico.serv_valor).toFixed(2)}`,

            prazo: servico.serv_qtd_dias
              ? `${servico.serv_qtd_dias} dias`
              : 'Não informado',

            nota: 0,
            pagamentoVerificado: false,

            local:
              servico.serv_local === 'remoto'
                ? 'Remoto'
                : servico.serv_cidade
                  ? `${servico.serv_cidade}${servico.serv_estado ? ` - ${servico.serv_estado}` : ''}`
                  : servico.serv_local,

            postadoEm: servico.serv_data_criacao,

            autor: {
              nome: 'Você',
              bio: 'Contratante',
              membroDesde: '',
              numeroVerificado: false,
              pagamentoVerificado: false,
              totalPago: 'R$ 0,00',
              servicosPostados: 0,
              nota: 0,
              totalAvaliacoes: 0,
            },
          })
        )

        setProjetos(projetosFormatados)
        
      } catch (erro) {
        console.error(erro)
        setErro('Não foi possível conectar ao servidor :().')
      } finally {
        setCarregando(false)
      }
    }

    carregarProjetos()
  }, [])

  if (carregando) {
    return <p>Carregando seus projetos, espere um tempinho 0.0...</p>
  }

  if (erro) {
    return <p>{erro}</p>
  }

  return (
    <ProjectListSection
      papel="contratante"
      titulo="Seus projetos"
      buscaPlaceholder="Procure nos seus projetos.."
      abas={[
        { rotulo: 'Publicados', filtro: (projeto) => projeto.status !== 'rascunho' },
        { rotulo: 'Rascunhos', filtro: (projeto) => projeto.status === 'rascunho' },
        { rotulo: 'Salvos', filtro: () => false },
        { rotulo: 'Convites', filtro: () => false },
      ]}
      projetos={projetos}
      linkBase="/contratante/projetos"
      acao={
        <button type="button" onClick={() => (window.location.href = '/contratante/criar-projeto')}>
          Criar projeto
        </button>
      }
      vazio={{
        titulo: 'Você ainda não tem projetos publicados',
        texto: 'Crie o primeiro projeto e comece a receber propostas.',
        acao: (
          <button type="button" onClick={() => (window.location.href = '/contratante/criar-projeto')}>
            Criar projeto
          </button>
        ),
      }}
    />
  )
}