import { getProjetos } from '../../data/mock'
import ProjectListSection from '../../components/dashboard/projectlistsection'

export default function ContratanteDashboard() {
  return (
    <ProjectListSection
      titulo="Seus projetos"
      buscaPlaceholder="Procure nos seus projetos.."
      tabs={['Seus projetos', 'Recentes', 'Salvos', 'Convites']}
      projetos={getProjetos()}
      linkBase="/contratante/projetos"
      perfilNome="Usuário"
      perfilBio="Contratante · 3 projetos ativos"
      perfilProgresso={40}
    />
  )
}
