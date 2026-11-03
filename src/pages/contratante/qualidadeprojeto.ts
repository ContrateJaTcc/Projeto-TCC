/*
 * Nota de qualidade do anúncio: quanto mais completo, mais candidaturas boas ele costuma receber.
 * Cada item vale uns pontos; os que faltam viram dicas.
 */
export interface CamposAnuncio {
  titulo: string
  descricao: string
  categoria: string
  valor: string
  qtdDias: string
  habilidades: string
  formaPagamento: string
  local: string
  cidade: string
  candidaturasAte: string
}

interface Item {
  ok: boolean
  pontos: number
  dica: string
}

export function qualidadeDoAnuncio(c: CamposAnuncio) {
  const itens: Item[] = [
    { ok: c.titulo.trim().length >= 10, pontos: 15, dica: 'Dê um título claro, com pelo menos 10 letras (ex.: "Site para cafeteria com cardápio").' },
    { ok: c.descricao.trim().length >= 80, pontos: 25, dica: 'Conte mais na descrição (80 letras ou mais): o que precisa, para quem e como quer receber.' },
    { ok: Boolean(c.categoria), pontos: 10, dica: 'Escolha a categoria: é por ela que os freelancers filtram.' },
    { ok: Number(c.valor) > 0, pontos: 15, dica: 'Informe um valor: projetos com orçamento recebem mais candidaturas.' },
    { ok: Number(c.qtdDias) > 0, pontos: 10, dica: 'Diga o prazo em dias.' },
    { ok: c.habilidades.trim().length > 0, pontos: 10, dica: 'Liste as habilidades que você espera (ex.: React, Figma).' },
    { ok: c.formaPagamento.trim().length > 0, pontos: 5, dica: 'Conte a forma de pagamento (ex.: Pix).' },
    { ok: c.local === 'remoto' || c.cidade.trim().length > 0, pontos: 5, dica: 'Trabalho presencial ou híbrido: informe a cidade.' },
    { ok: Boolean(c.candidaturasAte), pontos: 5, dica: 'Uma data limite para candidaturas ajuda a decidir mais rápido.' },
  ]
  const total = itens.reduce((t, i) => t + i.pontos, 0)
  const feitos = itens.filter((i) => i.ok).reduce((t, i) => t + i.pontos, 0)
  return { porcento: Math.round((feitos / total) * 100), dicas: itens.filter((i) => !i.ok).sort((a, b) => b.pontos - a.pontos).map((i) => i.dica) }
}
