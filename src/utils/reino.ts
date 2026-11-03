/*
 * Reino: mascote, guildas e o mapa de regiões (fica fora dos componentes para o Vite
 * conseguir recarregar só a tela que mudou).
 */

export type Especie = 'dragao' | 'gato' | 'coruja' | 'slime'

export const ESPECIES: { codigo: Especie; nome: string }[] = [
  { codigo: 'gato', nome: 'Gato' },
  { codigo: 'dragao', nome: 'Dragão' },
  { codigo: 'coruja', nome: 'Coruja' },
  { codigo: 'slime', nome: 'Slime' },
]

export type Fase = 'filhote' | 'jovem' | 'adulto'

/* Filhote nos níveis 1 e 2, jovem (com cachecol) do 3 ao 5, adulto (com coroa) do 6 em diante */
export const faseDoNivel = (nivel: number): Fase => (nivel >= 6 ? 'adulto' : nivel >= 3 ? 'jovem' : 'filhote')

export const ROTULO_FASE: Record<Fase, string> = { filhote: 'Filhote', jovem: 'Jovem', adulto: 'Adulto' }

export const BRASOES: { codigo: string; nome: string }[] = [
  { codigo: 'escudo', nome: 'Cruz' },
  { codigo: 'espada', nome: 'Espada' },
  { codigo: 'dragao', nome: 'Dragão' },
  { codigo: 'coroa', nome: 'Coroa' },
  { codigo: 'estrela', nome: 'Estrela' },
  { codigo: 'arvore', nome: 'Árvore' },
]

export const CORES_GUILDA: { codigo: string; nome: string; hex: string }[] = [
  { codigo: 'ouro', nome: 'Ouro', hex: '#d99a1e' },
  { codigo: 'ciano', nome: 'Ciano', hex: '#1f8fa6' },
  { codigo: 'rosa', nome: 'Rosa', hex: '#c4506d' },
  { codigo: 'lilas', nome: 'Lilás', hex: '#7c55b8' },
  { codigo: 'verde', nome: 'Verde', hex: '#3a8a4b' },
  { codigo: 'vermelho', nome: 'Vermelho', hex: '#b23a26' },
]

export const corDaGuilda = (cor: string) => CORES_GUILDA.find((c) => c.codigo === cor)?.hex ?? CORES_GUILDA[0].hex

/* Mapa do reino: cada região começa num nível (o XP de cada nível vem de utils/xp) */
export interface Regiao {
  nivel: number
  nome: string
  descricao: string
}

export const REGIOES: Regiao[] = [
  { nivel: 1, nome: 'Vila do Portão', descricao: 'Onde toda jornada começa: as primeiras candidaturas e o primeiro portfólio.' },
  { nivel: 2, nome: 'Campos de Trigo', descricao: 'Os primeiros clientes aparecem e o nome começa a correr pela vila.' },
  { nivel: 3, nome: 'Bosque dos Vaga-lumes', descricao: 'O mascote ganha cachecol e o perfil já chama atenção na busca.' },
  { nivel: 4, nome: 'Ponte do Rio', descricao: 'Projetos maiores do outro lado do rio, com prazos e etapas.' },
  { nivel: 5, nome: 'Mercado da Praça', descricao: 'Cheio de contratantes: aqui sai a insígnia Nível 5.' },
  { nivel: 6, nome: 'Torre do Mago', descricao: 'O mascote vira adulto e ganha coroa.' },
  { nivel: 7, nome: 'Montanha do Dragão', descricao: 'Só os veteranos chegam até o ninho no topo.' },
  { nivel: 8, nome: 'Salão do Castelo', descricao: 'A sala do trono: o fim do mapa, mas não da jornada.' },
]

/* Região atual e a próxima (null no fim do mapa) */
export function regiaoDoNivel(nivel: number) {
  let atual = REGIOES[0]
  for (const r of REGIOES) if (nivel >= r.nivel) atual = r
  const proxima = REGIOES.find((r) => r.nivel > nivel) ?? null
  return { atual, proxima }
}
