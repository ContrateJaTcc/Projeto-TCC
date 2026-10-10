
import { useEffect, useState } from 'react'
import { Search, MapPin, UserRound } from 'lucide-react'
import PrivateLayout from '../../components/layout/privatelayout'
import Avatar from '../../components/avatar/avatar'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { api } from '../../services/api'
import styles from './Freelancers.module.css'

interface Freelancer {
  usu_id: number
  usu_nome: string
  usu_desc: string | null
  usu_cid: string | null
  usu_est: string | null
  usu_foto: string | null
}

export default function Freelancers() {
  const PrivateLayoutWrapper = PrivateLayout as unknown as ({
    children,
  }: {
    children: React.ReactNode
  }) => React.ReactElement

  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarFreelancers() {
      try {
        const resposta = await api<Freelancer[]>('/usuarios/freelancers')
        setFreelancers(Array.isArray(resposta) ? resposta : [])
      } catch {
        setErro('Não foi possível carregar os freelancers.')
      } finally {
        setCarregando(false)
      }
    }

    carregarFreelancers()
  }, [])

  const filtrados = freelancers.filter((freelancer) =>
    `${freelancer.usu_nome} ${freelancer.usu_desc ?? ''} ${freelancer.usu_cid ?? ''} ${freelancer.usu_est ?? ''}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  )

  return (
    <PrivateLayoutWrapper>
      <main className={styles.pagina}>
        <header className={styles.cabecalho}>
          <h1>Freelancers</h1>
          <p>Encontre profissionais para os seus projetos.</p>
        </header>

        <div className={styles.busca}>
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar por nome, descrição ou localização..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {carregando ? (
          <Carregando />
        ) : erro ? (
          <EstadoErro mensagem={erro} />
        ) : filtrados.length === 0 ? (
          <p className={styles.vazio}>
            {busca
              ? 'Nenhum freelancer encontrado para essa busca.'
              : 'Nenhum freelancer encontrado.'}
          </p>
        ) : (
          <div className={styles.lista}>
            {filtrados.map((freelancer) => (
              <article className={styles.card} key={freelancer.usu_id}>
                <Avatar
                  nome={freelancer.usu_nome}
                  foto={freelancer.usu_foto}
                />

                <div className={styles.informacoes}>
                  <h2>{freelancer.usu_nome}</h2>

                  <p className={styles.local}>
                    <MapPin size={15} />
                    {freelancer.usu_cid || freelancer.usu_est
                      ? [freelancer.usu_cid, freelancer.usu_est]
                          .filter(Boolean)
                          .join(' - ')
                      : 'Localização não informada'}
                  </p>

                  <p className={styles.descricao}>
                    {freelancer.usu_desc || 'Este profissional ainda não adicionou uma descrição.'}
                  </p>

                  <a
                    href={`/contratante/freelancer/${freelancer.usu_id}`}
                    className={styles.botao}
                  >
                    <UserRound size={16} />
                    Ver perfil
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </PrivateLayoutWrapper>
  )
}
