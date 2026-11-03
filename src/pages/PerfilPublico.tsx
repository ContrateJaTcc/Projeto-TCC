import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, CalendarDays, MapPin, Share2 } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import PaginaPublica from '../components/layout/topopublico'
import Avatar from '../components/avatar/avatar'
import BarraXp from '../components/gamificacao/barraxp'
import Estrelas from '../components/gamificacao/estrelas'
import QuadroInsignias from '../components/gamificacao/insignias'
import ListaAvaliacoes from '../components/gamificacao/listaavaliacoes'
import QuadroPortfolio from '../components/portfolio/quadroportfolio'
import Carregando from '../components/carregando/carregando'
import Ilustracao from '../components/ilustracao/ilustracao'
import secoes from '../components/gamificacao/gamificacao.module.css'
import type { ResumoFreelancer } from '../components/gamificacao/tipos'
import { compartilharPerfil } from '../utils/perfilpublico'
import { SeloVerificado, TempoResposta } from '../components/confianca/selos'
import { NomeColorido, SeloDisponibilidade } from '../components/aparencia/aparencia'
import type { Disponibilidade, GuildaResumo } from '../utils/aparencia'
import { SeloGuilda, SelosTeste } from '../components/reino/selos'
import Mascote from '../components/reino/mascote'
import QuartoCastelo from '../components/reino/quarto'
import NotasPorCriterio, { type MediasCriterio } from '../components/perfil/criterios'
import styles from './PerfilPublico.module.css'

interface Publico {
  perfil: {
    usu_id: number
    usu_nome: string
    usu_desc: string | null
    usu_cid: string | null
    usu_est: string | null
    usu_foto: string | null
    data_criacao: string
  }
  resumo: ResumoFreelancer
  verificado?: boolean
  tempo_resposta?: number | null
  moldura?: string | null
  cor_nome?: string | null
  disponibilidade?: Disponibilidade
  guilda?: GuildaResumo | null
  testes?: string[]
  mascote?: { especie: string; nome: string } | null
  areas: string[]
  portfolio: { port_id: number; port_titulo: string; port_desc: string; port_link: string | null; port_img: string | null; port_serv_id?: number | null }[]
  criterios?: MediasCriterio | null
  insignias: { codigo: string; nome: string; descricao: string }[]
  avaliacoes: { aval_id: number; aval_nota: number; aval_comentario: string | null; aval_data: string; serv_titulo: string; avaliador_nome: string }[]
}

/* Perfil público do freelancer (/p/12-ana-freelancer): o link que ele divulga, sem precisar de login */
export default function PerfilPublico() {
  const { slug = '' } = useParams()
  const id = Number.parseInt(slug, 10)
  const toast = useToast()
  const [dados, setDados] = useState<Publico | null>(null)
  const [falha, setFalha] = useState('')
  const valido = Number.isInteger(id) && id > 0
  const erro = valido ? falha : 'Perfil não encontrado.'

  useEffect(() => {
    if (!valido) return
    let ativo = true
    api<Publico>(`/publico/freelancer/${id}`, { publico: true })
      .then((d) => {
        if (!ativo) return
        setDados(d)
        document.title = `${d.perfil.usu_nome} · ContrateJá`
      })
      .catch((e) => ativo && setFalha(e instanceof ErroApi ? e.message : 'Não foi possível carregar o perfil.'))
    return () => {
      ativo = false
      document.title = 'ContrateJá'
    }
  }, [id, valido])

  if (erro) {
    return (
      <PaginaPublica>
        <div className={styles.pagina}>
          <div className={styles.vazio}>
            <Ilustracao tipo="morcego" />
            <strong>{erro}</strong>
            <p>O link pode estar errado, ou a conta não está mais ativa.</p>
            <Link to="/" className={styles.btn}>Ir para a página inicial</Link>
          </div>
        </div>
      </PaginaPublica>
    )
  }

  if (!dados) {
    return (
      <PaginaPublica>
        <Carregando variante="perfil" />
      </PaginaPublica>
    )
  }

  const { perfil, resumo } = dados
  const local = [perfil.usu_cid, perfil.usu_est].filter(Boolean).join(' - ')
  const desde = new Date(perfil.data_criacao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function compartilhar() {
    const resultado = await compartilharPerfil(perfil.usu_id, perfil.usu_nome)
    if (resultado === 'copiado') toast.mostrar('Link copiado!')
    else if (resultado === 'erro') toast.mostrar('Não deu para copiar o link.', 'erro')
  }

  return (
    <PaginaPublica>
      <div className={styles.pagina}>
        <header className={`${styles.cabecalho} entrada`}>
          <Avatar nome={perfil.usu_nome} size={96} foto={perfil.usu_foto} nivel={resumo.nivel} especial={dados.moldura} />

          <div className={styles.dados}>
            <span className={styles.selos}>
              <span className={styles.selo}>
                <BadgeCheck size={14} strokeWidth={2.4} />
                Freelancer no Contrate Já
              </span>
              {dados.verificado && <SeloVerificado grande />}
              {dados.disponibilidade && <SeloDisponibilidade disponibilidade={dados.disponibilidade} />}
              <SeloGuilda guilda={dados.guilda} />
              <SelosTeste testes={dados.testes} />
            </span>
            <h1><NomeColorido nome={perfil.usu_nome} cor={dados.cor_nome} /></h1>
            <div className={styles.metas}>
              {local && (
                <span><MapPin size={14} strokeWidth={2.2} />{local}</span>
              )}
              <span><CalendarDays size={14} strokeWidth={2.2} />Desde {desde}</span>
              <TempoResposta minutos={dados.tempo_resposta} />
            </div>
            <p className={styles.bio}>{perfil.usu_desc || 'Este freelancer ainda não escreveu uma descrição.'}</p>
            {dados.areas.length > 0 && (
              <div className={styles.areas}>
                {dados.areas.map((a) => <span key={a}>{a}</span>)}
              </div>
            )}
          </div>

          <aside className={styles.lateral}>
            {dados.mascote && (
              <span className={styles.mascote}>
                <Mascote especie={dados.mascote.especie} nivel={resumo.nivel} cor={dados.cor_nome} tamanho={64} nome={dados.mascote.nome} />
                <small>{dados.mascote.nome}, o mascote</small>
              </span>
            )}
            <BarraXp xp={resumo.xp} />
            <div className={styles.numeros}>
              <div>
                <strong>{resumo.concluidos}</strong>
                <span>{resumo.concluidos === 1 ? 'projeto concluído' : 'projetos concluídos'}</span>
              </div>
              <div>
                <strong>{resumo.totalAvaliacoes > 0 ? resumo.media.toLocaleString('pt-BR') : '—'}</strong>
                <span>
                  {resumo.totalAvaliacoes > 0 ? <Estrelas nota={resumo.media} tamanho={12} /> : 'sem avaliações'}
                </span>
              </div>
            </div>
            <button type="button" className={styles.btnCompartilhar} onClick={compartilhar}>
              <Share2 size={15} strokeWidth={2.2} />
              Compartilhar perfil
            </button>
          </aside>
        </header>

        <div className={styles.chamada}>
          <p>Quer contratar {perfil.usu_nome.split(' ')[0]}? Publique seu projeto e convide pelo Contrate Já.</p>
          <Link to="/cadastro" className={styles.btn}>Criar conta grátis</Link>
        </div>

        <div className={styles.quartoLinha}>
          <QuartoCastelo
            nome={perfil.usu_nome}
            nivel={resumo.nivel}
            insignias={dados.insignias.length}
            testes={dados.testes?.length ?? 0}
            moldura={dados.moldura}
            cor_nome={dados.cor_nome}
            mascote={dados.mascote}
            guilda={dados.guilda}
          />
          {dados.criterios && (
            <section className={styles.criterios} aria-labelledby="titulo-criterios">
              <h2 id="titulo-criterios">Notas por critério</h2>
              <NotasPorCriterio medias={dados.criterios} />
            </section>
          )}
        </div>

        <h2 className={`${styles.secao} placa`}>Insígnias</h2>
        <QuadroInsignias
          insignias={dados.insignias.map((i) => ({ ...i, conquistada: true, data: null, progresso: 1, meta: 1 }))}
          somenteConquistadas
        />

        <h2 className={`${styles.secao} placa`}>Avaliações</h2>
        <div className={secoes.secao}>
          <ListaAvaliacoes
            avaliacoes={dados.avaliacoes.map((a) => ({ ...a, avaliador_foto: null }))}
            vazio="Ainda não recebeu avaliações."
          />
        </div>

        <h2 className={`${styles.secao} placa`}>Portfólio</h2>
        {dados.portfolio.length === 0 ? (
          <div className={styles.vazio}>
            <strong>Nenhum trabalho publicado</strong>
            <p>Os trabalhos do portfólio aparecem aqui.</p>
          </div>
        ) : (
          <QuadroPortfolio itens={dados.portfolio.map((p) => ({ ...p, port_data_criacao: '', port_data_atualizacao: '' }))} />
        )}
      </div>
    </PaginaPublica>
  )
}
