/* Formatos devolvidos por /perfil/* e /avaliacoes/*. */

export interface ResumoFreelancer {
  xp: number
  nivel: number
  xpNivelAtual: number
  xpProximoNivel: number
  media: number
  totalAvaliacoes: number
  concluidos: number
}

export interface Insignia {
  codigo: string
  nome: string
  descricao: string
  conquistada: boolean
  data: string | null
  progresso: number
  meta: number
}

export interface Avaliacao {
  aval_id: number
  aval_nota: number
  aval_comentario: string | null
  aval_data: string
  serv_titulo: string
  avaliador_nome: string
  avaliador_foto: string | null
}

export interface PerfilFreelancer {
  resumo: ResumoFreelancer
  insignias: Insignia[]
  avaliacoes: Avaliacao[]
}

export interface AvaliacaoPendente {
  serv_id: number
  serv_titulo: string
  usu_id: number
  usu_nome: string
  usu_foto: string | null
}
