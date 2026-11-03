import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { CENARIO_LIVRE, comemorar, definirCenarioGlobal, lerCenarioGlobal, type CenarioGlobal } from './preferencias'

/*
 * Cenário que o administrador supremo definiu para todo mundo (tema, clima, fogos e aviso).
 * O site consulta ao abrir e a cada minuto; se o servidor não responder, cada um segue com o seu.
 */

const INTERVALO = 60_000
const CHAVE_FOGOS = 'fogos-vistos'
/* Fogos mais velhos que isso não estouram mais (quem abrir o site horas depois não vê) */
const FOGOS_RECENTES = 10 * 60_000

async function consultar() {
  try {
    const novo = await api<CenarioGlobal>('/config/cenario', { publico: true, silencioso: true })
    definirCenarioGlobal({ ...CENARIO_LIVRE, ...novo })
    soltarFogosNovos(novo.fogos)
  } catch {
    /* Servidor fora do ar ou sem a rota ainda: nada é forçado */
  }
}

function soltarFogosNovos(fogos: number | null) {
  if (!fogos || Date.now() - fogos > FOGOS_RECENTES) return
  try {
    if (Number(localStorage.getItem(CHAVE_FOGOS)) >= fogos) return
    localStorage.setItem(CHAVE_FOGOS, String(fogos))
  } catch {
    /* Sem armazenamento: solta assim mesmo */
  }
  comemorar()
}

export function vigiarCenarioGlobal() {
  consultar()
  setInterval(consultar, INTERVALO)
}

/* Pede de novo na hora (o supremo acabou de salvar) */
export const atualizarCenarioGlobal = consultar

export function useCenarioGlobal() {
  const [atual, setAtual] = useState<CenarioGlobal>(lerCenarioGlobal)

  useEffect(() => {
    const aoMudar = (e: Event) => setAtual((e as CustomEvent<CenarioGlobal>).detail)
    window.addEventListener('cenario-global', aoMudar)
    return () => window.removeEventListener('cenario-global', aoMudar)
  }, [])

  return atual
}
