import { useCallback, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import Carregando from '../carregando/carregando'
import ProfileCard from './profilecard'
import ProjectListItem, { type ItemProjeto } from './projectlistitem'
import Ilustracao from '../ilustracao/ilustracao'
import styles from './projectlistsection.module.css'

export interface Aba {
  rotulo: string
  filtro: (p: ItemProjeto) => boolean
  conteudo?: ReactNode
}

interface ProjectListSectionProps {
  papel: 'freelancer' | 'contratante'
  titulo: string
  buscaPlaceholder: string
  abas: Aba[]
  projetos: ItemProjeto[]
  linkBase: string
  acao?: ReactNode
  vazio: { titulo: string; texto: string; acao?: ReactNode }
  /* Enquanto os projetos chegam, mostra cartões de esqueleto no lugar da lista */
  carregando?: boolean
  /* Projetos salvos (freelancer) */
  salvos?: Set<string> | null
  onSalvar?: (id: string | number) => void
}

/* Filtros da lista (todos opcionais; vazio = não filtra) */
interface Filtros {
  modalidade: '' | 'Remoto' | 'Híbrido' | 'Presencial'
  tipo: '' | 'fixo' | 'hora'
  minimo: string
  maximo: string
  prazo: string
  ordem: 'recentes' | 'maior' | 'menor' | 'prazo'
}

const SEM_FILTROS: Filtros = { modalidade: '', tipo: '', minimo: '', maximo: '', prazo: '', ordem: 'recentes' }

const ORDENAR: Record<Filtros['ordem'], (a: ItemProjeto, b: ItemProjeto) => number> = {
  recentes: (a, b) => new Date(b.postadoEm).getTime() - new Date(a.postadoEm).getTime(),
  maior: (a, b) => (b.valor ?? 0) - (a.valor ?? 0),
  menor: (a, b) => (a.valor ?? 0) - (b.valor ?? 0),
  /* Sem prazo vai para o fim */
  prazo: (a, b) => (a.prazoDias ?? Infinity) - (b.prazoDias ?? Infinity),
}

function passaNosFiltros(p: ItemProjeto, f: Filtros) {
  if (f.modalidade && !p.local.startsWith(f.modalidade)) return false
  if (f.tipo && p.tipoValor !== f.tipo) return false
  if (f.minimo && (p.valor ?? 0) < Number(f.minimo)) return false
  if (f.maximo && (p.valor ?? 0) > Number(f.maximo)) return false
  if (f.prazo && (p.prazoDias == null || p.prazoDias > Number(f.prazo))) return false
  return true
}

/* Lista em páginas: mostra 12 e vai trazendo mais conforme a pessoa rola */
const POR_PAGINA = 12

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function ProjectListSection({
  papel,
  titulo,
  buscaPlaceholder,
  abas,
  projetos,
  linkBase,
  acao,
  vazio,
  carregando = false,
  salvos,
  onSalvar,
}: ProjectListSectionProps) {
  const [abaAtiva, setAbaAtiva] = useState(abas[0].rotulo)
  const [params, setParams] = useSearchParams()
  const busca = params.get('busca') ?? ''
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS)
  const [verFiltros, setVerFiltros] = useState(false)
  const mudarFiltro = <K extends keyof Filtros>(campo: K, valor: Filtros[K]) => setFiltros((f) => ({ ...f, [campo]: valor }))
  /* Quantos filtros estão mexendo na lista (a ordem não conta) */
  const ativos = (['modalidade', 'tipo', 'minimo', 'maximo', 'prazo'] as const).filter((c) => filtros[c]).length

  const mudarBusca = (valor: string) =>
    setParams(valor ? { busca: valor } : {}, { replace: true })

  const aba = abas.find((a) => a.rotulo === abaAtiva) ?? abas[0]
  const termo = normalizar(busca.trim())

  const filtrados = projetos
    .filter(aba.filtro)
    .filter(
      (p) =>
        !termo ||
        normalizar(`${p.titulo} ${p.descricao} ${p.categoria}`).includes(termo)
    )
    .filter((p) => passaNosFiltros(p, filtros))
    .sort(ORDENAR[filtros.ordem])

  /* Quantos aparecem: volta para 12 quando muda a aba, a busca ou os filtros */
  const chaveLista = `${abaAtiva}|${termo}|${JSON.stringify(filtros)}`
  const [pagina, setPagina] = useState({ chave: chaveLista, quantos: POR_PAGINA })
  const quantos = pagina.chave === chaveLista ? pagina.quantos : POR_PAGINA
  const verMais = useCallback(() => setPagina({ chave: chaveLista, quantos: quantos + POR_PAGINA }), [chaveLista, quantos])
  const visiveis = filtrados.slice(0, quantos)
  const restantes = filtrados.length - visiveis.length

  /* Rolagem infinita: quando o fim da lista aparece na tela, carrega mais (o botão continua lá para quem usa teclado) */
  const sentinela = useCallback(
    (no: HTMLElement | null) => {
      if (!no || typeof IntersectionObserver === 'undefined') return
      const obs = new IntersectionObserver((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) verMais()
      }, { rootMargin: '200px' })
      obs.observe(no)
      return () => obs.disconnect()
    },
    [verMais]
  )

  return (
    <section className={styles.secao}>
      <div className={styles.topo}>
        <div className={styles.busca}>
          <Search size={17} strokeWidth={2.2} />
          <input
            type="search"
            placeholder={buscaPlaceholder}
            value={busca}
            onChange={(e) => mudarBusca(e.target.value)}
            aria-label={buscaPlaceholder}
          />
          {busca && (
            <button type="button" className={styles.limpar} onClick={() => mudarBusca('')} aria-label="Limpar busca">
              <X size={16} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <ProfileCard papel={papel} />
      </div>

     <div className={styles.cabecalho}>
  <h2 className={`${styles.titulo} titulo-magico esquerda placa`}>{titulo}</h2>

  {acao && (
    <div className={styles.acao}>
      {acao}
    </div>
  )}
</div>

      {abas.length > 1 && (
        <div className={styles.tabs} role="tablist">
          {abas.map((a) => {
            const total = projetos.filter(a.filtro).length

            return (
              <button
                key={a.rotulo}
                type="button"
                role="tab"
                aria-selected={a.rotulo === abaAtiva}
                className={a.rotulo === abaAtiva ? styles.ativa : ''}
                onClick={() => setAbaAtiva(a.rotulo)}
              >
                {a.rotulo}
                {!a.conteudo && <span className={styles.contagem}>{total}</span>}
              </button>
            )
          })}
        </div>
      )}

            {!aba.conteudo && (
        <div className={styles.filtrosBarra}>
          <button
            type="button"
            className={`${styles.botaoFiltros} ${ativos ? styles.botaoFiltrosAtivo : ''}`}
            onClick={() => setVerFiltros((v) => !v)}
            aria-expanded={verFiltros}
            aria-controls="filtros-projetos"
          >
            <SlidersHorizontal size={16} strokeWidth={2.4} /> Filtros{ativos ? ` (${ativos})` : ''}
          </button>
          <label className={styles.ordem}>
            Ordenar por
            <select value={filtros.ordem} onChange={(e) => mudarFiltro('ordem', e.target.value as Filtros['ordem'])}>
              <option value="recentes">Mais recentes</option>
              <option value="maior">Maior valor</option>
              <option value="menor">Menor valor</option>
              <option value="prazo">Menor prazo</option>
            </select>
          </label>
        </div>
      )}

      {!aba.conteudo && verFiltros && (
        <div id="filtros-projetos" className={`${styles.filtros} entrada`}>
          <label>
            Modalidade
            <select value={filtros.modalidade} onChange={(e) => mudarFiltro('modalidade', e.target.value as Filtros['modalidade'])}>
              <option value="">Todas</option>
              <option value="Remoto">Remoto</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Presencial">Presencial</option>
            </select>
          </label>
          <label>
            Cobrança
            <select value={filtros.tipo} onChange={(e) => mudarFiltro('tipo', e.target.value as Filtros['tipo'])}>
              <option value="">Fixo ou por hora</option>
              <option value="fixo">Valor fixo</option>
              <option value="hora">Por hora</option>
            </select>
          </label>
          <label>
            Valor mínimo (R$)
            <input type="number" min={0} inputMode="decimal" placeholder="0" value={filtros.minimo} onChange={(e) => mudarFiltro('minimo', e.target.value)} />
          </label>
          <label>
            Valor máximo (R$)
            <input type="number" min={0} inputMode="decimal" placeholder="Sem limite" value={filtros.maximo} onChange={(e) => mudarFiltro('maximo', e.target.value)} />
          </label>
          <label>
            Prazo de até (dias)
            <input type="number" min={1} inputMode="numeric" placeholder="Qualquer" value={filtros.prazo} onChange={(e) => mudarFiltro('prazo', e.target.value)} />
          </label>
          {ativos > 0 && (
            <button type="button" className={styles.limparFiltros} onClick={() => setFiltros((f) => ({ ...SEM_FILTROS, ordem: f.ordem }))}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

{aba.conteudo ? (
  <div key={abaAtiva} className={styles.lista}>
    {aba.conteudo}
  </div>
) : carregando ? (
  <Carregando variante="projetos" quantidade={3} />
) : filtrados.length > 0 ? (
  <div key={`${abaAtiva}|${termo}`} className={`${styles.lista} cascata`}>
    {visiveis.map((p) => (
      <ProjectListItem
        key={p.id}
        projeto={p}
        linkBase={linkBase}
        mostrarStatus={papel === 'contratante'}
        salvo={salvos?.has(String(p.id))}
        onSalvar={salvos && onSalvar ? () => onSalvar(p.id) : undefined}
      />
    ))}
    {restantes > 0 && (
      <div ref={sentinela} className={styles.maisProjetos}>
        <button type="button" className={styles.vazioBtn} onClick={verMais}>
          Mostrar mais {Math.min(POR_PAGINA, restantes)} de {restantes} {restantes === 1 ? 'projeto' : 'projetos'}
        </button>
      </div>
    )}
  </div>
) : (
  <div className={`${styles.vazio} entrada`}>
    {termo || ativos ? (
      <>
        <SearchX size={34} strokeWidth={1.7} />
        <strong>{termo ? `Nada encontrado para "${busca}"` : 'Nenhum projeto com esses filtros'}</strong>
        <p>{termo ? 'Tente outras palavras ou limpe a busca.' : 'Afrouxe um pouco os filtros para ver mais projetos.'}</p>
        <button
          type="button"
          className={styles.vazioBtn}
          onClick={() => {
            mudarBusca('')
            setFiltros((f) => ({ ...SEM_FILTROS, ordem: f.ordem }))
          }}
        >
          Limpar busca e filtros
        </button>
      </>
    ) : (
      <>
        <Ilustracao tipo="morcego" />
        <strong>{vazio.titulo}</strong>
        <p>{vazio.texto}</p>
        {vazio.acao}
      </>
    )}
  </div>
)}

    </section>
  )
}
