import { useContext } from 'react'
import { RoleContext } from './role-context-def'

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole deve ser usado dentro de RoleProvider')
  return ctx
}
