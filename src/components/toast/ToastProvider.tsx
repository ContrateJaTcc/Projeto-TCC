import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react'
import { ToastContext, type TipoToast } from '../../context/toast-context-def'
import styles from './toast.module.css'

interface Toast {
  id: number
  mensagem: string
  tipo: TipoToast
  saindo: boolean
}

const DURACAO = 4000
const ICONES = { sucesso: CircleCheck, erro: CircleAlert, info: Info }

/*
 * Avisos que entram pelo canto e somem sozinhos.
 *
 * Substituem os <p style={{ color: 'green' }}> espalhados pelas telas: aquela
 * mensagem aparecia sem transição, empurrava o layout para baixo e ficava lá
 * até a página recarregar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const proximoId = useRef(0)

  const fechar = useCallback((id: number) => {
    /* Marca como saindo para tocar a animação de saída antes de remover. */
    setToasts((atuais) => atuais.map((t) => (t.id === id ? { ...t, saindo: true } : t)))
    setTimeout(() => setToasts((atuais) => atuais.filter((t) => t.id !== id)), 250)
  }, [])

  const mostrar = useCallback(
    (mensagem: string, tipo: TipoToast = 'sucesso') => {
      const id = ++proximoId.current
      /* No máximo 3 na tela: uma rajada de ações não cobre a página. */
      setToasts((atuais) => [...atuais.slice(-2), { id, mensagem, tipo, saindo: false }])
      setTimeout(() => fechar(id), DURACAO)
    },
    [fechar]
  )

  const valor = useMemo(() => ({ mostrar }), [mostrar])

  return (
    <ToastContext.Provider value={valor}>
      {children}

      <div className={styles.pilha} role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icone = ICONES[t.tipo]

          return (
            <div
              key={t.id}
              className={`${styles.toast} ${styles[t.tipo]} ${t.saindo ? styles.saindo : ''}`}
            >
              <Icone size={18} strokeWidth={2.2} className={styles.icone} />
              <span>{t.mensagem}</span>
              <button type="button" aria-label="Fechar aviso" onClick={() => fechar(t.id)}>
                <X size={15} strokeWidth={2.2} />
              </button>
              <span className={styles.tempo} style={{ animationDuration: `${DURACAO}ms` }} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
