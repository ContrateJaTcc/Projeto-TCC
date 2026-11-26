import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Check, CheckCheck, Circle, Trash2, X } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { haQuanto } from '../../utils/formatar'
import IconeNotificacao from './iconenotificacao'
import styles from './notificacoes.module.css'

interface Notificacao {
  not_id: number
  not_titulo: string
  not_desc: string
  not_lida: boolean
  not_data: string
}

/* Intervalo */
const INTERVALO = 60_000

/* Notificações */
export default function Notificacoes() {
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  /* Em páginas: as 20 mais novas atualizam sozinhas; "Carregar mais" traz as anteriores */
  const [antigas, setAntigas] = useState<Notificacao[]>([])
  const [mais, setMais] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const antigasRef = useRef<Notificacao[]>([])
  const toast = useToast()
  /* Fila das ações do sino (uma termina antes da próxima ir ao servidor) */
  const fila = useRef<Promise<unknown>>(Promise.resolve())

  async function carregarMais() {
    const todas = [...itens, ...antigas]
    const ultima = todas[todas.length - 1]
    if (!ultima) return
    setBuscando(true)
    try {
      const dados = await api<{ notificacoes: Notificacao[]; mais?: boolean }>(`/notificacoes?antes=${ultima.not_id}`, { silencioso: true })
      const novas = [...antigas, ...dados.notificacoes.filter((n) => !todas.some((t) => t.not_id === n.not_id))]
      antigasRef.current = novas
      setAntigas(novas)
      setMais(Boolean(dados.mais))
    } catch {
      /* Tenta de novo no próximo clique */
    } finally {
      setBuscando(false)
    }
  }

  const carregar = useCallback(async () => {
    try {
      const dados = await api<{ notificacoes: Notificacao[]; naoLidas: number; mais?: boolean }>('/notificacoes')
      setItens(dados.notificacoes)
      setNaoLidas(dados.naoLidas)
      setMais((atual) => (antigasRef.current.length ? atual : Boolean(dados.mais)))
    } catch {
      /* Ignora falha */
    }
  }, [])

  useEffect(() => {
    const primeira = setTimeout(carregar, 0)
    const ciclo = setInterval(carregar, INTERVALO)
    return () => {
      clearTimeout(primeira)
      clearInterval(ciclo)
    }
  }, [carregar])

  /* Fechar */
  useEffect(() => {
    if (!aberto) return

    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)

    document.addEventListener('mousedown', fora)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      window.removeEventListener('keydown', esc)
    }
  }, [aberto])

  /* Abrir não marca nada sozinho: cada aviso tem "lida/não lida" e "apagar", e o topo tem "todas lidas" e "limpar" */
  const alternar = () => setAberto((atual) => !atual)

  /* Muda a lista na tela na hora; se o servidor recusar, recarrega */
  const mudarLocal = (mudar: (n: Notificacao) => Notificacao | null) => {
    const aplicar = (lista: Notificacao[]) => lista.map(mudar).filter((n): n is Notificacao => n !== null)
    setItens(aplicar)
    antigasRef.current = aplicar(antigasRef.current)
    setAntigas(antigasRef.current)
  }

  /*
   * As ações vão ao servidor em fila, na ordem dos cliques: "Marcar todas como lidas" seguido
   * de "Limpar lidas" não pode chegar invertido (senão o limpar não acha nada lido).
   */
  const enfileirar = <T,>(acao: () => Promise<T>): Promise<T> => {
    const vez = fila.current.then(acao)
    fila.current = vez.catch(() => {})
    return vez
  }

  async function marcar(n: Notificacao, lida: boolean) {
    mudarLocal((x) => (x.not_id === n.not_id ? { ...x, not_lida: lida } : x))
    setNaoLidas((total) => Math.max(0, total + (lida ? -1 : 1)))
    try {
      await enfileirar(() => api(`/notificacoes/${n.not_id}`, { metodo: 'PUT', corpo: { lida }, silencioso: true }))
    } catch {
      carregar()
    }
  }

  async function apagar(n: Notificacao) {
    mudarLocal((x) => (x.not_id === n.not_id ? null : x))
    if (!n.not_lida) setNaoLidas((total) => Math.max(0, total - 1))
    try {
      await enfileirar(() => api(`/notificacoes/${n.not_id}`, { metodo: 'DELETE', silencioso: true }))
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível apagar o aviso.', 'erro')
      carregar()
    }
  }

  async function marcarTodas() {
    mudarLocal((x) => ({ ...x, not_lida: true }))
    setNaoLidas(0)
    await enfileirar(() => api('/notificacoes/lidas', { metodo: 'PUT', silencioso: true })).catch(() => carregar())
  }

  async function limparLidas() {
    /* O que está lido na tela agora é o que o servidor vai apagar (as ações anteriores chegam antes) */
    mudarLocal((x) => (x.not_lida ? null : x))
    try {
      const r = await enfileirar(() => api<{ mensagem: string }>('/notificacoes', { metodo: 'DELETE' }))
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível limpar.', 'erro')
    } finally {
      carregar()
    }
  }

  const todas = [...itens, ...antigas.filter((a) => !itens.some((n) => n.not_id === a.not_id))]
  const temLidas = todas.some((n) => n.not_lida)

  return (
    <div className={styles.caixa} ref={caixa} data-tour="notificacoes">
      <button
        type="button"
        className={`${styles.sino} ${aberto ? styles.sinoAtivo : ''}`}
        onClick={alternar}
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} novas` : 'Notificações'}
        aria-expanded={aberto}
      >
        <Bell size={18} strokeWidth={2.2} className={naoLidas > 0 ? styles.balancando : ''} />
        {naoLidas > 0 && <span className={styles.contador}>{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>

      {aberto && (
        <div className={styles.painel} role="dialog" aria-label="Notificações">
          <div className={styles.topo}>
            <strong>Notificações</strong>
            {todas.length > 0 && (
              <div className={styles.topoAcoes}>
                <button type="button" onClick={marcarTodas} disabled={naoLidas === 0}>
                  <CheckCheck size={14} aria-hidden="true" /> Marcar todas como lidas
                </button>
                <button type="button" onClick={limparLidas} disabled={!temLidas}>
                  <Trash2 size={14} aria-hidden="true" /> Limpar lidas
                </button>
              </div>
            )}
          </div>

          {todas.length === 0 ? (
            <div className={styles.vazio}>
              <BellOff size={26} strokeWidth={1.8} />
              <span>Nada por aqui ainda. Avisos de candidaturas, avaliações e insígnias aparecem aqui.</span>
            </div>
          ) : (
            <ul className={styles.lista}>
              {todas.map((n) => (
                <li key={n.not_id} className={n.not_lida ? '' : styles.nova}>
                  <IconeNotificacao titulo={n.not_titulo} />
                  <div className={styles.texto}>
                    <strong>{n.not_titulo}</strong>
                    <p>{n.not_desc}</p>
                    <span>{haQuanto(n.not_data)}</span>
                  </div>
                  <div className={styles.itemAcoes}>
                    <button
                      type="button"
                      onClick={() => marcar(n, !n.not_lida)}
                      aria-label={n.not_lida ? `Marcar "${n.not_titulo}" como não lida` : `Marcar "${n.not_titulo}" como lida`}
                      title={n.not_lida ? 'Marcar como não lida' : 'Marcar como lida'}
                    >
                      {n.not_lida ? <Circle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                    </button>
                    <button type="button" onClick={() => apagar(n)} aria-label={`Apagar "${n.not_titulo}"`} title="Apagar">
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
              {mais && (
                <li className={styles.maisItem}>
                  <button type="button" className={styles.mais} onClick={carregarMais} disabled={buscando}>
                    {buscando ? 'Carregando...' : 'Carregar mais antigas'}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
