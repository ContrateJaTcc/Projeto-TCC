/*
 * Filtro automático de spam dos projetos (o servidor confere o mesmo em services/moderacao.js).
 * Projeto suspeito não é recusado: vai para a revisão da administração antes de aparecer para os freelancers.
 */

const TERMOS = [
  'dinheiro facil', 'ganhe dinheiro', 'renda extra garantida', 'lucro garantido', 'investimento garantido', 'ganhos garantidos',
  'trabalhe de casa e ganhe', 'fique rico', 'piramide', 'marketing multinivel', 'bitcoin', 'criptomoeda', 'cripto',
  'pix antecipado', 'pague a taxa', 'taxa de inscricao', 'taxa de adesao', 'deposito antecipado', 'clique aqui', 'link na bio',
  'sem experiencia ganhe', 'aposta', 'apostas', 'cassino', 'jogo do tigrinho',
]

const ENCURTADORES = /\b(bit\.ly|tinyurl\.com|cutt\.ly|encurtador\.com\.br|goo\.gl|is\.gd|rb\.gy|shorturl\.at|t\.co|ow\.ly|tiny\.cc)\//i

export const VALOR_SUSPEITO_FIXO = 100_000
export const VALOR_SUSPEITO_HORA = 2_000

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function motivosDeSpam({ titulo, descricao, valor, tipo_valor }: { titulo: string; descricao: string; valor: number | string; tipo_valor: string }) {
  const texto = normalizar(`${titulo} ${descricao}`)
  const motivos: string[] = []
  const termo = TERMOS.find((t) => new RegExp(`\\b${t}\\b`).test(texto))
  if (termo) motivos.push(`termo suspeito ("${termo}")`)
  if (ENCURTADORES.test(`${titulo} ${descricao}`)) motivos.push('link encurtado')
  const v = Number(valor)
  if (Number.isFinite(v) && v > (tipo_valor === 'hora' ? VALOR_SUSPEITO_HORA : VALOR_SUSPEITO_FIXO)) motivos.push('valor fora do normal')
  const letras = titulo.replace(/[^A-Za-zÀ-ú]/g, '')
  if (/!{3,}/.test(`${titulo} ${descricao}`) || (letras.length >= 12 && letras === letras.toUpperCase())) motivos.push('título gritando')
  return motivos
}
