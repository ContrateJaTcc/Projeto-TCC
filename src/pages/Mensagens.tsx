import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ArrowLeft, X, Send, MessagesSquare, MessageCirclePlus } from 'lucide-react'
import { useRole } from '../context/useRole'
import Avatar from '../components/avatar/avatar'
import Carregando from '../components/carregando/carregando'
import { api, ErroApi, getToken } from '../services/api'
import { haQuanto } from '../utils/formatar'
import styles from './Mensagens.module.css'

/*
 * Nao existe tabela de conversa: a tabela mensagem guarda serv_id +
 * remetente + destinatario, entao a "conversa" e o par (projeto, outra
 * pessoa), montado pelo servidor a partir das mensagens.
 */
interface Conversa {
  serv_id: number
  serv_titulo: string
  outro_usu_id: number
  outro_nome: string
  ultima_mensagem: string
  ultima_data: string
  outro_foto: string | null
  nao_lidas: number
}

/* GET /mensagens/contatos: quem participa de um projeto com você. */
interface Contato {
  serv_id: number
  serv_titulo: string
  outro_usu_id: number
  outro_nome: string
  outro_foto: string | null
  cand_status: 'pendente' | 'aceita' | 'recusada'
}

const ROTULO_CANDIDATURA: Record<string, string> = {
  pendente: 'Candidatura em análise',
  aceita: 'Em andamento',
  recusada: 'Não selecionado',
}

interface Mensagem {
  msg_id: number
  usu_remetente: number
  usu_destinatario: number
  msg_texto: string
  msg_data: string
  msg_lida: boolean
  /* Mensagem que acabou de ser enviada e o servidor ainda não confirmou. */
  pendente?: boolean
}

/* Com o chat aberto, procura mensagens novas a cada poucos segundos. */
const INTERVALO_CHAT = 6000

/* O id do usuario logado vem do proprio token, evitando uma chamada extra. */
function lerMeuId(): number | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.id === 'number' ? json.id : null
  } catch {
    return null
  }
}

export default function Mensagens() {
  const [params, setParams] = useSearchParams()
  const { role } = useRole()
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [ativa, setAtiva] = useState<Conversa | null>(null)
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoChat, setCarregandoChat] = useState(false)
  const [erro, setErro] = useState('')
  const fimDoChat = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  const meuId = lerMeuId()

  const carregarConversas = useCallback(async () => {
    try {
      const [dados, dadosContatos] = await Promise.all([
        api<{ conversas: Conversa[] }>('/mensagens'),
        api<{ contatos: Contato[] }>('/mensagens/contatos').catch(() => ({ contatos: [] })),
      ])
      setConversas(dados.conversas)
      setContatos(dadosContatos.contatos)
      return dados.conversas
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
      return []
    } finally {
      setCarregando(false)
    }
  }, [])

  const buscarMensagens = useCallback(async (conversa: Conversa) => {
    const dados = await api<{ mensagens: Mensagem[] }>(
      `/mensagens/${conversa.serv_id}/${conversa.outro_usu_id}`
    )
    setMensagens(dados.mensagens)
  }, [])

  const abrir = useCallback(async (conversa: Conversa) => {
    setAtiva(conversa)
    setMensagens([])
    setCarregandoChat(true)

    try {
      await buscarMensagens(conversa)
      /* Abrir marca como lidas no servidor; atualiza o contador da lista. */
      carregarConversas()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar a conversa.')
    } finally {
      setCarregandoChat(false)
    }
  }, [buscarMensagens, carregarConversas])

  /*
   * Primeira carga. Se a URL trouxer ?serv=&com= (botão "Mensagem" em
   * Candidatos, no projeto ou no Histórico), abre direto aquela conversa,
   * mesmo que ainda não tenha nenhuma mensagem: antes não havia como começar
   * uma conversa, só continuar uma que já existisse.
   */
  useEffect(() => {
    let ativo = true

    async function iniciar() {
      const lista = await carregarConversas()
      const serv = Number(params.get('serv'))
      const com = Number(params.get('com'))

      if (!ativo || !serv || !com) return

      const existente = lista.find((c) => c.serv_id === serv && c.outro_usu_id === com)

      abrir(
        existente ?? {
          serv_id: serv,
          outro_usu_id: com,
          outro_nome: params.get('nome') ?? 'Usuário',
          serv_titulo: params.get('titulo') ?? '',
          outro_foto: null,
          ultima_mensagem: '',
          ultima_data: '',
          nao_lidas: 0,
        }
      )
      setParams({}, { replace: true })
    }

    iniciar()
    return () => {
      ativo = false
    }
    // Só na montagem: os parâmetros são consumidos uma vez e limpos da URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Mensagens novas chegam sozinhas enquanto o chat está aberto. */
  useEffect(() => {
    if (!ativa) return
    const ciclo = setInterval(() => buscarMensagens(ativa).catch(() => {}), INTERVALO_CHAT)
    return () => clearInterval(ciclo)
  }, [ativa, buscarMensagens])

  /* Desce até a última mensagem quando chega ou sai uma nova. */
  useEffect(() => {
    fimDoChat.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens.length])

  /* Foco no campo ao abrir e Esc para fechar. */
  useEffect(() => {
    if (!ativa) return
    campo.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAtiva(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [ativa])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const conteudo = texto.trim()
    if (!conteudo || !ativa || meuId === null) return

    /*
     * Envio otimista: a bolha aparece na hora e o campo já limpa. Antes a
     * tela esperava duas idas ao servidor (enviar e recarregar) antes de
     * mostrar qualquer coisa, e parecia travada.
     */
    const provisoria: Mensagem = {
      msg_id: -Date.now(),
      usu_remetente: meuId,
      usu_destinatario: ativa.outro_usu_id,
      msg_texto: conteudo,
      msg_data: new Date().toISOString(),
      msg_lida: false,
      pendente: true,
    }

    setMensagens((atuais) => [...atuais, provisoria])
    setTexto('')

    try {
      await api('/mensagens', {
        metodo: 'POST',
        corpo: {
          serv_id: ativa.serv_id,
          destinatario_id: ativa.outro_usu_id,
          texto: conteudo,
        },
      })
      await buscarMensagens(ativa)
      carregarConversas()
    } catch (err) {
      /* Desfaz a bolha e devolve o texto, para a pessoa não perder o que escreveu. */
      setMensagens((atuais) => atuais.filter((m) => m.msg_id !== provisoria.msg_id))
      setTexto(conteudo)
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível enviar a mensagem.')
    }
  }

  /* Contatos com quem ainda não há nenhuma mensagem trocada. */
  const jaConversando = new Set(conversas.map((c) => `${c.serv_id}:${c.outro_usu_id}`))
  const novosContatos = contatos.filter((c) => !jaConversando.has(`${c.serv_id}:${c.outro_usu_id}`))

  const termo = busca.trim().toLowerCase()
  const visiveis = termo
    ? conversas.filter(
        (c) =>
          c.outro_nome?.toLowerCase().includes(termo) ||
          c.serv_titulo?.toLowerCase().includes(termo)
      )
    : conversas

  const formatarHora = (iso: string) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

  if (carregando) return <Carregando variante="lista" />

  return (
    <div className={styles.pagina}>
      <h1>Mensagens</h1>

      {conversas.length > 0 && (
        <div className={styles.busca}>
          <Search size={17} strokeWidth={2.2} />
          <input
            type="text"
            placeholder="Buscar por pessoa ou projeto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {erro && <p className="msg-erro">{erro}</p>}

      {novosContatos.length > 0 && (
        <section className={styles.novos}>
          <h2>
            <MessageCirclePlus size={18} strokeWidth={2.2} /> Começar uma conversa
          </h2>
          <div className={`${styles.gradeContatos} cascata`}>
            {novosContatos.map((c) => (
              <button
                key={`${c.serv_id}-${c.outro_usu_id}`}
                type="button"
                className={styles.contato}
                onClick={() =>
                  abrir({
                    serv_id: c.serv_id,
                    serv_titulo: c.serv_titulo,
                    outro_usu_id: c.outro_usu_id,
                    outro_nome: c.outro_nome,
                    outro_foto: c.outro_foto,
                    ultima_mensagem: '',
                    ultima_data: '',
                    nao_lidas: 0,
                  })
                }
              >
                <Avatar nome={c.outro_nome} size={42} foto={c.outro_foto} />
                <div className={styles.textos}>
                  <strong>{c.outro_nome}</strong>
                  <span className={styles.projeto}>{c.serv_titulo}</span>
                  <span>{ROTULO_CANDIDATURA[c.cand_status] ?? ''}</span>
                </div>
                <span className={styles.contatoAcao}>Mensagem</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {conversas.length > 0 && novosContatos.length > 0 && <h2 className={styles.tituloLista}>Suas conversas</h2>}

      {conversas.length === 0 ? (
        novosContatos.length === 0 && (
          <div className={`${styles.vazio} entrada`}>
            <MessagesSquare size={34} strokeWidth={1.7} />
            <strong>Nenhuma conversa ainda</strong>
            {/* As conversas são sempre sobre um projeto: só existem entre o
                contratante e quem se candidatou a ele. */}
            {role === 'contratante' ? (
              <>
                <p>
                  Você conversa com os freelancers que se candidatam aos seus projetos. Assim que
                  chegar uma candidatura, a pessoa aparece aqui.
                </p>
                <Link to="/contratante/criar-projeto" className={styles.vazioBtn}>Publicar um projeto</Link>
              </>
            ) : (
              <>
                <p>
                  Você conversa com o contratante de cada projeto em que se candidatar. Candidate-se
                  a um projeto e ele aparece aqui.
                </p>
                <Link to="/freelancer" className={styles.vazioBtn}>Encontrar projetos</Link>
              </>
            )}
          </div>
        )
      ) : visiveis.length === 0 ? (
        <p className={styles.nenhuma}>Nenhuma conversa encontrada para "{busca}".</p>
      ) : (
        <div className={`${styles.lista} cascata`}>
          {visiveis.map((c) => (
            <button
              key={`${c.serv_id}-${c.outro_usu_id}`}
              type="button"
              className={`${styles.item} ${c.nao_lidas > 0 ? styles.naoLida : ''}`}
              onClick={() => abrir(c)}
            >
              <Avatar nome={c.outro_nome || 'Usuário'} size={52} foto={c.outro_foto} />
              <div className={styles.textos}>
                <strong>{c.outro_nome || 'Usuário'}</strong>
                <span className={styles.projeto}>{c.serv_titulo}</span>
                <span>{c.ultima_mensagem}</span>
              </div>
              <div className={styles.lado}>
                {c.ultima_data && <span className={styles.quando}>{haQuanto(c.ultima_data)}</span>}
                {c.nao_lidas > 0 && <span className={styles.contador}>{c.nao_lidas}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {ativa && (
        <div className={styles.backdrop} onClick={() => setAtiva(null)}>
          <div
            className={styles.chat}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Conversa com ${ativa.outro_nome}`}
          >
            <div className={styles.chatHeader}>
              <button
                type="button"
                className={styles.chatVoltar}
                onClick={() => setAtiva(null)}
                aria-label="Voltar"
              >
                <ArrowLeft size={17} strokeWidth={2.2} />
              </button>
              <Avatar nome={ativa.outro_nome || 'Usuário'} size={38} foto={ativa.outro_foto} />
              <div className={styles.chatNome}>
                <strong>{ativa.outro_nome}</strong>
                {ativa.serv_titulo && <span>{ativa.serv_titulo}</span>}
              </div>
              <button
                type="button"
                className={styles.chatFechar}
                onClick={() => setAtiva(null)}
                aria-label="Fechar"
              >
                <X size={19} strokeWidth={2.2} />
              </button>
            </div>

            <div className={styles.mensagens}>
              {carregandoChat ? (
                <>
                  <div className={`skeleton ${styles.bolhaEsqueleto}`} />
                  <div className={`skeleton ${styles.bolhaEsqueleto} ${styles.direitaEsq}`} />
                  <div className={`skeleton ${styles.bolhaEsqueleto}`} />
                </>
              ) : mensagens.length === 0 ? (
                <p className={styles.inicio}>
                  Comece a conversa com {ativa.outro_nome?.split(' ')[0]}. Combine detalhes, prazos e
                  entregas do projeto por aqui.
                </p>
              ) : (
                mensagens.map((m) => (
                  <div
                    key={m.msg_id}
                    /* O lado da bolha vem de comparar o remetente com o usuario
                       logado. No mock era o literal 'eu', que nao identificava
                       ninguem. */
                    className={`${styles.bolha} ${
                      m.usu_remetente === meuId ? styles.enviada : styles.recebida
                    } ${m.pendente ? styles.pendente : ''}`}
                  >
                    {m.msg_texto}
                    <span className={styles.hora}>
                      {m.pendente ? 'enviando...' : formatarHora(m.msg_data)}
                    </span>
                  </div>
                ))
              )}
              <div ref={fimDoChat} />
            </div>

            <form className={styles.inputBar} onSubmit={enviar}>
              <input
                ref={campo}
                type="text"
                placeholder="Escreva sua mensagem..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <button
                type="submit"
                className={styles.enviar}
                aria-label="Enviar"
                disabled={!texto.trim()}
              >
                <Send size={16} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
