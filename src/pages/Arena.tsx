import { useCallback, useEffect, useState } from 'react'
import { Swords, Trophy, ExternalLink, ThumbsUp, Send } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import { formatarData } from '../utils/formatar'
import comum from './comum.module.css'
import styles from './Arena.module.css'

interface Chefao {
  mes: string
  nome: string
  vida: number
  vida_max: number
  dano: number
  golpes: number
  participantes: number
  participei: boolean
  derrotado: boolean
  resgatado: boolean
  xp: number
  termina: string
}

interface Envio {
  env_id: number
  titulo: string
  link: string
  desc: string | null
  autor: string
  votos: number
  votei: boolean
  meu: boolean
}

interface Desafio {
  disponivel: boolean
  semana: string
  tema: string
  termina: string
  xp: number
  envios: Envio[]
  meu_envio: Envio | null
  anterior: { tema: string; vencedor: string | null }
}

/* Dragão em pixel art (16x12) que vai ficando machucado */
const DRAGAO = [
  '....RR......RR..',
  '...RRRR....RRRR.',
  '..RRRRRRRRRRRRR.',
  '.RRWDRRRRRRRWDRR',
  '.RRRRRRRRRRRRRRR',
  'RRYYRRRRRRRRRYYR',
  'RRRRRRYYYYRRRRRR',
  '.RRRRYYYYYYRRRR.',
  '..RRRRYYYYRRRR..',
  '..RR..RRRR..RR..',
  '.RRR..R..R..RRR.',
  '................',
]

function Dragao({ derrotado }: { derrotado: boolean }) {
  const cor: Record<string, string> = { R: derrotado ? '#6c6f86' : '#c2412d', W: '#fff3d6', D: '#1b1b30', Y: derrotado ? '#8d8fa8' : '#ffc23d' }
  return (
    <svg viewBox="0 0 16 12" shapeRendering="crispEdges" className={`${styles.dragao} ${derrotado ? styles.caido : ''}`} aria-hidden="true">
      {DRAGAO.flatMap((linha, y) => [...linha].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={cor[c]} />)))}
    </svg>
  )
}

/* Arena do castelo: o chefão que todo mundo enfrenta junto no mês e o desafio criativo da semana */
export default function Arena() {
  const { role } = useRole()
  const toast = useToast()
  const [chefao, setChefao] = useState<Chefao | null>(null)
  const [desafio, setDesafio] = useState<Desafio | null | undefined>(null)
  const [titulo, setTitulo] = useState('')
  const [link, setLink] = useState('')
  const [desc, setDesc] = useState('')

  const carregar = useCallback(() => {
    api<Chefao>('/comunidade/chefao', { silencioso: true }).then(setChefao).catch(() => {})
    api<Desafio>('/comunidade/desafio', { silencioso: true }).then((d) => setDesafio(d.disponivel ? d : undefined)).catch(() => setDesafio(undefined))
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function acao(caminho: string, corpo?: object) {
    try {
      const r = await api<{ mensagem: string }>(caminho, { metodo: 'POST', corpo })
      toast.mostrar(r.mensagem, 'sucesso')
      carregar()
      return true
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não deu certo. Tente de novo.', 'erro')
      return false
    }
  }

  if (!chefao && desafio === null) return <Carregando variante="cartoes" quantidade={2} />

  const freelancer = role === 'freelancer'
  const pct = chefao ? Math.round((chefao.vida / chefao.vida_max) * 100) : 0

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Arena do castelo</h1>
      <p className={`${comum.subtitulo} placa`}>O chefão do mês cai com os projetos concluídos de todo mundo. E toda semana tem um desafio criativo com votação.</p>

      <div className={styles.grade}>
        {chefao && (
          <section className={`${comum.painel} ${styles.chefao}`} aria-labelledby="titulo-chefao">
            <h2 id="titulo-chefao"><Swords size={20} strokeWidth={2.2} /> Chefão do mês</h2>
            <Dragao derrotado={chefao.derrotado} />
            <strong className={styles.nome}>{chefao.nome}</strong>
            <div className={styles.vida} role="meter" aria-valuemin={0} aria-valuemax={chefao.vida_max} aria-valuenow={chefao.vida} aria-label={`Vida do ${chefao.nome}`}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className={styles.numeros}>
              {chefao.derrotado ? 'Derrotado!' : `${chefao.vida} de ${chefao.vida_max} de vida`} · {chefao.golpes} {chefao.golpes === 1 ? 'projeto concluído' : 'projetos concluídos'} · {chefao.participantes} {chefao.participantes === 1 ? 'pessoa ajudou' : 'pessoas ajudaram'}
            </p>
            <p className={comum.nota}>Cada projeto concluído tira 3 de vida; cada nota 5, mais 1. Termina em {formatarData(chefao.termina)}.</p>
            {freelancer && (
              chefao.resgatado ? (
                <span className={comum.selo}>Prêmio pego: +{chefao.xp} XP</span>
              ) : chefao.derrotado && chefao.participei ? (
                <button type="button" className={comum.botaoOuro} onClick={() => acao('/comunidade/chefao/resgatar')}>
                  <Trophy size={16} strokeWidth={2.2} /> Pegar o prêmio (+{chefao.xp} XP)
                </button>
              ) : (
                <p className={comum.nota}>{chefao.participei ? 'Você já ajudou neste mês! O prêmio sai quando ele cair.' : 'Conclua um projeto neste mês para entrar na luta e ganhar o prêmio.'}</p>
              )
            )}
          </section>
        )}

        {desafio && (
          <section className={`${comum.painel} ${styles.desafio}`} aria-labelledby="titulo-desafio">
            <h2 id="titulo-desafio"><Trophy size={20} strokeWidth={2.2} /> Desafio da semana</h2>
            <p className={styles.tema}>“{desafio.tema}”</p>
            <p className={comum.nota}>
              Freelancers mandam um trabalho com esse tema; todo mundo vota. O mais votado ganha {desafio.xp} XP e destaque. Termina em {formatarData(desafio.termina)}.
              {desafio.anterior.vencedor && <> Semana passada (“{desafio.anterior.tema}”): venceu {desafio.anterior.vencedor}.</>}
            </p>

            {freelancer && !desafio.meu_envio && (
              <form
                className={styles.form}
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (await acao('/comunidade/desafio', { titulo, link, desc })) {
                    setTitulo('')
                    setLink('')
                    setDesc('')
                  }
                }}
              >
                <label>
                  Nome do trabalho
                  <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} required />
                </label>
                <label>
                  Link (Behance, Drive, Figma...)
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" maxLength={300} required />
                </label>
                <label>
                  Comentário (opcional)
                  <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} />
                </label>
                <button type="submit" className={comum.botaoOuro}><Send size={15} strokeWidth={2.2} /> Mandar meu trabalho</button>
              </form>
            )}

            {desafio.envios.length === 0 ? (
              <p className={comum.nota}>Ninguém mandou ainda. Que tal ser o primeiro?</p>
            ) : (
              <ol className={styles.envios} aria-label="Trabalhos enviados, do mais votado ao menos votado">
                {desafio.envios.map((e, i) => (
                  <li key={e.env_id} className={e.meu ? styles.meu : ''}>
                    <span className={styles.posicao}>{i + 1}º</span>
                    <div>
                      <strong>{e.titulo}</strong>
                      <span className={comum.nota}>por {e.meu ? 'você' : e.autor}{e.desc ? ` · ${e.desc}` : ''}</span>
                    </div>
                    <a href={e.link} target="_blank" rel="noreferrer" className={comum.botao} aria-label={`Ver ${e.titulo}`}>
                      Ver <ExternalLink size={13} strokeWidth={2.4} aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      className={`${comum.botao} ${e.votei ? styles.votado : ''}`}
                      aria-pressed={e.votei}
                      disabled={e.meu}
                      onClick={() => acao(`/comunidade/desafio/${e.env_id}/voto`)}
                      aria-label={`${e.votei ? 'Tirar o voto de' : 'Votar em'} ${e.titulo} (${e.votos} ${e.votos === 1 ? 'voto' : 'votos'})`}
                    >
                      <ThumbsUp size={14} strokeWidth={2.4} aria-hidden="true" /> {e.votos}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
