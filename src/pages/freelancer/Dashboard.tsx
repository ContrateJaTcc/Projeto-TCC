import { getProjetos } from '../../data/mock'
import ProjectListSection from '../../components/dashboard/projectlistsection'
import Recommended from '../../components/dashboard/recommended'

export default function FreelancerDashboard() {
  return (
    <>
      <ProjectListSection
        titulo="Encontre projetos"
        buscaPlaceholder="Procure projetos"
        tabs={['Recomendados', 'Recentes', 'Salvos', 'Convites']}
        projetos={getProjetos()}
        linkBase="/freelancer/projetos"
        perfilNome="Usuário"
        perfilBio="Web Designer · nível 4"
        perfilProgresso={62}
      />
      <Recommended />
    </>
  )
}
