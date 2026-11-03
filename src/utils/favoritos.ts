import { useCallback, useEffect, useState } from 'react'
import { api, ErroApi } from '../services/api'

/* Freelancers favoritos do contratante: a mesma lista vale para a busca e para o portfólio */
const EVENTO = 'favoritos-mudaram'

export function useFavoritos(ativo: boolean, avisarErro?: (mensagem: string) => void) {
  /* null = servidor sem a migração ou ainda carregando: o coração não aparece */
  const [ids, setIds] = useState<Set<number> | null>(null)

  useEffect(() => {
    if (!ativo) return
    let vivo = true
    const carregar = () =>
      api<{ disponivel?: boolean; ids: number[] }>('/usuarios/favoritos', { silencioso: true })
        .then((d) => vivo && setIds(d.disponivel === false ? null : new Set(d.ids.map(Number))))
        .catch(() => vivo && setIds(null))
    carregar()
    window.addEventListener(EVENTO, carregar)
    return () => {
      vivo = false
      window.removeEventListener(EVENTO, carregar)
    }
  }, [ativo])

  const alternar = useCallback(
    async (usuId: number) => {
      if (!ids) return
      const era = ids.has(usuId)
      /* Muda na hora; se o servidor recusar, volta como estava */
      setIds((atual) => {
        const novo = new Set(atual)
        if (era) novo.delete(usuId)
        else novo.add(usuId)
        return novo
      })
      try {
        await api(`/usuarios/favoritos/${usuId}`, { metodo: era ? 'DELETE' : 'POST', silencioso: true })
        window.dispatchEvent(new Event(EVENTO))
      } catch (e) {
        setIds((atual) => {
          const volta = new Set(atual)
          if (era) volta.add(usuId)
          else volta.delete(usuId)
          return volta
        })
        avisarErro?.(e instanceof ErroApi ? e.message : 'Não foi possível guardar o favorito.')
      }
    },
    [ids, avisarErro]
  )

  return { ids, alternar }
}
