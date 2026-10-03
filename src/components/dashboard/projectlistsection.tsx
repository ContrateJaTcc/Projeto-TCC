import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX, X } from 'lucide-react'
import ProfileCard from './profilecard'
import ProjectListItem, { type ItemProjeto } from './projectlistitem'
import styles from './projectlistsection.module.css'

export interface Aba {
  rotulo: string
  filtro: (p: ItemProjeto) => boolean
}

interface ProjectListSectionProps {
  papel: 'freelancer' | 'contratante'
  titulo: string
  buscaPlaceholder: string
  abas: Aba[]
  projetos: ItemProjeto[]
  linkBase: string
  /* Botão no canto do título (ex.: "Criar projeto"). */
  acao?: ReactNode
  /* Mensagem quando a aba está vazia sem busca nenhuma. */
  vazio: { titulo: string; texto: string; acao?: ReactNode }
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/*
 * Antes as abas só reconheciam "Publicados" e "Rascunhos": a aba
 * "Disponíveis" do freelancer caía num filtro vazio e ele nunca via projeto
 * nenhum. E o campo de busca não estava ligado a nada.
 *
 * Agora cada aba traz o próprio filtro, e a busca filtra na hora. O termo
 * fica na URL (?busca=), então a busca do cabeçalho também cai aqui.
 */
export default function ProjectListSection({
  papel,
  titulo,
  buscaPlaceholder,
  abas,
  projetos,
  linkBase,
  acao,
  vazio,
}: ProjectListSectionProps) {
  const [abaAtiva, setAbaAtiva] = useState(abas[0].rotulo)
  const [params, setParams] = useSearchParams()
  const busca = params.get('busca') ?? ''

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
  <h2 className={styles.titulo}>{titulo}</h2>

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
                <span className={styles.contagem}>{total}</span>
              </button>
            )
          })}
        </div>
      )}

      {filtrados.length > 0 ? (
        /* key muda com aba/busca para a lista tocar a entrada em cascata de novo. */
        <div key={`${abaAtiva}|${termo}`} className={`${styles.lista} cascata`}>
          {filtrados.map((p) => (
            <ProjectListItem key={p.id} projeto={p} linkBase={linkBase} mostrarStatus={papel === 'contratante'} />
          ))}
        </div>
      ) : (
        <div className={`${styles.vazio} entrada`}>
          {termo ? (
            <>
              <SearchX size={34} strokeWidth={1.7} />
              <strong>Nada encontrado para "{busca}"</strong>
              <p>Tente outras palavras ou limpe a busca.</p>
              <button type="button" className={styles.vazioBtn} onClick={() => mudarBusca('')}>
                Limpar busca
              </button>
            </>
          ) : (
            <>
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
