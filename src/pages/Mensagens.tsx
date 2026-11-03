import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ArrowLeft, X, Send, MessageCirclePlus, ImagePlus, FileText, Download, HandCoins, CalendarClock, ShieldAlert, Reply, Ban } from 'lucide-react'
import { useRole } from '../context/useRole'
import Avatar from '../components/avatar/avatar'
import Carregando from '../components/carregando/carregando'
import { api, ErroApi, getToken } from '../services/api'
import { haQuanto } from '../utils/formatar'
import { tocarPlim } from '../utils/som'
import { comprimirImagem } from '../utils/imagem'
import Ilustracao from '../components/ilustracao/ilustracao'
import { CartaoProposta, FormProposta } from '../components/chat/proposta'
import { CartaoReuniao, FormReuniao } from '../components/chat/reuniao'
import { temContatoExterno } from '../utils/contatoexterno'
import RespostasRapidas from '../components/chat/respostasrapidas'
import { useToast } from '../context/useToast'
import chat from '../components/chat/chat.module.css'
import { estaOnline, textoVisto } from '../utils/presenca'
import Denunciar from '../components/denuncia/denunciar'
import styles from './Mensagens.module.css'

/* Conversa */
interface Conversa {
  serv_id: number
  serv_titulo: string
  outro_usu_id: number
  outro_nome: string
  ultima_mensagem: string
  ultima_data: string
  outro_foto: string | null
  nao_lidas: number
  /* "Visto por último" (null: a pessoa escondeu) */
  outro_visto_em?: string | null
  /* Antes da contratação o nome vem curto ("Maria S.") */
  anonimo?: boolean
}

/* Contato */
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
  /* Foto anexada (data URI), quando houver */
  msg_imagem?: string | null
  /* PDF anexado: só o nome vem na lista; o conteúdo baixa à parte */
  msg_arquivo_nome?: string | null
  /* Proposta de valor/prazo feita no chat */
  msg_proposta_valor?: number | string | null
  msg_proposta_prazo?: number | null
  msg_proposta_status?: 'pendente' | 'aceita' | 'recusada' | null
  /* Reunião marcada no chat e aviso de contato por fora */
  msg_reuniao_em?: string | null
  msg_reuniao_link?: string | null
  msg_reuniao_status?: 'pendente' | 'aceita' | 'recusada' | 'cancelada' | null
  msg_alerta_contato?: boolean | number
  /* Respondendo (citando) outra mensagem */
  msg_resposta_id?: number | null
  /* Pendente */
  pendente?: boolean
}

/* Mensagem vinda do canal em tempo real */
interface MensagemNova extends Mensagem {
  serv_id: number
}

/* PDF no chat: até 1,5 MB (o servidor confere de novo) */
const LIMITE_PDF = 1.5 * 1024 * 1024

function lerComoDataUri(arquivo: File) {
  return new Promise<string>((pronto, falha) => {
    const leitor = new FileReader()
    leitor.onload = () => pronto(String(leitor.result))
    leitor.onerror = () => falha(new Error('Não deu para ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

const tamanhoLegivel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)

/* Espera antes de tentar de novo quando a conexão cai */
const ESPERA_ERRO = 4000
/* De quanto em quanto tempo confere "digitando..." e "visto" com a conversa aberta */
const INTERVALO_ESTADO = 2500
/* Avisa que está digitando no máximo a cada 3 segundos */
const INTERVALO_DIGITANDO = 3000

/* Meu id */
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
  const [imagem, setImagem] = useState<string | null>(null)
  const [pdf, setPdf] = useState<{ dados: string; nome: string; tamanho: number } | null>(null)
  const [baixando, setBaixando] = useState<number | null>(null)
  const [preparandoImagem, setPreparandoImagem] = useState(false)
  /* Foto aberta em tela cheia */
  const [ampliada, setAmpliada] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoChat, setCarregandoChat] = useState(false)
  const [erro, setErro] = useState('')
  const fimDoChat = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [propondo, setPropondo] = useState(false)
  const [marcando, setMarcando] = useState(false)
  /* Mensagem com telefone/e-mail antes da contratação: pede confirmação antes de mandar */
  const [confirmarContato, setConfirmarContato] = useState(false)
  const [respondendo, setRespondendo] = useState<number | null>(null)
  /* Mensagem que está sendo respondida (citada) */
  const [citando, setCitando] = useState<Mensagem | null>(null)
  const [bloqueando, setBloqueando] = useState(false)
  /* O outro está digitando? Até qual mensagem minha ele já leu? */
  const [estado, setEstado] = useState<{ digitando: boolean; lidasAte: number; visto?: string | null }>({ digitando: false, lidasAte: 0 })
  const ultimoAviso = useRef(0)

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
      /* Marca lidas */
      carregarConversas()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar a conversa.')
    } finally {
      setCarregandoChat(false)
    }
  }, [buscarMensagens, carregarConversas])

  /* Primeira carga */
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
    // Só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Conversa aberta, lida dentro do ciclo de tempo real */
  const ativaRef = useRef<Conversa | null>(null)
  useEffect(() => {
    ativaRef.current = ativa
  }, [ativa])

  /* Tempo real: o servidor segura o pedido até chegar mensagem nova */
  useEffect(() => {
    const controle = new AbortController()
    let desde: number | undefined

    async function ouvir() {
      while (!controle.signal.aborted) {
        try {
          const dados = await api<{ mensagens: MensagemNova[]; ultimo: number }>(
            desde === undefined ? '/mensagens/novas' : `/mensagens/novas?desde=${desde}`,
            { silencioso: true, sinal: controle.signal }
          )
          if (typeof dados?.ultimo !== 'number') throw new Error('Resposta inesperada')

          const primeira = desde === undefined
          desde = dados.ultimo
          if (primeira || dados.mensagens.length === 0) continue

          const conversa = ativaRef.current
          const daConversa = (m: MensagemNova) =>
            conversa !== null &&
            m.serv_id === conversa.serv_id &&
            (m.usu_remetente === conversa.outro_usu_id || m.usu_destinatario === conversa.outro_usu_id)

          if (conversa && dados.mensagens.some(daConversa)) await buscarMensagens(conversa).catch(() => {})
          carregarConversas()

          const eu = lerMeuId()
          if (dados.mensagens.some((m) => m.usu_remetente !== eu)) tocarPlim()
        } catch {
          if (controle.signal.aborted) return
          /* Sem tempo real (servidor antigo ou queda): atualiza a conversa e tenta de novo */
          if (ativaRef.current) buscarMensagens(ativaRef.current).catch(() => {})
          await new Promise((r) => setTimeout(r, ESPERA_ERRO))
        }
      }
    }

    ouvir()
    return () => controle.abort()
  }, [buscarMensagens, carregarConversas])

  /* "Digitando..." e "Visto": com a conversa aberta, pergunta de tempos em tempos */
  useEffect(() => {
    if (!ativa) return
    let vivo = true
    const conferir = () =>
      api<{ digitando: boolean; lidas_ate: number; visto_em?: string | null }>(`/mensagens/${ativa.serv_id}/${ativa.outro_usu_id}/estado`, { silencioso: true })
        .then((d) => vivo && setEstado({ digitando: d.digitando, lidasAte: d.lidas_ate, visto: d.visto_em }))
        .catch(() => {})
    conferir()
    const id = setInterval(conferir, INTERVALO_ESTADO)
    return () => {
      vivo = false
      clearInterval(id)
      setEstado({ digitando: false, lidasAte: 0 })
    }
  }, [ativa])

  function mudarTexto(valor: string) {
    setTexto(valor)
    if (!ativa || !valor.trim() || Date.now() - ultimoAviso.current < INTERVALO_DIGITANDO) return
    ultimoAviso.current = Date.now()
    api('/mensagens/digitando', { metodo: 'POST', silencioso: true, corpo: { serv_id: ativa.serv_id, destinatario_id: ativa.outro_usu_id } }).catch(() => {})
  }

  async function enviarProposta(p: { valor: string; prazo: string; texto: string }) {
    if (!ativa) return false
    try {
      await api('/mensagens/proposta', {
        metodo: 'POST',
        corpo: { serv_id: ativa.serv_id, destinatario_id: ativa.outro_usu_id, valor: p.valor || null, prazo: p.prazo ? Number(p.prazo) : null, texto: p.texto },
      })
      await buscarMensagens(ativa)
      carregarConversas()
      toast.mostrar('Proposta enviada.')
      return true
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível enviar a proposta.', 'erro')
      return false
    }
  }

  /* Bloquear: some a conversa daqui e nenhum dos dois manda mais nada */
  async function bloquearConversa() {
    if (!ativa) return
    try {
      const r = await api<{ mensagem: string }>(`/usuarios/bloqueios/${ativa.outro_usu_id}`, { metodo: 'POST' })
      toast.mostrar(r.mensagem, 'sucesso')
      setBloqueando(false)
      setAtiva(null)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível bloquear.', 'erro')
    }
  }

  async function marcarReuniao(r: { quando: string; link: string; texto: string }) {
    if (!ativa) return false
    try {
      const resposta = await api<{ mensagem: string }>('/mensagens/reuniao', {
        metodo: 'POST',
        corpo: { serv_id: ativa.serv_id, destinatario_id: ativa.outro_usu_id, quando: r.quando, link: r.link || null, texto: r.texto },
      })
      await buscarMensagens(ativa)
      carregarConversas()
      toast.mostrar(resposta.mensagem)
      return true
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível marcar a reunião.', 'erro')
      return false
    }
  }

  async function responderReuniao(m: Mensagem, acao: 'aceitar' | 'recusar' | 'cancelar') {
    if (!ativa) return
    setRespondendo(m.msg_id)
    try {
      const r = await api<{ mensagem: string }>(`/mensagens/reuniao/${m.msg_id}`, { metodo: 'PUT', corpo: { acao } })
      toast.mostrar(r.mensagem, acao === 'aceitar' ? 'sucesso' : 'info')
      await buscarMensagens(ativa)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível responder a reunião.', 'erro')
    } finally {
      setRespondendo(null)
    }
  }

  async function responderProposta(m: Mensagem, acao: 'aceitar' | 'recusar') {
    if (!ativa) return
    setRespondendo(m.msg_id)
    try {
      const r = await api<{ mensagem: string }>(`/mensagens/proposta/${m.msg_id}`, { metodo: 'PUT', corpo: { acao } })
      toast.mostrar(r.mensagem, acao === 'aceitar' ? 'sucesso' : 'info')
      await buscarMensagens(ativa)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível responder a proposta.', 'erro')
    } finally {
      setRespondendo(null)
    }
  }

  /* Rolagem */
  useEffect(() => {
    fimDoChat.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens.length, estado.digitando])

  /* Foco e Esc */
  useEffect(() => {
    if (!ativa) return
    campo.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAtiva(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [ativa])

  /* Foto escolhida para mandar junto (já diminuída) */
  async function escolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setPreparandoImagem(true)
    try {
      setImagem(await comprimirImagem(arquivo))
      setErro('')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para usar essa imagem.')
    } finally {
      setPreparandoImagem(false)
    }
  }

  /* PDF escolhido para mandar junto */
  async function escolherPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
      setErro('Só dá para mandar arquivos PDF.')
      return
    }
    if (arquivo.size > LIMITE_PDF) {
      setErro(`Esse PDF tem ${tamanhoLegivel(arquivo.size)}. O limite é 1,5 MB.`)
      return
    }
    try {
      const dados = (await lerComoDataUri(arquivo)).replace(/^data:[^;]*;/, 'data:application/pdf;')
      setPdf({ dados, nome: arquivo.name, tamanho: arquivo.size })
      setErro('')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para usar esse arquivo.')
    }
  }

  /* Baixa o PDF de uma mensagem (só quem participa da conversa consegue) */
  async function baixarPdf(m: Mensagem) {
    if (m.msg_id < 0 || baixando) return
    setBaixando(m.msg_id)
    try {
      const dados = await api<{ arquivo: string; nome: string }>(`/mensagens/arquivo/${m.msg_id}`)
      const link = document.createElement('a')
      link.href = dados.arquivo
      link.download = dados.nome || 'arquivo.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível baixar o arquivo.')
    } finally {
      setBaixando(null)
    }
  }

  async function enviar(e?: React.FormEvent, mesmoAssim = false) {
    e?.preventDefault()
    const conteudo = texto.trim()
    const foto = imagem
    const anexo = pdf
    if ((!conteudo && !foto && !anexo) || !ativa || meuId === null) return

    /* Antes da contratação, telefone ou e-mail no texto: avisa do risco e pede confirmação */
    const contratado = contatos.some((c) => c.serv_id === ativa.serv_id && c.outro_usu_id === ativa.outro_usu_id && c.cand_status === 'aceita')
    if (!mesmoAssim && !contratado && temContatoExterno(conteudo)) {
      setConfirmarContato(true)
      return
    }
    setConfirmarContato(false)

    /* Envio otimista */
    const provisoria: Mensagem = {
      msg_id: -Date.now(),
      usu_remetente: meuId,
      usu_destinatario: ativa.outro_usu_id,
      msg_texto: conteudo,
      msg_imagem: foto,
      msg_arquivo_nome: anexo?.nome ?? null,
      msg_data: new Date().toISOString(),
      msg_lida: false,
      msg_resposta_id: citando?.msg_id ?? null,
      pendente: true,
    }
    const citada = citando

    setMensagens((atuais) => [...atuais, provisoria])
    setTexto('')
    setImagem(null)
    setPdf(null)
    setCitando(null)

    try {
      await api('/mensagens', {
        metodo: 'POST',
        corpo: {
          serv_id: ativa.serv_id,
          destinatario_id: ativa.outro_usu_id,
          texto: conteudo,
          ...(foto ? { imagem: foto } : {}),
          ...(anexo ? { arquivo: anexo.dados, arquivo_nome: anexo.nome } : {}),
          ...(citada ? { resposta_id: citada.msg_id } : {}),
        },
      })
      await buscarMensagens(ativa)
      carregarConversas()
    } catch (err) {
      /* Desfaz */
      setMensagens((atuais) => atuais.filter((m) => m.msg_id !== provisoria.msg_id))
      setCitando(citada)
      setTexto(conteudo)
      setImagem(foto)
      setPdf(anexo)
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível enviar a mensagem.')
    }
  }

  /* Contatos novos */
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

  /* "Visto" vai embaixo da última mensagem minha, se a outra pessoa já leu */
  const ultimaMinha = [...mensagens].reverse().find((m) => m.usu_remetente === meuId && m.msg_id > 0)
  const vista = ultimaMinha && (ultimaMinha.msg_lida || estado.lidasAte >= ultimaMinha.msg_id)
  const papelChat = role === 'contratante' ? 'contratante' : 'freelancer'

  if (carregando) return <Carregando variante="lista" />

  return (
    <div className={styles.pagina}>
      <h1 className="placa">Mensagens</h1>

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
          <h2 className="placa">
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

      {conversas.length > 0 && novosContatos.length > 0 && <h2 className={`${styles.tituloLista} placa`}>Suas conversas</h2>}

      {conversas.length === 0 ? (
        novosContatos.length === 0 && (
          <div className={`${styles.vazio} entrada`}>
            <Ilustracao tipo="coruja" />
            <strong>Nenhuma conversa ainda</strong>
            {/* Nova conversa */}
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
        <p className={`${styles.nenhuma} placa`}>Nenhuma conversa encontrada para "{busca}".</p>
      ) : (
        <div className={`${styles.lista} cascata`}>
          {visiveis.map((c) => (
            <button
              key={`${c.serv_id}-${c.outro_usu_id}`}
              type="button"
              className={`${styles.item} ${c.nao_lidas > 0 ? styles.naoLida : ''}`}
              onClick={() => abrir(c)}
            >
              <span className={styles.avatarPresenca}>
                <Avatar nome={c.outro_nome || 'Usuário'} size={52} foto={c.outro_foto} />
                {estaOnline(c.outro_visto_em) && <span className={styles.bolinhaOnline} aria-hidden="true" />}
              </span>
              <div className={styles.textos}>
                <strong>{c.outro_nome || 'Usuário'}</strong>
                <span className={styles.projeto}>{c.serv_titulo}</span>
                <span>{c.ultima_mensagem}</span>
              </div>
              <div className={styles.lado}>
                {c.ultima_data && <span className={styles.quando}>{haQuanto(c.ultima_data)}</span>}
                {c.nao_lidas > 0 && <span className={styles.contador}>{c.nao_lidas}</span>}
              </div>
              {estaOnline(c.outro_visto_em) && <span className="sr-only">, online agora</span>}
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
                {textoVisto(estado.visto ?? ativa.outro_visto_em) && (
                  <span className={estaOnline(estado.visto ?? ativa.outro_visto_em) ? styles.online : styles.visto}>{textoVisto(estado.visto ?? ativa.outro_visto_em)}</span>
                )}
                {ativa.anonimo && <span className={styles.visto}>Nome completo aparece depois da contratação</span>}
              </div>
              <button
                type="button"
                className={styles.chatFechar}
                onClick={() => setBloqueando((v) => !v)}
                aria-label={`Bloquear ${ativa.outro_nome}`}
                aria-expanded={bloqueando}
                title="Bloquear"
              >
                <Ban size={18} strokeWidth={2.2} />
              </button>
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
                  <Fragment key={m.msg_id}>
                  <div
                    /* Lado da bolha */
                    className={`${styles.bolha} ${
                      m.usu_remetente === meuId ? styles.enviada : styles.recebida
                    } ${m.pendente ? styles.pendente : ''}`}
                  >
                    {m.msg_resposta_id && (() => {
                      const original = mensagens.find((x) => x.msg_id === m.msg_resposta_id)
                      return (
                        <blockquote className={styles.citacao}>
                          <strong>{original ? (original.usu_remetente === meuId ? 'Você' : ativa.outro_nome?.split(' ')[0]) : 'Mensagem'}</strong>
                          <span>{original ? original.msg_texto || (original.msg_imagem ? 'Imagem' : original.msg_arquivo_nome ?? '') : 'Mensagem que não está mais aqui'}</span>
                        </blockquote>
                      )
                    })()}
                    {m.msg_imagem && (
                      <button type="button" className={styles.foto} onClick={() => setAmpliada(m.msg_imagem ?? null)} aria-label="Ver imagem maior">
                        <img src={m.msg_imagem} alt="Imagem enviada na conversa" loading="lazy" />
                      </button>
                    )}
                    {m.msg_arquivo_nome && (
                      <button
                        type="button"
                        className={styles.arquivo}
                        onClick={() => baixarPdf(m)}
                        disabled={m.pendente || baixando === m.msg_id}
                        aria-label={`Baixar ${m.msg_arquivo_nome}`}
                      >
                        <FileText size={22} strokeWidth={2} />
                        <span className={styles.arquivoNome}>{m.msg_arquivo_nome}</span>
                        {baixando === m.msg_id ? <span className="spinner" /> : <Download size={16} strokeWidth={2.2} />}
                      </button>
                    )}
                    {m.msg_reuniao_status ? (
                      <CartaoReuniao
                        m={m}
                        minha={m.usu_remetente === meuId}
                        com={ativa.outro_nome}
                        titulo={ativa.serv_titulo || 'Reunião'}
                        respondendo={respondendo === m.msg_id}
                        aoResponder={(acao) => responderReuniao(m, acao)}
                      />
                    ) : m.msg_proposta_status ? (
                      <CartaoProposta
                        m={m}
                        minha={m.usu_remetente === meuId}
                        respondendo={respondendo === m.msg_id}
                        aoResponder={(acao) => responderProposta(m, acao)}
                      />
                    ) : (
                      m.msg_texto
                    )}
                    <span className={styles.hora}>
                      {m.pendente ? 'enviando...' : formatarHora(m.msg_data)}
                    </span>
                  </div>
                  {!m.pendente && !m.msg_reuniao_status && !m.msg_proposta_status && (
                    <div className={`${styles.acoesMsg} ${m.usu_remetente === meuId ? styles.acoesMinha : ''}`}>
                      <button type="button" onClick={() => { setCitando(m); campo.current?.focus() }} aria-label={`Responder: ${m.msg_texto.slice(0, 40) || 'anexo'}`}>
                        <Reply size={13} strokeWidth={2.4} aria-hidden="true" /> Responder
                      </button>
                      {m.usu_remetente !== meuId && <Denunciar alvoTipo="mensagem" alvoId={m.msg_id} rotulo="Denunciar" titulo="Denunciar mensagem" />}
                    </div>
                  )}
                  {Boolean(m.msg_alerta_contato) && m.usu_remetente !== meuId && (
                    <p className={chat.alertaContato} role="note">
                      <ShieldAlert size={15} strokeWidth={2.4} aria-hidden="true" />
                      Cuidado: esta mensagem tem um contato de fora do site. Combine e pague tudo pelo ContrateJá até a contratação: pagamento por fora não tem garantia nem mediação.
                    </p>
                  )}
                  {m === ultimaMinha && vista && <span className={chat.visto}>Visto</span>}
                  </Fragment>
                ))
              )}
              {estado.digitando && (
                <span className={chat.digitando} role="status">
                  {ativa.outro_nome?.split(' ')[0]} está digitando
                  <span className={chat.pontos} aria-hidden="true"><i /><i /><i /></span>
                </span>
              )}
              <div ref={fimDoChat} />
            </div>

            {imagem && (
              <div className={styles.previaFoto}>
                <img src={imagem} alt="Imagem que vai ser enviada" />
                <span>Imagem pronta para enviar</span>
                <button type="button" onClick={() => setImagem(null)} aria-label="Tirar imagem">
                  <X size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {pdf && (
              <div className={styles.previaFoto}>
                <span className={styles.previaPdf}><FileText size={24} strokeWidth={2} /></span>
                <span>{pdf.nome} · {tamanhoLegivel(pdf.tamanho)}</span>
                <button type="button" onClick={() => setPdf(null)} aria-label="Tirar arquivo">
                  <X size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {bloqueando && (
              <div className={chat.confirmarContato} role="alert">
                <strong><Ban size={16} strokeWidth={2.4} /> Bloquear {ativa.outro_nome?.split(' ')[0]}?</strong>
                <span>Vocês param de trocar mensagens, propostas e convites{papelChat === 'contratante' ? ' e a pessoa não se candidata mais aos seus projetos' : ''}. Dá para desbloquear nas Configurações.</span>
                <div className={chat.propostaAcoes}>
                  <button type="button" className={chat.recusar} onClick={() => setBloqueando(false)}>Cancelar</button>
                  <button type="button" className={chat.aceitar} onClick={bloquearConversa}>Bloquear</button>
                </div>
              </div>
            )}

            {citando && (
              <div className={styles.respondendo} role="status">
                <Reply size={15} strokeWidth={2.4} aria-hidden="true" />
                <span>
                  Respondendo a {citando.usu_remetente === meuId ? 'você' : ativa.outro_nome?.split(' ')[0]}: <em>{citando.msg_texto.slice(0, 80) || 'anexo'}</em>
                </span>
                <button type="button" onClick={() => setCitando(null)} aria-label="Não responder esta mensagem">
                  <X size={15} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {confirmarContato ? (
              <div className={chat.confirmarContato} role="alert">
                <strong>
                  <ShieldAlert size={16} strokeWidth={2.4} /> Mandar um contato de fora?
                </strong>
                <span>
                  Por segurança, converse e pague pelo ContrateJá até a contratação: assim o pagamento fica na garantia e dá para pedir
                  mediação se algo der errado. {ativa.outro_nome?.split(' ')[0]} vai ver um aviso nessa mensagem.
                </span>
                <div className={chat.propostaAcoes}>
                  <button type="button" className={chat.recusar} onClick={() => { setConfirmarContato(false); campo.current?.focus() }}>
                    Editar a mensagem
                  </button>
                  <button type="button" className={chat.aceitar} onClick={() => enviar(undefined, true)}>
                    Enviar mesmo assim
                  </button>
                </div>
              </div>
            ) : propondo ? (
              <FormProposta aoEnviar={enviarProposta} aoFechar={() => setPropondo(false)} />
            ) : marcando ? (
              <FormReuniao aoEnviar={marcarReuniao} aoFechar={() => setMarcando(false)} />
            ) : (
              <RespostasRapidas papel={papelChat} aoEscolher={(t) => { mudarTexto(texto ? `${texto} ${t}` : t); campo.current?.focus() }} />
            )}

            <form className={styles.inputBar} onSubmit={enviar}>
              <button
                type="button"
                className={`${styles.anexar} ${propondo ? styles.anexarAtivo : ''}`}
                title="Propor valor e prazo"
                aria-label="Propor valor e prazo"
                aria-expanded={propondo}
                onClick={() => { setMarcando(false); setPropondo((v) => !v) }}
              >
                <HandCoins size={19} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`${styles.anexar} ${marcando ? styles.anexarAtivo : ''}`}
                title="Marcar reunião"
                aria-label="Marcar reunião"
                aria-expanded={marcando}
                onClick={() => { setPropondo(false); setMarcando((v) => !v) }}
              >
                <CalendarClock size={19} strokeWidth={2.2} />
              </button>
              <label className={styles.anexar} title="Mandar imagem" aria-label="Mandar imagem">
                {preparandoImagem ? <span className="spinner" /> : <ImagePlus size={19} strokeWidth={2.2} />}
                <input type="file" accept="image/*" onChange={escolherImagem} disabled={preparandoImagem} />
              </label>
              <label className={styles.anexar} title="Mandar PDF" aria-label="Mandar PDF">
                <FileText size={19} strokeWidth={2.2} />
                <input type="file" accept="application/pdf,.pdf" onChange={escolherPdf} />
              </label>
              <input
                ref={campo}
                type="text"
                placeholder="Escreva sua mensagem..."
                value={texto}
                onChange={(e) => { mudarTexto(e.target.value); if (confirmarContato) setConfirmarContato(false) }}
              />
              <button
                type="submit"
                className={styles.enviar}
                aria-label="Enviar"
                disabled={!texto.trim() && !imagem && !pdf}
              >
                <Send size={16} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>
      )}

      {ampliada && (
        <div className={styles.ampliada} role="dialog" aria-label="Imagem ampliada" onClick={() => setAmpliada(null)}>
          <img src={ampliada} alt="Imagem da conversa em tamanho grande" />
          <button type="button" aria-label="Fechar imagem" onClick={() => setAmpliada(null)}>
            <X size={22} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  )
}
