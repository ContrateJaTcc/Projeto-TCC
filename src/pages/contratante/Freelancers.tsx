
import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, UserRound, SlidersHorizontal, X } from 'lucide-react'
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
  areas_atuacao?: string | null
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export default function Freelancers() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [areaSelecionada, setAreaSelecionada] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarFreelancers() {
      try {
        const resposta = await api<Freelancer[]>('/usuarios/freelancers')

        if (ativo) {
          setFreelancers(Array.isArray(resposta) ? resposta : [])
        }
      } catch (erro) {
        console.error('Erro ao carregar freelancers:', erro)

        if (ativo) {
          setErro('Não foi possível carregar os freelancers. Verifique a conexão com o servidor.')
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregarFreelancers()

    return () => {
      ativo = false
    }
  }, [])

  const areasDisponiveis = useMemo(() => {
    const areas = freelancers.flatMap((freelancer) =>
      (freelancer.areas_atuacao ?? '')
        .split(',')
        .map((area) => area.trim())
        .filter(Boolean)
    )

    return [...new Set(areas)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [freelancers])

  const estadosDisponiveis = useMemo(() => {
    return [
      ...new Set(
        freelancers
          .map((freelancer) => freelancer.usu_est?.trim().toUpperCase())
          .filter((uf): uf is string => Boolean(uf))
      ),
    ].sort()
  }, [freelancers])

  
  const filtrados = useMemo(() => {
    const cidadeBusca = normalizar(cidade)
    const estadoBusca = estado.trim().toUpperCase()
    const areaBusca = normalizar(areaSelecionada)

    return freelancers.filter((freelancer) => {
      const areas = (freelancer.areas_atuacao ?? '')
        .split(',')
        .map(normalizar)
        .filter(Boolean)

      const correspondeArea =
        !areaBusca || areas.some((area) => area === areaBusca)

      const correspondeCidade =
        !cidadeBusca ||
        normalizar(freelancer.usu_cid ?? '').includes(cidadeBusca)

      const correspondeEstado =
        !estadoBusca ||
        (freelancer.usu_est ?? '').trim().toUpperCase() === estadoBusca

      return correspondeArea && correspondeCidade && correspondeEstado
    })
  }, [freelancers, areaSelecionada, cidade, estado])

 function limparFiltros() {
  setAreaSelecionada('')
  setCidade('')
  setEstado('')
}

  const existemFiltros = Boolean(areaSelecionada || cidade || estado)

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Encontre freelancers</h1>
          <p>Encontre profissionais usando os filtros do seu projeto.</p>
        </div>
      </header>

      <section className={styles.painelFiltros} aria-label="Filtros de freelancers">
    
        <div className={styles.tituloFiltros}>
          <SlidersHorizontal size={17} />
          <h2>Filtrar profissionais</h2>
        </div>

        <div className={styles.filtros}>
          <label className={styles.campo}>
            <span>Área de atuação</span>
            <select
              value={areaSelecionada}
              onChange={(e) => setAreaSelecionada(e.target.value)}
            >
              <option value="">Todas as áreas</option>
              {areasDisponiveis.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Cidade</span>
            <input
              type="text"
              placeholder="Ex.: Volta Redonda"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </label>

          <label className={styles.campo}>
            <span>Estado</span>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="">Todos os estados</option>
              {estadosDisponiveis.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.resumoFiltros}>
          <span>
            {carregando
              ? 'Carregando profissionais...'
              : `${filtrados.length} ${filtrados.length === 1 ? 'profissional encontrado' : 'profissionais encontrados'}`}
          </span>

          {existemFiltros && (
            <button
              type="button"
              className={styles.limparFiltros}
              onClick={limparFiltros}
            >
              <X size={15} />
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} />
      ) : filtrados.length === 0 ? (
        <div className={styles.vazio}>
          <Search size={30} />
          <h2>Nenhum profissional encontrado</h2>
          <p>
            {existemFiltros
              ? 'Tente alterar os filtros selecionados.'
              : 'Ainda não há freelancers disponíveis para exibir.'}
          </p>
          {existemFiltros && (
            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className={styles.lista}>
          {filtrados.map((freelancer) => {
            const areas = (freelancer.areas_atuacao ?? '')
              .split(',')
              .map((area) => area.trim())
              .filter(Boolean)

            return (
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
                    {freelancer.usu_desc ||
                      'Este profissional ainda não adicionou uma descrição.'}
                  </p>

                  {areas.length > 0 && (
                    <div className={styles.areas}>
                      {areas.map((area) => (
                        <span key={area}>{area}</span>
                      ))}
                    </div>
                  )}

                  <a
                    href={`/contratante/freelancer/${freelancer.usu_id}`}
                    className={styles.botao}
                  >
                    <UserRound size={16} />
                    Ver perfil
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
