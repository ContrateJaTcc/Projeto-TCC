/*
 * "Visto por último": o servidor marca quando a pessoa usou o site (a cada 2 minutos, no máximo).
 * Até 5 minutos conta como online. null = a pessoa escondeu nas Configurações (ou nunca entrou).
 */
const ONLINE = 5 * 60_000

export function estaOnline(iso: string | null | undefined, agora = Date.now()) {
  return Boolean(iso) && agora - new Date(iso as string).getTime() < ONLINE
}

export function textoVisto(iso: string | null | undefined, agora = Date.now()) {
  if (!iso) return null
  const ms = agora - new Date(iso).getTime()
  if (ms < ONLINE) return 'online agora'
  const minutos = Math.round(ms / 60_000)
  if (minutos < 60) return `visto há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `visto há ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'visto ontem'
  if (dias < 30) return `visto há ${dias} dias`
  return `visto em ${new Date(iso).toLocaleDateString('pt-BR')}`
}
