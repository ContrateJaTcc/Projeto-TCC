import { useEffect, useState } from 'react'

/*
 * Surpresas raras no cenário: uma bruxa de vassoura cruzando a lua (ou o sol), um gato preto
 * andando no muro do castelo e duas corujas piscando nas árvores da frente.
 * Aparece uma de cada vez, poucas vezes por visita, e só com as animações ligadas.
 */
export type Surpresa = 'bruxa' | 'gato' | 'corujas'
export type SurpresaAtual = { tipo: Surpresa; id: number }
const TIPOS: Surpresa[] = ['bruxa', 'gato', 'corujas']

/* Em que camada do desenho cada uma aparece (anda junto com ela no parallax) */
export const CAMADA: Record<Surpresa, string> = { bruxa: 'ceu', gato: 'castelo', corujas: 'frente' }

/* Quanto cada uma fica na tela (igual às animações do CSS) */
const DURACAO: Record<Surpresa, number> = { bruxa: 7000, gato: 12000, corujas: 8000 }
/* A primeira demora um pouco; depois, de 1 a 2 minutos entre uma e outra */
const PRIMEIRA = [25_000, 45_000]
const ENTRE = [60_000, 120_000]

const sorteio = ([de, ate]: number[]) => de + Math.random() * (ate - de)

/* Sorteia as surpresas enquanto o fundo anima; um evento "surpresa" (com o tipo) chama uma na hora */
export function useSurpresa(animar: boolean) {
  const [atual, setAtual] = useState<SurpresaAtual | null>(null)

  useEffect(() => {
    if (!animar) return
    let ultima: Surpresa | null = null
    let id = 0
    const mostrar = (tipo: Surpresa) => {
      ultima = tipo
      setAtual({ tipo, id: Date.now() })
    }
    const agendar = (espera: number) => {
      id = window.setTimeout(() => {
        const opcoes = TIPOS.filter((t) => t !== ultima)
        mostrar(opcoes[Math.floor(Math.random() * opcoes.length)])
        agendar(sorteio(ENTRE))
      }, espera)
    }
    const aoPedir = (e: Event) => {
      const tipo = (e as CustomEvent<Surpresa>).detail
      if (TIPOS.includes(tipo)) mostrar(tipo)
    }
    agendar(sorteio(PRIMEIRA))
    window.addEventListener('surpresa', aoPedir)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('surpresa', aoPedir)
    }
  }, [animar])

  /* Sai da tela quando a animação acaba */
  useEffect(() => {
    if (!atual) return
    const id = window.setTimeout(() => setAtual(null), DURACAO[atual.tipo])
    return () => window.clearTimeout(id)
  }, [atual])

  return animar ? atual : null
}

