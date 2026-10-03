/*
 * Formatação única para o site inteiro. Antes cada tela formatava do seu
 * jeito e o mesmo valor aparecia como "R$ 850.00" numa e "R$ 850,00" noutra.
 */

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor: number | string) {
  return moeda.format(Number(valor))
}

export function formatarValorServico(valor: number | string, tipo: 'hora' | 'fixo' | string) {
  return tipo === 'hora' ? `${formatarMoeda(valor)}/hora` : formatarMoeda(valor)
}

export function formatarData(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : ''
}

/* "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", ou a data se for antigo. */
export function haQuanto(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  return formatarData(iso)
}
