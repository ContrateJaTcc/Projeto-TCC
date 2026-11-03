/* Horários de atendimento do freelancer: {dias:[1..5], de: 9, ate: 18} (0 = domingo) */
export interface Horarios {
  dias: number[]
  de: number
  ate: number
}

export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/* "seg a sex, das 9h às 18h" (dias seguidos viram intervalo) */
export function textoHorarios(h: Horarios | null | undefined) {
  if (!h?.dias.length) return null
  const dias = [...h.dias].sort()
  const seguidos = dias.every((d, i) => i === 0 || d === dias[i - 1] + 1)
  const parte = seguidos && dias.length > 2 ? `${DIAS_SEMANA[dias[0]]} a ${DIAS_SEMANA[dias[dias.length - 1]]}` : dias.map((d) => DIAS_SEMANA[d]).join(', ')
  return `${parte}, das ${h.de}h às ${h.ate}h`
}

/* A data (hora local) cai dentro dos horários? */
export function dentroDoHorario(h: Horarios | null | undefined, quando: Date) {
  if (!h) return true
  return h.dias.includes(quando.getDay()) && quando.getHours() >= h.de && quando.getHours() < h.ate
}
