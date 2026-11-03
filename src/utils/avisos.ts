/* Avisos por tipo (o servidor tem o mesmo em services/avisos.js): o que chega no sino e no celular */

export const CATEGORIAS_AVISO = ['mensagens', 'projetos', 'pagamentos', 'avaliacoes', 'conquistas'] as const
export type CategoriaAviso = (typeof CATEGORIAS_AVISO)[number]
export type CanalAviso = 'sino' | 'celular'
export type PreferenciaAvisos = Record<CanalAviso, Record<CategoriaAviso, boolean>>

export const ROTULO_CATEGORIA: Record<CategoriaAviso, { titulo: string; exemplo: string }> = {
  mensagens: { titulo: 'Mensagens e reuniões', exemplo: 'propostas no chat, convites para reunião' },
  projetos: { titulo: 'Projetos', exemplo: 'candidaturas, contratação, prazos, etapas' },
  pagamentos: { titulo: 'Pagamentos', exemplo: 'garantia, pagamento liberado, bônus' },
  avaliacoes: { titulo: 'Avaliações', exemplo: 'nota recebida, pedido para avaliar' },
  conquistas: { titulo: 'Conquistas e jogo', exemplo: 'insígnias, nível, ranking, guilda, eventos' },
}

const REGRAS: [CategoriaAviso, RegExp][] = [
  ['avaliacoes', /avalia/i],
  ['pagamentos', /pagamento|pago\b|carteira|b[oô]nus|garantia|estorno|saque|recibo/i],
  ['conquistas', /ins[ií]gnia|n[ií]vel|conquista|ranking|miss[aã]o|teste|guilda|evento|desafio|chef[aã]o|drag[aã]o|\bxp\b/i],
  ['mensagens', /mensagem|proposta|reuni/i],
  ['projetos', /projeto|candidat|contrat|entreg|prazo|etapa|ajuste|acordo|disputa|convite|pausa|or[cç]amento|horas|crit[eé]rio|amostra|livre/i],
]

/* null = aviso da conta (segurança, papel), que sempre chega */
export function categoriaDoAviso(titulo = '', texto = ''): CategoriaAviso | null {
  for (const [categoria, regra] of REGRAS) if (regra.test(titulo)) return categoria
  for (const [categoria, regra] of REGRAS) if (regra.test(`${titulo} ${texto}`)) return categoria
  return null
}

export function avisosPadrao(): PreferenciaAvisos {
  const ligado = () => Object.fromEntries(CATEGORIAS_AVISO.map((c) => [c, true])) as Record<CategoriaAviso, boolean>
  return { sino: ligado(), celular: ligado() }
}
