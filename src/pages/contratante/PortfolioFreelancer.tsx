import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import Avatar from '../../components/avatar/avatar'
import QuadroPortfolio from '../../components/portfolio/quadroportfolio'
import QuadroInsignias from '../../components/gamificacao/insignias'
import ListaAvaliacoes from '../../components/gamificacao/listaavaliacoes'
import Estrelas from '../../components/gamificacao/estrelas'
import type { PerfilFreelancer } from '../../components/gamificacao/tipos'
import secoes from '../../components/gamificacao/gamificacao.module.css'
import type { ItemPortfolio } from '../../components/portfolio/quadroportfolio'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import styles from './PortfolioFreelancer.module.css'

/* Campos publicos do freelancer: nada de e-mail, CPF ou telefone. */
interface PerfilPublico {
  usu_id: number
  usu_nome: string
  usu_desc: string | null
  usu_cid: string | null
  usu_est: string | null
  usu_foto: string | null
  free_nivel: number
  free_rank: string | number
}

interface Area {
  tipo_id: number
  tipo_nome: string
}

export default function PortfolioFreelancer() {
  const { usuId } = useParams()
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [itens, setItens] = useState<ItemPortfolio[]>([])
  const [gamificacao, setGamificacao] = useState<PerfilFreelancer | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [dados, dadosGamificacao] = await Promise.all([
          api<{
            perfil: PerfilPublico
            areas: Area[]
            itens: ItemPortfolio[]
          }>(`/portfolio/freelancer/${usuId}`),
          api<PerfilFreelancer>(`/perfil/freelancer/${usuId}`),
        ])

        setPerfil(dados.perfil)
        setAreas(dados.areas)
        setItens(dados.itens)
        setGamificacao(dadosGamificacao)
      } catch (e) {
        setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [usuId])

  if (carregando) {
    return <Carregando variante="perfil" />
  }

  if (erro || !perfil) {
    return (
      <div className={styles.pagina}>
        <Link to="/contratante/candidatos" className={styles.voltar}>
          <ArrowLeft size={15} strokeWidth={2.2} />
          Voltar para candidatos
        </Link>
        <p className="msg-erro">{erro || 'Freelancer não encontrado.'}</p>
      </div>
    )
  }

  const local = [perfil.usu_cid, perfil.usu_est].filter(Boolean).join(' - ')

  return (
    <div className={styles.pagina}>
      <Link to="/contratante/candidatos" className={styles.voltar}>
        <ArrowLeft size={15} strokeWidth={2.2} />
        Voltar para candidatos
      </Link>

      <header className={styles.cabecalho}>
        <Avatar nome={perfil.usu_nome} size={72} foto={perfil.usu_foto} />

        <div className={styles.dados}>
          <h1>{perfil.usu_nome}</h1>
          {local && (
            <span className={styles.local}>
              <MapPin size={14} strokeWidth={2.2} />
              {local}
            </span>
          )}
          <p className={styles.bio}>
            {perfil.usu_desc || 'Este freelancer ainda não escreveu uma descrição.'}
          </p>

          {areas.length > 0 && (
            <div className={styles.areas}>
              {areas.map((a) => (
                <span key={a.tipo_id} className={styles.area}>{a.tipo_nome}</span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.lateral}>
          <span className={styles.nivel}>Nível {gamificacao?.resumo.nivel ?? perfil.free_nivel}</span>
          {gamificacao && gamificacao.resumo.totalAvaliacoes > 0 && (
            <span className={styles.notaMedia}>
              <Estrelas nota={gamificacao.resumo.media} tamanho={14} />
              {gamificacao.resumo.media.toLocaleString('pt-BR')} ({gamificacao.resumo.totalAvaliacoes})
            </span>
          )}
          {gamificacao && (
            <span className={styles.concluidos}>
              {gamificacao.resumo.concluidos}{' '}
              {gamificacao.resumo.concluidos === 1 ? 'projeto concluído' : 'projetos concluídos'}
            </span>
          )}
        </div>
      </header>

      {gamificacao && (
        <>
          <h2 className={styles.secao}>Insígnias</h2>
          <QuadroInsignias insignias={gamificacao.insignias} somenteConquistadas />

          <h2 className={styles.secao}>Avaliações de contratantes</h2>
          <div className={secoes.secao}>
            <ListaAvaliacoes
              avaliacoes={gamificacao.avaliacoes}
              vazio="Este freelancer ainda não recebeu avaliações."
            />
          </div>
        </>
      )}

      <h2 className={styles.secao}>Portfólio</h2>

      {itens.length === 0 ? (
        <div className={styles.vazio}>
          <strong>Nenhum trabalho publicado</strong>
          <p>Este freelancer ainda não adicionou trabalhos ao portfólio.</p>
        </div>
      ) : (
        <QuadroPortfolio itens={itens} />
      )}
    </div>
  )
}
