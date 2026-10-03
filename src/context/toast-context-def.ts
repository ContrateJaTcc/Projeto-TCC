import { createContext } from 'react'

export type TipoToast = 'sucesso' | 'erro' | 'info'

export interface ToastContextValue {
  mostrar: (mensagem: string, tipo?: TipoToast) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
