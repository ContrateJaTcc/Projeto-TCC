/* Como cada pessoa aparece: moldura especial no avatar, cor do nome e disponibilidade (vêm do servidor) */

export type StatusDisponibilidade = 'disponivel' | 'ocupado' | 'ferias'

export interface Disponibilidade {
  status: StatusDisponibilidade
  /* Até quando fica ocupado ou de férias ("AAAA-MM-DD"), se a pessoa disse */
  ate: string | null
}

export interface GuildaResumo {
  gui_id: number
  nome: string
  brasao: string
  cor: string
}

export interface Aparencia {
  moldura?: string | null
  cor_nome?: string | null
  disponibilidade?: Disponibilidade
  /* Reino: guilda, testes de habilidade aprovados e mascote (servidor antigo não manda) */
  guilda?: GuildaResumo | null
  testes?: string[]
  mascote?: { especie: string; nome: string } | null
}

/* Molduras da loja e as da temporada do ranking (3 primeiros do mês passado) */
export const NOME_MOLDURA: Record<string, string> = {
  moldura_madeira: 'Moldura de madeira',
  moldura_cristal: 'Moldura de cristal',
  moldura_estrelas: 'Moldura estrelada',
  moldura_dragao: 'Moldura do dragão',
  campeao_ouro: 'Campeão da temporada (1º lugar)',
  campeao_prata: 'Vice-campeão da temporada (2º lugar)',
  campeao_bronze: 'Terceiro lugar da temporada',
}

export const ROTULO_DISPONIBILIDADE: Record<StatusDisponibilidade, string> = {
  disponivel: 'Disponível',
  ocupado: 'Ocupado',
  ferias: 'De férias',
}

/* "Ocupado até 10/11" */
export function textoDisponibilidade(d?: Disponibilidade | null) {
  if (!d) return ROTULO_DISPONIBILIDADE.disponivel
  const rotulo = ROTULO_DISPONIBILIDADE[d.status] ?? ROTULO_DISPONIBILIDADE.disponivel
  if (d.status === 'disponivel' || !d.ate) return rotulo
  return `${rotulo} até ${d.ate.split('-').reverse().slice(0, 2).join('/')}`
}
