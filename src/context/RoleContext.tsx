import { useEffect, useState, type ReactNode } from 'react'
import { RoleContext, type Role } from './role-context-def'

const STORAGE_KEY = 'contrateja:role'

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY)
    return salvo === 'freelancer' || salvo === 'contratante' ? salvo : null
  })

  useEffect(() => {
    if (role) {
      localStorage.setItem(STORAGE_KEY, role)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [role])

  const setRole = (novoRole: Role) => setRoleState(novoRole)
  const sair = () => setRoleState(null)

  return (
    <RoleContext.Provider value={{ role, setRole, sair }}>
      {children}
    </RoleContext.Provider>
  )
}
