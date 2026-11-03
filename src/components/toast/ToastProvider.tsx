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

/* Toasts */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const proximoId = useRef(0)

  const fechar = useCallback((id: number) => {
    /* Saída */
    setToasts((atuais) => atuais.map((t) => (t.id === id ? { ...t, saindo: true } : t)))
    setTimeout(() => setToasts((atuais) => atuais.filter((t) => t.id !== id)), 250)
  }, [])

  const mostrar = useCallback(
    (mensagem: string, tipo: TipoToast = 'sucesso') => {
      const id = ++proximoId.current
      /* Máximo 3 */
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
