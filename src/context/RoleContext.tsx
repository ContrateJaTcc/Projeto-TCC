import { useEffect, useState, type ReactNode } from 'react'
import { RoleContext, type Role } from './role-context-def'
import { api, ehPapel, getToken, limparSessao } from '../services/api'
import { definirTemaCenario } from '../utils/temacenario'
import { esquecerSituacaoEvento } from '../utils/eventoprogresso'

const STORAGE_KEY = 'contrateja:role'

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY)
    return ehPapel(salvo) ? salvo : null
  })

  useEffect(() => {
    if (role) {
      localStorage.setItem(STORAGE_KEY, role)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [role])

  const setRole = (novoRole: Role) => setRoleState(novoRole)
  const sair = () => {
    /* Encerra a sessão no servidor também (o token é lido antes de a sessão local ser apagada) */
    if (getToken()) api('/auth/sair', { metodo: 'POST', silencioso: true }).catch(() => {})
    limparSessao()
    definirTemaCenario(null)
    esquecerSituacaoEvento()
    setRoleState(null)
  }

  return (
    <RoleContext.Provider value={{ role, setRole, sair }}>
      {children}
    </RoleContext.Provider>
  )
}
