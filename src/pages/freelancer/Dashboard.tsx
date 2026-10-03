import { getProjetos } from '../../data/mock'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import Recommended from '../../components/dashboard/recommended'

export default function FreelancerDashboard() {
  const projetos = getProjetos()

  return (
    <>
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
          titulo: 'Nada por aqui ainda',
          texto: 'Ainda não há projetos disponíveis para esta aba no momento.',
        }}
      />
      <Recommended />
    </>
  )
}
