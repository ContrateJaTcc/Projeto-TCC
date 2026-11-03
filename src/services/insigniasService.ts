import { api } from './api'

export type NomeInsignia =
  | 'Quartzo Rosa'
  | 'Rubelita'
  | 'Opala de Fogo'
  | 'Turmalina Paraíba'

export interface InsigniaResposta {
  free_id: number
  servicos_concluidos: number
  total_avaliacoes: number
  media_avaliacoes: number
  insignia: NomeInsignia | null
}

export function buscarInsignia(freeId: number): Promise<InsigniaResposta> {
  return api<InsigniaResposta>(`/insignias/${freeId}`, { publico: true })
}