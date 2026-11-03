/* Formatação */

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

/* Tempo relativo */
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

/* "~15 min", "~2 h", "~1 dia" */
export function textoTempoResposta(minutos: number) {
  if (minutos < 60) return `~${Math.max(5, Math.round(minutos / 5) * 5)} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `~${horas} h`
  const dias = Math.round(horas / 24)
  return `~${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
