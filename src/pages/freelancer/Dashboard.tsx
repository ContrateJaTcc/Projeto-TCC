
import { useEffect, useState } from 'react'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import type { ItemProjeto } from '../../components/dashboard/projectlistitem'
import { api, ErroApi } from '../../services/api'

interface Servico {
  serv_id: number
  categoria: string
  serv_titulo: string
  serv_desc: string
  serv_valor: number | string
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias: number | null
  serv_local: 'remoto' | 'hibrido' | 'presencial'
  serv_cidade: string | null
  serv_estado: string | null
  serv_status: string
  serv_data_criacao: string
  contratante_nome: string
  ja_candidatado: boolean
}

export default function FreelancerDashboard() {
  const [projetos, setProjetos] = useState<ItemProjeto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarProjetos() {
      try {
        const dados = await api<{ projetos: Servico[] }>('/servicos/abertos')

        const projetosReais: ItemProjeto[] = dados.projetos.map((servico) => ({
          id: servico.serv_id,
          titulo: servico.serv_titulo,
          categoria: servico.categoria,
          descricao: servico.serv_desc,
          valor: Number(servico.serv_valor),
          tipoValor: servico.serv_tipo_valor,
          prazoDias: servico.serv_qtd_dias,
          local:
            servico.serv_local === 'remoto'
              ? 'Remoto'
              : [servico.serv_cidade, servico.serv_estado]
                  .filter(Boolean)
                  .join(' - ') ||
                (servico.serv_local === 'hibrido' ? 'Híbrido' : 'Presencial'),
          status: servico.serv_status,
          postadoEm: servico.serv_data_criacao,
          contratanteNome: servico.contratante_nome,
          jaCandidatado: servico.ja_candidatado,
        }))

        setProjetos(projetosReais)
      } catch (e) {
        setErro(
          e instanceof ErroApi
            ? e.message
            : 'Não foi possível carregar os projetos.'
        )
      } finally {
        setCarregando(false)
      }
    }

    carregarProjetos()
  }, [])

  if (carregando) {
    return <p>Carregando projetos disponíveis...</p>
  }

  if (erro) {
    return <p>{erro}</p>
  }

  return (
    <ProjectListSection
      papel="freelancer"
      titulo="Encontre projetos"
      buscaPlaceholder="Procure projetos"
      abas={[
        { rotulo: 'Recomendados', filtro: () => true },
        { rotulo: 'Recentes', filtro: () => true },
        { rotulo: 'Salvos', filtro: () => false },
        { rotulo: 'Convites', filtro: () => false },
      ]}
      projetos={projetos}
      linkBase="/freelancer/projetos"
      vazio={{
        titulo: 'Nenhum projeto disponível',
        texto: 'Quando os contratantes publicarem projetos, eles aparecerão aqui.',
      }}
    />
  )
}
