import { api, getToken } from '../services/api'
import { comemorar, type Clima } from './preferencias'

/*
 * Conquistas secretas que o site percebe (o servidor só aceita estas e dá cada uma uma vez).
 * Quando uma sai agora, avisa a tela com o evento "conquista-secreta" (o nome vai no detail).
 */
export const EVENTO_CONQUISTA = 'conquista-secreta'

type DoSite = 'explorador' | 'lua_cheia' | 'clima'

export async function tentarConquista(codigo: DoSite) {
  if (!getToken()) return
  /* Uma tentativa por aba já basta */
  const chave = `conquista:${codigo}`
  try {
    if (sessionStorage.getItem(chave)) return
    sessionStorage.setItem(chave, '1')
  } catch {
    /* Sem armazenamento: tenta assim mesmo */
  }
  try {
    const r = await api<{ nova: boolean; conquista: string | null }>(`/conquistas/${codigo}`, { metodo: 'POST', silencioso: true })
    if (r.nova && r.conquista) {
      window.dispatchEvent(new CustomEvent(EVENTO_CONQUISTA, { detail: r.conquista }))
      comemorar()
    }
  } catch {
    /* Servidor sem a migração: fica para depois */
  }
}

/* Mestre do clima: guarda os climas já vistos neste navegador; com os cinco, conta */
const CLIMAS: Clima[] = ['limpo', 'chuva', 'tempestade', 'neve', 'neblina']
const CHAVE_CLIMAS = 'climas-vistos'

export function registrarClima(clima: string) {
  if (!CLIMAS.includes(clima as Clima)) return
  try {
    const vistos = new Set<string>(JSON.parse(localStorage.getItem(CHAVE_CLIMAS) ?? '[]'))
    vistos.add(clima)
    localStorage.setItem(CHAVE_CLIMAS, JSON.stringify([...vistos]))
    if (CLIMAS.every((c) => vistos.has(c))) tentarConquista('clima')
  } catch {
    /* Sem armazenamento */
  }
}

/* Fase da lua de 0 a 1 (0 = nova, 0,5 = cheia), a partir de uma lua nova conhecida */
const LUA_NOVA = Date.UTC(2000, 0, 6, 18, 14)
const MES_LUNAR = 29.530588853

export function faseDaLua(data = new Date()) {
  const dias = (data.getTime() - LUA_NOVA) / 86_400_000
  return (((dias / MES_LUNAR) % 1) + 1) % 1
}

/* Quanto da lua aparece iluminado (0 a 1) */
export const iluminacao = (fase: number) => (1 - Math.cos(2 * Math.PI * fase)) / 2

/* Mesmo limite em que o desenho mostra a lua inteira */
export const luaCheia = (data = new Date()) => iluminacao(faseDaLua(data)) > 0.96
