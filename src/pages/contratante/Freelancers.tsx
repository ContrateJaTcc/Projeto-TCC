
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, Search, UserRound, SlidersHorizontal, X, Map as IconeMapa, List, GitCompareArrows } from 'lucide-react'
import { useCidades } from '../../utils/cidades'
import type { PontoMapa } from '../../components/mapa/mapa'
import Avatar from '../../components/avatar/avatar'
import { MiniInsignias } from '../../components/gamificacao/insignias'
import BarraXp from '../../components/gamificacao/barraxp'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { api } from '../../services/api'
import styles from './Freelancers.module.css'
import RankingFreelancers from '../../components/gamificacao/ranking'
import { SeloVerificado } from '../../components/confianca/selos'
import { NomeColorido, SeloDisponibilidade } from '../../components/aparencia/aparencia'
import { SeloGuilda, SelosTeste } from '../../components/reino/selos'
import BotaoFavorito from '../../components/reino/botaofavorito'
import { lerComparacao, MAX_COMPARAR, salvarComparacao } from '../../utils/comparacao'
import { useFavoritos } from '../../utils/favoritos'
import { useToast } from '../../context/useToast'
import type { Disponibilidade, GuildaResumo } from '../../utils/aparencia'

interface Freelancer {
  usu_id: number
  usu_nome: string
  usu_desc: string | null
  usu_cid: string | null
  usu_est: string | null
  usu_foto: string | null
  areas_atuacao?: string | null
  free_nivel?: number
  free_xp?: number
  insignias?: string | null
  verificado?: boolean
  moldura?: string | null
  cor_nome?: string | null
  disponibilidade?: Disponibilidade
  guilda?: GuildaResumo | null
  testes?: string[]
}

const Mapa = lazy(() => import('../../components/mapa/mapa'))

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export default function Freelancers() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  /* A home manda a área (?area=) ou o que a pessoa digitou na busca (?busca=) */
  const [params] = useSearchParams()
  const [areaSelecionada, setAreaSelecionada] = useState(() => params.get('area') ?? '')
  const [busca, setBusca] = useState(() => params.get('busca') ?? '')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [perfilPreenchido, setPerfilPreenchido] = useState(false)
  const [soDisponiveis, setSoDisponiveis] = useState(false)
  const [soFavoritos, setSoFavoritos] = useState(() => params.get('favoritos') === '1')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const toast = useToast()
  const favoritos = useFavoritos(true, (m) => toast.mostrar(m, 'erro'))
  const [visao, setVisao] = useState<'lista' | 'mapa'>(() => (params.get('visao') === 'mapa' ? 'mapa' : 'lista'))
  /* Comparar: até 3 marcados, guardados enquanto navega */
  const [comparar, setComparar] = useState<number[]>(lerComparacao)
  const alternarComparar = (id: number) =>
    setComparar((atual) => {
      const novo = atual.includes(id) ? atual.filter((x) => x !== id) : atual.length >= MAX_COMPARAR ? atual : [...atual, id]
      if (!atual.includes(id) && atual.length >= MAX_COMPARAR) toast.mostrar(`Dá para comparar até ${MAX_COMPARAR} freelancers.`, 'info')
      salvarComparacao(novo)
      return novo
    })

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
    const termo = normalizar(busca)

    return freelancers.filter((freelancer) => {
      const areas = (freelancer.areas_atuacao ?? '')
        .split(',')
        .map(normalizar)
        .filter(Boolean)

      const correspondePerfil =
        !perfilPreenchido || Boolean(freelancer.usu_desc?.trim())

      const correspondeDisponivel =
        !soDisponiveis || (freelancer.disponibilidade?.status ?? 'disponivel') === 'disponivel'

      const correspondeFavorito = !soFavoritos || Boolean(favoritos.ids?.has(freelancer.usu_id))

      const correspondeArea =
        !areaBusca || areas.some((area) => area === areaBusca)

      const correspondeCidade =
        !cidadeBusca ||
        normalizar(freelancer.usu_cid ?? '').includes(cidadeBusca)

      const correspondeEstado =
        !estadoBusca ||
        (freelancer.usu_est ?? '').trim().toUpperCase() === estadoBusca

      const correspondeBusca =
        !termo ||
        normalizar(`${freelancer.usu_nome} ${freelancer.usu_desc ?? ''} ${freelancer.areas_atuacao ?? ''}`).includes(termo)

      return (
        correspondeBusca &&
        correspondeArea &&
        correspondeCidade &&
        correspondeEstado &&
        correspondePerfil &&
        correspondeDisponivel &&
        correspondeFavorito
      )
    })
  }, [
    freelancers,
    busca,
    areaSelecionada,
    cidade,
    estado,
    perfilPreenchido,
    soDisponiveis,
    soFavoritos,
    favoritos.ids,
  ])

  /* Mapa: um marcador por cidade com quantos freelancers (dos filtrados) moram lá */
  const { achar } = useCidades()
  const pontos: PontoMapa[] = useMemo(() => {
    if (visao !== 'mapa' || !achar) return []
    const porCidade = new Map<string, PontoMapa>()
    for (const f of filtrados) {
      const ponto = achar(f.usu_cid, f.usu_est)
      if (!ponto) continue
      const chave = `${(f.usu_est ?? '').toUpperCase()}:${f.usu_cid}`
      const atual = porCidade.get(chave)
      if (atual) atual.quantidade += 1
      else porCidade.set(chave, { chave, ponto, quantidade: 1, rotulo: `${f.usu_cid}/${(f.usu_est ?? '').toUpperCase()}` })
    }
    for (const p of porCidade.values()) p.rotulo = `${p.rotulo}: ${p.quantidade} ${p.quantidade === 1 ? 'freelancer' : 'freelancers'}`
    return [...porCidade.values()]
  }, [visao, achar, filtrados])
  const cidadeEscolhida = cidade && estado ? `${estado}:${cidade}` : null

  /* Tocar numa cidade do mapa filtra a lista por ela (tocar de novo tira o filtro) */
  function escolherCidade(chave: string | null) {
    if (!chave) {
      setCidade('')
      setEstado('')
      return
    }
    const [uf, nome] = [chave.slice(0, chave.indexOf(':')), chave.slice(chave.indexOf(':') + 1)]
    setCidade(nome)
    setEstado(uf)
  }

 function limparFiltros() {
  setBusca('')
  setAreaSelecionada('')
  setCidade('')
  setEstado('')
  setPerfilPreenchido(false)
  setSoDisponiveis(false)
  setSoFavoritos(false)
}

 const existemFiltros = Boolean(
  busca || areaSelecionada || cidade || estado || perfilPreenchido || soDisponiveis || soFavoritos
)

  return (
    <main className={styles.pagina}>
      <header className={`${styles.cabecalho} placa`}>
        <div>
          <h1>Encontre freelancers</h1>
          <p>Encontre profissionais usando os filtros do seu projeto.</p>
        </div>
      </header>

      {/* Destaques: quem mais ganhou XP, com link para o portfólio */}
      <div className={styles.destaques}>
        <RankingFreelancers linkPerfil titulo="Destaques" />
      </div>

      <section className={styles.painelFiltros} aria-label="Filtros de freelancers">
    
        <div className={styles.tituloFiltros}>
          <SlidersHorizontal size={17} />
          <h2>Filtrar profissionais</h2>
        </div>

        <div className={styles.filtros}>
          <label className={styles.campo}>
            <span>Nome ou habilidade</span>
            <input
              type="search"
              placeholder="Ex.: logo, React, revisão"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>

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
          <label className={styles.campo}>
  <span>Perfil profissional</span>
  <select
    value={perfilPreenchido ? 'preenchido' : ''}
    onChange={(e) =>
      setPerfilPreenchido(e.target.value === 'preenchido')
    }
  >
    <option value="">Todos os perfis</option>
    <option value="preenchido">Com descrição profissional</option>
  </select>
</label>
          <label className={styles.campo}>
            <span>Disponibilidade</span>
            <select value={soDisponiveis ? 'sim' : ''} onChange={(e) => setSoDisponiveis(e.target.value === 'sim')}>
              <option value="">Todos</option>
              <option value="sim">Só quem está disponível</option>
            </select>
          </label>
          {favoritos.ids && (
            <label className={styles.campo}>
              <span>Favoritos</span>
              <select value={soFavoritos ? 'sim' : ''} onChange={(e) => setSoFavoritos(e.target.value === 'sim')}>
                <option value="">Todos</option>
                <option value="sim">Só os meus favoritos ({favoritos.ids.size})</option>
              </select>
            </label>
          )}
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
          <div className={styles.visoes} role="group" aria-label="Ver como">
            <button type="button" aria-pressed={visao === 'lista'} className={visao === 'lista' ? styles.visaoAtiva : ''} onClick={() => setVisao('lista')}>
              <List size={15} strokeWidth={2.4} /> Lista
            </button>
            <button type="button" aria-pressed={visao === 'mapa'} className={visao === 'mapa' ? styles.visaoAtiva : ''} onClick={() => setVisao('mapa')}>
              <IconeMapa size={15} strokeWidth={2.4} /> Mapa
            </button>
          </div>
        </div>
      </section>

      {visao === 'mapa' && !carregando && (
        <div className={styles.mapa}>
          <Suspense fallback={<div className={styles.esperaMapa}>Abrindo o mapa…</div>}>
            <Mapa
              pontos={pontos}
              selecionado={cidadeEscolhida}
              aoEscolher={escolherCidade}
              altura={380}
              descricao={`Mapa com ${filtrados.length} freelancers em ${pontos.length} ${pontos.length === 1 ? 'cidade' : 'cidades'}`}
            />
          </Suspense>
          <p className={styles.notaMapa}>Toque numa cidade para ver só quem mora lá. O mapa mostra só a cidade de cada pessoa.</p>
        </div>
      )}

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} />
      ) : filtrados.length === 0 ? (
        <div className={styles.vazio}>
          <Search size={30} />
          <h2>Nenhum profissional encontrado</h2>
          <p>
            {soFavoritos && favoritos.ids?.size === 0
              ? 'Você ainda não guardou nenhum freelancer. Toque no coração de um cartão para guardar.'
              : existemFiltros
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
                  nivel={freelancer.free_nivel}
                  especial={freelancer.moldura}
                />

                <div className={styles.informacoes}>
                  <div className={styles.nomeLinha}>
                    <h2><NomeColorido nome={freelancer.usu_nome} cor={freelancer.cor_nome} /></h2>
                    {freelancer.verificado && <SeloVerificado />}
                    {favoritos.ids && (
                      <span className={styles.favorito}>
                        <BotaoFavorito nome={freelancer.usu_nome} ativo={favoritos.ids.has(freelancer.usu_id)} aoAlternar={() => favoritos.alternar(freelancer.usu_id)} />
                      </span>
                    )}
                  </div>
                  <div className={styles.selos}>
                    {freelancer.disponibilidade && <SeloDisponibilidade disponibilidade={freelancer.disponibilidade} />}
                    <SeloGuilda guilda={freelancer.guilda} />
                    <SelosTeste testes={freelancer.testes} />
                  </div>

                  <BarraXp xp={Number(freelancer.free_xp ?? 0)} />

                  <MiniInsignias codigos={(freelancer.insignias ?? '').split(',').filter(Boolean)} />

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

                  <div className={styles.acoesCard}>
                    <Link
                      to={`/contratante/freelancer/${freelancer.usu_id}`}
                      className={styles.botao}
                      viewTransition
                    >
                      <UserRound size={16} />
                      Ver perfil e convidar
                    </Link>
                    <label className={styles.comparar}>
                      <input
                        type="checkbox"
                        checked={comparar.includes(freelancer.usu_id)}
                        onChange={() => alternarComparar(freelancer.usu_id)}
                        aria-label={`Comparar ${freelancer.usu_nome}`}
                      />
                      Comparar
                    </label>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {comparar.length > 0 && (
        <div className={styles.barraComparar} role="region" aria-label="Comparação">
          <span>
            <GitCompareArrows size={18} strokeWidth={2.2} aria-hidden="true" />
            {comparar.length === 1 ? '1 marcado: escolha mais um para comparar' : `${comparar.length} marcados`}
          </span>
          <button type="button" className={styles.limparComparar} onClick={() => { setComparar([]); salvarComparacao([]) }}>Limpar</button>
          <Link to="/contratante/orcamentos" className={styles.limparComparar} viewTransition>Pedir orçamento a eles</Link>
          <Link
            to={`/contratante/comparar?ids=${comparar.join(',')}`}
            className={`${styles.botao} ${comparar.length < 2 ? styles.desligado : ''}`}
            aria-disabled={comparar.length < 2}
            onClick={(e) => comparar.length < 2 && e.preventDefault()}
            viewTransition
          >
            Comparar lado a lado
          </Link>
        </div>
      )}
    </main>
  )
}
