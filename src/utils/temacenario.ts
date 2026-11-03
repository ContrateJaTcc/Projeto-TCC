import { useEffect, useState } from 'react'

/*
 * Cenário comprado na loja (outono, cerejeira...): vale só para quem comprou.
 * A área logada pergunta ao servidor ao entrar; a loja avisa quando a pessoa troca.
 */
const EVENTO = 'tema-cenario'
let atual: string | null = null

export function definirTemaCenario(tema: string | null) {
  if (tema === atual) return
  atual = tema
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: tema }))
}

export function useTemaCenario() {
  const [tema, setTema] = useState(atual)
  useEffect(() => {
    const aoMudar = (e: Event) => setTema((e as CustomEvent<string | null>).detail)
    window.addEventListener(EVENTO, aoMudar)
    return () => window.removeEventListener(EVENTO, aoMudar)
  }, [])
  return tema
}
