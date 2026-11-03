import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { EventoAtual } from './eventos'

/*
 * Quanto a pessoa já achou no evento de agora. Fica guardado aqui para a faixa do painel e o item
 * escondido mostrarem o mesmo número; o servidor é quem conta de verdade.
 */
export interface SituacaoEvento {
  disponivel: boolean
  evento: (EventoAtual & { achados: number; completo: boolean; resgatado: boolean }) | null
  insignias: { codigo: string; ano: number; nome: string; data: string | null }[]
}

const EVENTO = 'evento-progresso'
let atual: SituacaoEvento | null = null
let pedido: Promise<SituacaoEvento | null> | null = null

export function guardarSituacaoEvento(s: SituacaoEvento) {
  atual = s
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: s }))
}

/* Pede ao servidor uma vez por visita (ou de novo, com "forcar") */
export function carregarSituacaoEvento(forcar = false) {
  if (!forcar && atual) return Promise.resolve(atual)
  if (!forcar && pedido) return pedido
  pedido = api<SituacaoEvento>('/eventos', { silencioso: true })
    .then((s) => {
      guardarSituacaoEvento(s)
      return s
    })
    .catch(() => null)
    .finally(() => {
      pedido = null
    })
  return pedido
}

/* Sair da conta: o próximo login pergunta de novo */
export function esquecerSituacaoEvento() {
  atual = null
}

export function useSituacaoEvento(ativo = true) {
  const [s, setS] = useState(atual)
  useEffect(() => {
    if (!ativo) return
    const aoMudar = (e: Event) => setS((e as CustomEvent<SituacaoEvento>).detail)
    window.addEventListener(EVENTO, aoMudar)
    carregarSituacaoEvento()
    return () => window.removeEventListener(EVENTO, aoMudar)
  }, [ativo])
  return s
}
