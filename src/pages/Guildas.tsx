import { useCallback, useEffect, useState } from 'react'
import { Shield, Users, Crown, LogOut, UserMinus, Pencil, Trophy, Sparkles, Info } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import Avatar from '../components/avatar/avatar'
import Brasao from '../components/reino/brasao'
import MissoesGuilda from '../components/reino/missoesguilda'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { BRASOES, CORES_GUILDA } from '../utils/reino'
import { comemorar } from '../utils/preferencias'
import comum from './comum.module.css'
import styles from './Guildas.module.css'

interface Membro {
  usu_id: number
  usu_nome: string
  usu_foto: string | null
  free_nivel: number
  gme_papel: 'lider' | 'membro'
  xp_mes: number
}

interface MinhaGuilda {
  gui_id: number
  nome: string
  lema: string | null
  brasao: string
  cor: string
  membros: Membro[]
  xp_mes: number
  posicao: number | null
  /* Meu papel na guilda (a liderança muda o brasão e tira membros) */
  meu_papel?: 'lider' | 'membro'
}

interface ItemGuilda {
  gui_id: number
  nome: string
  lema: string | null
  brasao: string
  cor: string
  membros: number
  xp_mes: number
  posicao: number
}

interface Dados {
  disponivel: boolean
  max_membros: number
  minha: MinhaGuilda | null
  guildas: ItemGuilda[]
}

/* Escolha de brasão e cor, com o escudo de prévia */
function EscolherBrasao({ brasao, cor, aoMudar }: { brasao: string; cor: string; aoMudar: (b: { brasao?: string; cor?: string }) => void }) {
  return (
    <div className={styles.escolha}>
      <fieldset className={styles.grupo}>
        <legend>Símbolo</legend>
        <div className={styles.opcoes}>
          {BRASOES.map((b) => (
            <button key={b.codigo} type="button" className={`${styles.opcao} ${brasao === b.codigo ? styles.escolhida : ''}`} onClick={() => aoMudar({ brasao: b.codigo })} aria-pressed={brasao === b.codigo} title={b.nome} aria-label={b.nome}>
              <Brasao brasao={b.codigo} cor={cor} tamanho={30} />
              
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.grupo}>
        <legend>Cor</legend>
        <div className={styles.opcoes}>
          {CORES_GUILDA.map((c) => (
            <button
              key={c.codigo}
              type="button"
              className={`${styles.cor} ${cor === c.codigo ? styles.escolhida : ''}`}
              style={{ background: c.hex }}
              onClick={() => aoMudar({ cor: c.codigo })}
              aria-pressed={cor === c.codigo}
              aria-label={c.nome}
              title={c.nome}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/* Guildas: grupos de freelancers que somam XP no mês e podem se candidatar juntos a projetos maiores */
export default function Guildas() {
  const toast = useToast()
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [lema, setLema] = useState('')
  const [brasao, setBrasao] = useState('escudo')
  const [cor, setCor] = useState('ouro')
  const [editando, setEditando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await api<Dados>('/guildas'))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar as guildas.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function chamar(chave: string, caminho: string, metodo: 'POST' | 'PUT' | 'DELETE', corpo?: object, festa = false) {
    setOcupado(chave)
    try {
      const r = await api<{ mensagem: string }>(caminho, { metodo, corpo })
      toast.mostrar(r.mensagem, 'sucesso')
      if (festa) comemorar()
      setEditando(false)
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível concluir.', 'erro')
    } finally {
      setOcupado(null)
    }
  }

  function comecarEdicao(g: MinhaGuilda) {
    setLema(g.lema ?? '')
    setBrasao(g.brasao)
    setCor(g.cor)
    setEditando(true)
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!dados) return <Carregando variante="lista" />

  const minha = dados.minha
  const souLider = minha?.meu_papel === 'lider'

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Guildas</h1>
      <p className={`${comum.subtitulo} placa`}>
        Junte até {dados.max_membros} freelancers numa guilda com nome e brasão. O XP do mês dos membros soma no ranking das guildas, e vocês podem
        se candidatar juntos a projetos maiores: o contratante vê que é um time.
      </p>

      {!dados.disponivel ? (
        <div className={comum.vazio}>
          <Shield size={28} strokeWidth={2} />
          <strong>As guildas estão sendo preparadas</strong>
          <p>Assim que o servidor for atualizado, dá para fundar ou entrar numa guilda por aqui.</p>
        </div>
      ) : (
        <div className={styles.grade}>
          {minha ? (
            <section className={`${comum.painel} ${styles.minha}`} aria-labelledby="titulo-minha">
              <div className={styles.topoGuilda}>
                <Brasao brasao={editando ? brasao : minha.brasao} cor={editando ? cor : minha.cor} tamanho={72} titulo={`Brasão da ${minha.nome}`} />
                <div className={styles.nomeGuilda}>
                  <span className={comum.nota}>Sua guilda</span>
                  <h2 id="titulo-minha">{minha.nome}</h2>
                  {minha.lema && <em>"{minha.lema}"</em>}
                </div>
              </div>

              <dl className={styles.placar}>
                <div>
                  <dt>Posição no mês</dt>
                  <dd>{minha.posicao ? `${minha.posicao}º` : '—'}</dd>
                </div>
                <div>
                  <dt>XP do mês</dt>
                  <dd>{minha.xp_mes}</dd>
                </div>
                <div>
                  <dt>Membros</dt>
                  <dd>{minha.membros.length}/{dados.max_membros}</dd>
                </div>
              </dl>

              <ul className={styles.membros} aria-label="Membros da guilda">
                {minha.membros.map((m) => (
                  <li key={m.usu_id}>
                    <Avatar nome={m.usu_nome} foto={m.usu_foto} size={38} nivel={m.free_nivel} />
                    <span className={styles.membroNome}>
                      <strong>{m.usu_nome}</strong>
                      <small>
                        {m.gme_papel === 'lider' && (
                          <span className={styles.lider}><Crown size={12} strokeWidth={2.6} /> Liderança · </span>
                        )}
                        nível {m.free_nivel} · {m.xp_mes} XP no mês
                      </small>
                    </span>
                    {souLider && m.gme_papel !== 'lider' && (
                      <button
                        type="button"
                        className={styles.remover}
                        onClick={() => chamar(`tirar-${m.usu_id}`, `/guildas/${minha.gui_id}/membros/${m.usu_id}`, 'DELETE')}
                        disabled={ocupado === `tirar-${m.usu_id}`}
                        aria-label={`Tirar ${m.usu_nome} da guilda`}
                        title="Tirar da guilda"
                      >
                        <UserMinus size={16} strokeWidth={2.2} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {editando ? (
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault()
                    chamar('editar', `/guildas/${minha.gui_id}`, 'PUT', { lema, brasao, cor })
                  }}
                >
                  <EscolherBrasao brasao={brasao} cor={cor} aoMudar={(b) => { if (b.brasao) setBrasao(b.brasao); if (b.cor) setCor(b.cor) }} />
                  <label>
                    Lema
                    <input value={lema} maxLength={120} onChange={(e) => setLema(e.target.value)} placeholder="Ex.: Entregamos antes do prazo." />
                  </label>
                  <div className={styles.acoes}>
                    <button type="button" className={comum.botao} onClick={() => setEditando(false)}>Cancelar</button>
                    <button type="submit" className={comum.botaoOuro} disabled={ocupado === 'editar'}>
                      {ocupado === 'editar' ? <span className="spinner" /> : <Pencil size={15} strokeWidth={2.4} />} Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <div className={styles.acoes}>
                  {souLider && (
                    <button type="button" className={comum.botao} onClick={() => comecarEdicao(minha)}>
                      <Pencil size={15} strokeWidth={2.4} /> Mudar brasão e lema
                    </button>
                  )}
                  <button type="button" className={comum.botao} onClick={() => chamar('sair', '/guildas/sair', 'POST')} disabled={ocupado === 'sair'}>
                    {ocupado === 'sair' ? <span className="spinner" /> : <LogOut size={15} strokeWidth={2.4} />} Sair da guilda
                  </button>
                </div>
              )}
              <MissoesGuilda guiId={minha.gui_id} />
              <p className={styles.dica}>
                <Info size={14} strokeWidth={2.2} aria-hidden="true" />
                Para se candidatar com o time, marque "Candidatar com a guilda" na página do projeto.
              </p>
            </section>
          ) : (
            <section className={`${comum.painel} ${styles.minha}`} aria-labelledby="titulo-fundar">
              <div className={styles.topoGuilda}>
                <Brasao brasao={brasao} cor={cor} tamanho={72} titulo="Prévia do brasão" />
                <div className={styles.nomeGuilda}>
                  <span className={comum.nota}>Você ainda não tem guilda</span>
                  <h2 id="titulo-fundar">{nome.trim() || 'Funde a sua'}</h2>
                  {lema.trim() && <em>"{lema.trim()}"</em>}
                </div>
              </div>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault()
                  chamar('fundar', '/guildas', 'POST', { nome, lema, brasao, cor }, true)
                }}
              >
                <label>
                  Nome da guilda
                  <input value={nome} minLength={3} maxLength={30} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ordem dos Pixels" required />
                </label>
                <label>
                  Lema (opcional)
                  <input value={lema} maxLength={120} onChange={(e) => setLema(e.target.value)} placeholder="Ex.: Entregamos antes do prazo." />
                </label>
                <EscolherBrasao brasao={brasao} cor={cor} aoMudar={(b) => { if (b.brasao) setBrasao(b.brasao); if (b.cor) setCor(b.cor) }} />
                <div className={styles.acoes}>
                  <button type="submit" className={comum.botaoOuro} disabled={ocupado === 'fundar' || nome.trim().length < 3}>
                    {ocupado === 'fundar' ? <span className="spinner" /> : <Shield size={15} strokeWidth={2.4} />} Fundar a guilda
                  </button>
                </div>
              </form>
              <p className={styles.dica}>
                <Info size={14} strokeWidth={2.2} aria-hidden="true" />
                Ou entre numa das guildas do ranking do mês.
              </p>
            </section>
          )}

          <section className={comum.painel} aria-labelledby="titulo-ranking-guildas">
            <h2 id="titulo-ranking-guildas"><Trophy size={22} strokeWidth={2.2} /> Ranking do mês</h2>
            {dados.guildas.length === 0 ? (
              <p className={comum.nota}>Nenhuma guilda ainda. Que tal fundar a primeira?</p>
            ) : (
              <ol className={styles.ranking}>
                {dados.guildas.map((g) => {
                  const cheia = g.membros >= dados.max_membros
                  const minhaEsta = minha?.gui_id === g.gui_id
                  return (
                    <li key={g.gui_id} className={minhaEsta ? styles.daMinha : ''}>
                      <span className={styles.posicao}>{g.posicao}º</span>
                      <Brasao brasao={g.brasao} cor={g.cor} tamanho={34} />
                      <span className={styles.itemNome}>
                        <strong>{g.nome}</strong>
                        <small>
                          <Users size={12} strokeWidth={2.4} aria-hidden="true" /> {g.membros}/{dados.max_membros}
                          {' · '}
                          <Sparkles size={12} strokeWidth={2.4} aria-hidden="true" /> {g.xp_mes} XP
                          {g.lema ? ` · ${g.lema}` : ''}
                        </small>
                      </span>
                      {!minha && (
                        <button
                          type="button"
                          className={comum.botao}
                          disabled={cheia || ocupado === `entrar-${g.gui_id}`}
                          onClick={() => chamar(`entrar-${g.gui_id}`, `/guildas/${g.gui_id}/entrar`, 'POST', undefined, true)}
                        >
                          {cheia ? 'Cheia' : 'Entrar'}
                        </button>
                      )}
                      {minhaEsta && <span className={comum.selo}>Sua</span>}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
