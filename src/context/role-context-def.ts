import { createContext } from 'react'

export type Role = 'freelancer' | 'contratante'

export interface RoleContextValue {
  role: Role | null
  setRole: (role: Role) => void
  sair: () => void
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined)
