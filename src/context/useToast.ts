import { useContext } from 'react'
import { ToastContext } from './toast-context-def'

/* Uso */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
