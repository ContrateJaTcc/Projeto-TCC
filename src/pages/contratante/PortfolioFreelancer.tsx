import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'
import Avatar from '../../components/avatar/avatar'
import QuadroPortfolio from '../../components/portfolio/quadroportfolio'
import QuadroInsignias from '../../components/gamificacao/insignias'
import ListaAvaliacoes from '../../components/gamificacao/listaavaliacoes'
import Estrelas from '../../components/gamificacao/estrelas'
import InsigniaBadge from '../../components/gamificacao/InsigniaBadge'
import type { PerfilFreelancer } from '../../components/gamificacao/tipos'
import secoes from '../../components/gamificacao/gamificacao.module.css'
import type { ItemPortfolio } from '../../components/portfolio/quadroportfolio'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import Convidar from '../../components/convites/convidar'
import BarraXp from '../../components/gamificacao/barraxp'
import styles from './PortfolioFreelancer.module.css'
import Denunciar from '../../components/denuncia/denunciar'
import { SeloVerificado, TempoResposta } from '../../components/confianca/selos'
import { estaOnline, textoVisto } from '../../utils/presenca'
import { NomeColorido, SeloDisponibilidade } from '../../components/aparencia/aparencia'
import type { Disponibilidade, GuildaResumo } from '../../utils/aparencia'
import { SeloGuilda, SelosTeste } from '../../components/reino/selos'
import BotaoFavorito from '../../components/reino/botaofavorito'
import Mascote from '../../components/reino/mascote'
import { useFavoritos } from '../../utils/favoritos'
import { useToast } from '../../context/useToast'
import NotasPorCriterio, { type MediasCriterio } from '../../components/perfil/criterios'
import { AnotacaoPrivada, AtalhosContratante, AvisarQuandoLivre, PedirAmostra } from '../../components/perfil/acoescontratante'
import ArvoreArea from '../../components/reino/arvore'
import { useArvore } from '../../utils/arvore'
import { textoHorarios, type Horarios } from '../../utils/horarios'

/* Perfil público */
interface PerfilPublico {
  usu_id: number
  usu_nome: string
  usu_desc: string | null
  usu_cid: string | null
  usu_est: string | null
  usu_foto: string | null
  free_nivel: number
  free_xp?: number
  free_rank: string | number
  verificado?: boolean
  tempo_resposta?: number | null
  visto_em?: string | null
  moldura?: string | null
  cor_nome?: string | null
  disponibilidade?: Disponibilidade
  guilda?: GuildaResumo | null
  testes?: string[]
  mascote?: { especie: string; nome: string } | null
  /* Notas por critério e horários de atendimento */
  criterios?: MediasCriterio | null
  horarios?: Horarios | null
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
  const toast = useToast()
  const favoritos = useFavoritos(true, (m) => toast.mostrar(m, 'erro'))
  const arvore = useArvore(Number(usuId))

  
  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro('')

      try {
        const dados = await api<{
          perfil: PerfilPublico
          areas: Area[]
          itens: ItemPortfolio[]
        }>(`/portfolio/freelancer/${usuId}`)

        if (!ativo) return

        setPerfil(dados.perfil)
        setAreas(dados.areas)
        setItens(dados.itens)

        // Gamificação
        try {
          const dadosGamificacao = await api<PerfilFreelancer>(
            `/perfil/freelancer/${usuId}`
          )

          if (ativo) setGamificacao(dadosGamificacao)
        } catch (e) {
          console.error('Erro ao carregar gamificação do freelancer:', e)
          if (ativo) setGamificacao(null)
        }
      } catch (e) {
        if (!ativo) return

        setErro(
          e instanceof ErroApi
            ? e.message
            : 'Não foi possível conectar ao servidor.'
        )
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [usuId])

  if (carregando) {
    return <Carregando variante="perfil" />
  }

  if (erro || !perfil) {
    return (
      <div className={styles.pagina}>
        <Link to="/contratante/freelancers" className={styles.voltar} viewTransition>
          <ArrowLeft size={15} strokeWidth={2.2} />
          Voltar para freelancers
        </Link>
        <p className="msg-erro">{erro || 'Freelancer não encontrado.'}</p>
      </div>
    )
  }

  const local = [perfil.usu_cid, perfil.usu_est].filter(Boolean).join(' - ')

  return (
    <div className={styles.pagina}>
      <Link to="/contratante/freelancers" className={styles.voltar} viewTransition>
        <ArrowLeft size={15} strokeWidth={2.2} />
        Voltar para freelancers
      </Link>

      <header className={styles.cabecalho}>
        <Avatar nome={perfil.usu_nome} size={72} foto={perfil.usu_foto} nivel={perfil.free_nivel} especial={perfil.moldura} />

        <div className={styles.dados}>
          <h1><NomeColorido nome={perfil.usu_nome} cor={perfil.cor_nome} /> {perfil.verificado && <SeloVerificado grande />}</h1>
          <div className={styles.selos}>
            {perfil.disponibilidade && <SeloDisponibilidade disponibilidade={perfil.disponibilidade} />}
            <SeloGuilda guilda={perfil.guilda} />
            <SelosTeste testes={perfil.testes} />
          </div>
          {local && (
            <span className={styles.local}>
              <MapPin size={14} strokeWidth={2.2} />
              {local}
            </span>
          )}
          <TempoResposta minutos={perfil.tempo_resposta} className={styles.tempoResposta} />
          {textoVisto(perfil.visto_em) && (
            <span className={`${styles.tempoResposta} ${estaOnline(perfil.visto_em) ? styles.online : ''}`}>{textoVisto(perfil.visto_em)}</span>
          )}
          {textoHorarios(perfil.horarios) && (
            <span className={styles.horarios}><Clock size={14} strokeWidth={2.2} aria-hidden="true" /> Atende {textoHorarios(perfil.horarios)}</span>
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
          {gamificacao?.free_id && <InsigniaBadge freeId={gamificacao.free_id} />}
          {favoritos.ids && (
            <BotaoFavorito nome={perfil.usu_nome} ativo={favoritos.ids.has(perfil.usu_id)} aoAlternar={() => favoritos.alternar(perfil.usu_id)} comTexto />
          )}
          {perfil.mascote && (
            <span className={styles.mascote}>
              <Mascote especie={perfil.mascote.especie} nivel={perfil.free_nivel} cor={perfil.cor_nome} tamanho={56} nome={perfil.mascote.nome} />
              <small>{perfil.mascote.nome}</small>
            </span>
          )}
          <BarraXp xp={Number(gamificacao?.resumo.xp ?? perfil.free_xp ?? 0)} />
          {gamificacao && gamificacao.resumo.totalAvaliacoes > 0 && (
            <span className={styles.notaMedia}>
              <Estrelas nota={gamificacao.resumo.media} tamanho={14} />
              {gamificacao.resumo.media.toLocaleString('pt-BR')} ({gamificacao.resumo.totalAvaliacoes})
            </span>
          )}
          <NotasPorCriterio medias={perfil.criterios} />
          {gamificacao && (
            <span className={styles.concluidos}>
              {gamificacao.resumo.concluidos}{' '}
              {gamificacao.resumo.concluidos === 1 ? 'projeto concluído' : 'projetos concluídos'}
            </span>
          )}
          <Denunciar alvoTipo="usuario" alvoId={perfil.usu_id} rotulo="Denunciar perfil" />
        </div>
      </header>

      <Convidar usuId={perfil.usu_id} nome={perfil.usu_nome} />

      <div className={styles.acoesExtras}>
        <AvisarQuandoLivre usuId={perfil.usu_id} nome={perfil.usu_nome} ocupado={Boolean(perfil.disponibilidade && perfil.disponibilidade.status !== 'disponivel')} />
        <AtalhosContratante usuId={perfil.usu_id} nome={perfil.usu_nome} />
      </div>

      <div className={styles.gradeExtras}>
        <AnotacaoPrivada usuId={perfil.usu_id} />
        <PedirAmostra usuId={perfil.usu_id} nome={perfil.usu_nome} />
      </div>

      {arvore && arvore.length > 0 && (
        <>
          <h2 className={`${styles.secao} placa`}>Árvore de habilidades</h2>
          <div className={styles.arvores}>
            {arvore.map((a) => <ArvoreArea key={a.tipo_id} area={a} compacta />)}
          </div>
        </>
      )}

      {gamificacao && (
        <>
          <h2 className={`${styles.secao} placa`}>Insígnias</h2>
          <QuadroInsignias insignias={gamificacao.insignias} somenteConquistadas />

          <h2 className={`${styles.secao} placa`}>Avaliações de contratantes</h2>
          <div className={secoes.secao}>
            <ListaAvaliacoes
              avaliacoes={gamificacao.avaliacoes}
              vazio="Este freelancer ainda não recebeu avaliações."
            />
          </div>
        </>
      )}

      <h2 className={`${styles.secao} placa`}>Portfólio</h2>

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
