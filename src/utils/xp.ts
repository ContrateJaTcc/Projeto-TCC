import { comemorar } from './preferencias'

/* Último nível anunciado nesta visita: o mesmo nível não ganha a tela duas vezes */
let anunciado = 0

/* Tela de "subiu de nível" (components/gamificacao/subiunivel.tsx) com fogos no fundo */
export function anunciarNivel(nivel: number) {
  if (nivel <= anunciado) return
  anunciado = nivel
  window.dispatchEvent(new CustomEvent('subiu-nivel', { detail: nivel }))
  comemorar()
}

/*
 * Confere se o nível subiu desde a última vez que este usuário foi visto neste navegador.
 * Na primeira vez só guarda o nível. Se subiu, anuncia (tela e fogos) e devolve true.
 */
export function conferirNivel(usuId: number, nivel: number) {
  const chave = `nivel-visto-${usuId}`
  try {
    const visto = Number(localStorage.getItem(chave) ?? 0)
    localStorage.setItem(chave, String(nivel))
    if (visto && nivel > visto) {
      anunciarNivel(nivel)
      return true
    }
  } catch {
    /* Sem armazenamento: não dá para saber se subiu */
  }
  return false
}

/* Mesma fórmula do backend (services/gamificacao.js) */
const XP_BASE_NIVEL = 50

export const xpDoNivel = (nivel: number) => XP_BASE_NIVEL * (nivel - 1) ** 2

export const nivelPorXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / XP_BASE_NIVEL)) + 1

/* Progresso no nível atual */
export function progressoXp(xp: number) {
  const nivel = nivelPorXp(xp)
  const inicio = xpDoNivel(nivel)
  const fim = xpDoNivel(nivel + 1)

  return {
    nivel,
    xp,
    proximo: fim,
    faltam: fim - xp,
    percentual: Math.min(100, ((xp - inicio) / (fim - inicio)) * 100),
  }
}
