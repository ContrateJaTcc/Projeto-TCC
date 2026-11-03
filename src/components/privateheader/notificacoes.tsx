import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { api } from '../../services/api'
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

  async function alternar() {
    const abrindo = !aberto
    setAberto(abrindo)

    /* Marcar lidas */
    if (abrindo && naoLidas > 0) {
      setNaoLidas(0)
      api('/notificacoes/lidas', { metodo: 'PUT' }).catch(() => {})
    }

    if (!abrindo) {
      setItens((atuais) => atuais.map((n) => ({ ...n, not_lida: true })))
    }
  }

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
          </div>

          {itens.length === 0 ? (
            <div className={styles.vazio}>
              <BellOff size={26} strokeWidth={1.8} />
              <span>Nada por aqui ainda. Avisos de candidaturas, avaliações e insígnias aparecem aqui.</span>
            </div>
          ) : (
            <ul className={styles.lista}>
              {[...itens, ...antigas.filter((a) => !itens.some((n) => n.not_id === a.not_id))].map((n) => (
                <li key={n.not_id} className={n.not_lida ? '' : styles.nova}>
                  <IconeNotificacao titulo={n.not_titulo} />
                  <div>
                    <strong>{n.not_titulo}</strong>
                    <p>{n.not_desc}</p>
                    <span>{haQuanto(n.not_data)}</span>
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
