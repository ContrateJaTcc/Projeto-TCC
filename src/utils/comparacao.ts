/* Freelancers marcados para comparar (até 3), guardados neste navegador enquanto o contratante navega */
const CHAVE = 'comparar-freelancers'
export const MAX_COMPARAR = 3

export function lerComparacao(): number[] {
  try {
    const lista = JSON.parse(sessionStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(lista) ? lista.filter((n) => Number.isInteger(n)).slice(0, MAX_COMPARAR) : []
  } catch {
    return []
  }
}

export function salvarComparacao(ids: number[]) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(ids.slice(0, MAX_COMPARAR)))
  } catch {
    /* Sem armazenamento: a comparação só vale nesta página */
  }
}
