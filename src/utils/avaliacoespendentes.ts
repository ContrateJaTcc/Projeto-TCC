import { useEffect, useState } from 'react'
import { api } from '../services/api'

/* Quem avalia ou finaliza algo avisa o cabeçalho para recontar */
const EVENTO = 'avaliacoes-mudaram'

export function avisarAvaliacoesMudaram() {
  window.dispatchEvent(new Event(EVENTO))
}

/* Quantas avaliações a pessoa ainda tem para fazer (0 enquanto carrega ou se falhar) */
export function useAvaliacoesPendentes(ativo: boolean, chave: string) {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!ativo) return
    let vivo = true
    const contar = () =>
      api<{ pendentes: unknown[] }>('/avaliacoes/pendentes', { silencioso: true })
        .then((d) => vivo && setTotal(d.pendentes.length))
        .catch(() => {})
    contar()
    window.addEventListener(EVENTO, contar)
    return () => {
      vivo = false
      window.removeEventListener(EVENTO, contar)
    }
  }, [ativo, chave])

  return ativo ? total : 0
}
