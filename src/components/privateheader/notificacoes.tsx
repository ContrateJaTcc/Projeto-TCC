import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { api } from '../../services/api'
import { haQuanto } from '../../utils/formatar'
import styles from './notificacoes.module.css'

interface Notificacao {
  not_id: number
  not_titulo: string
  not_desc: string
  not_lida: boolean
  not_data: string
}

/* Busca de tempos em tempos: aceite de candidatura, avaliação e insígnia chegam sem recarregar. */
const INTERVALO = 60_000

/*
 * Sininho do topo. As notificações já eram gravadas no banco, mas o botão
 * não fazia nada.
 */
export default function Notificacoes() {
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const caixa = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await api<{ notificacoes: Notificacao[]; naoLidas: number }>('/notificacoes')
      setItens(dados.notificacoes)
      setNaoLidas(dados.naoLidas)
    } catch {
      /* Falhar aqui não deve atrapalhar a tela; tenta de novo no próximo ciclo. */
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

  /* Fecha ao clicar fora ou apertar Esc. */
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

    /* Abrir conta como "ver": zera o contador, mas os itens continuam
       destacados até fechar, para a pessoa saber quais eram novos. */
    if (abrindo && naoLidas > 0) {
      setNaoLidas(0)
      api('/notificacoes/lidas', { metodo: 'PUT' }).catch(() => {})
    }

    if (!abrindo) {
      setItens((atuais) => atuais.map((n) => ({ ...n, not_lida: true })))
    }
  }

  return (
    <div className={styles.caixa} ref={caixa}>
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
              {itens.map((n) => (
                <li key={n.not_id} className={n.not_lida ? '' : styles.nova}>
                  <strong>{n.not_titulo}</strong>
                  <p>{n.not_desc}</p>
                  <span>{haQuanto(n.not_data)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
