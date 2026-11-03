import { useEffect, useState } from 'react'
import { api } from '../services/api'

/* Árvore de habilidades (comunidade/arvore no servidor) */
export interface Galho {
  codigo: string
  titulo: string
  descricao: string
  progresso: number
  meta: number
  aceso: boolean
}

export interface AreaArvore {
  tipo_id: number
  area: string
  acesos: number
  galhos: Galho[]
}

/* Busca a árvore (a minha ou a de um freelancer); null enquanto carrega */
export function useArvore(usuId?: number) {
  const [areas, setAreas] = useState<AreaArvore[] | null>(null)
  useEffect(() => {
    let vivo = true
    api<{ areas: AreaArvore[] }>(usuId ? `/comunidade/arvore/${usuId}` : '/comunidade/arvore', { silencioso: true })
      .then((d) => vivo && setAreas(d.areas))
      .catch(() => vivo && setAreas([]))
    return () => {
      vivo = false
    }
  }, [usuId])
  return areas
}
