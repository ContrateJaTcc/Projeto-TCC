import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Projeto } from '../../data/mock'
import ProfileCard from './profilecard'
import ProjectListItem from './projectlistitem'
import styles from './projectlistsection.module.css'

interface ProjectListSectionProps {
  titulo: string
  buscaPlaceholder: string
  tabs: string[]
  projetos: Projeto[]
  linkBase: string
  perfilNome: string
  perfilBio: string
  perfilProgresso: number
}

export default function ProjectListSection({
  titulo,
  buscaPlaceholder,
  tabs,
  projetos,
  linkBase,
  perfilNome,
  perfilBio,
  perfilProgresso,
}: ProjectListSectionProps) {
  const [abaAtiva, setAbaAtiva] = useState(tabs[0])

const projetosFiltrados =
  abaAtiva === 'Publicados'
    ? projetos.filter((projeto) => projeto.status === 'aberto')
    : abaAtiva === 'Rascunhos'
      ? projetos.filter((projeto) => projeto.status === 'rascunho')
      : []

const mostrarLista = abaAtiva === 'Publicados' || abaAtiva === 'Rascunhos'

  return (
    <section className={styles.secao}>
      <div className={styles.topo}>
        <div className={styles.busca}>
          <Search size={17} strokeWidth={2.2} />
          <input type="text" placeholder={buscaPlaceholder} />
        </div>
        <ProfileCard nome={perfilNome} bio={perfilBio} progresso={perfilProgresso} />
      </div>

      <h2 className={styles.titulo}>{titulo}</h2>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === abaAtiva ? styles.ativa : ''}
            onClick={() => setAbaAtiva(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {mostrarLista ? (
        <div className={styles.lista}>
          {projetosFiltrados.map((p) => (
            <ProjectListItem key={p.id} projeto={p} linkBase={linkBase} />
          ))}
        </div>
      ) : (
        <p className={styles.vazio}>Nada por aqui ainda.</p>
      )}
    </section>
  )
}
