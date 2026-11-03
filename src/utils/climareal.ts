import { useEffect, useState } from 'react'
import { api, getToken } from '../services/api'
import type { Clima, EscolhaClima } from './preferencias'

/*
 * Clima "Real": o tempo que está fazendo agora na cidade do perfil, pela Open-Meteo
 * (grátis, sem chave). Sem cidade no perfil, pede a localização ao navegador.
 * O resultado fica guardado por 30 minutos para não consultar a cada página.
 */

const CHAVE = 'clima-real'
const VALIDADE = 30 * 60_000

/* Sigla do estado para o nome que a Open-Meteo usa */
const UFS: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

interface Guardado {
  clima: Clima
  em: number
}

/* Códigos de tempo da OMM (os que a Open-Meteo usa) para os climas do castelo */
function climaDoCodigo(codigo: number): Clima {
  if (codigo === 45 || codigo === 48) return 'neblina'
  if (codigo >= 95) return 'tempestade'
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'neve'
  if ((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'chuva'
  return 'limpo'
}

async function coordenadasDaCidade(): Promise<[number, number] | null> {
  if (!getToken()) return null
  try {
    const eu = await api<{ usu_cid?: string | null; usu_est?: string | null }>('/usuarios/eu')
    if (!eu.usu_cid) return null
    const busca = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(eu.usu_cid)}&count=5&language=pt&countryCode=BR`
    ).then((r) => r.json())
    const lugares: { latitude: number; longitude: number; admin1?: string }[] = busca.results ?? []
    /* Cidades com o mesmo nome: prefere a do estado do perfil (que vem como sigla, ex.: RJ) */
    const estado = (UFS[eu.usu_est?.toUpperCase() ?? ''] ?? eu.usu_est ?? '').toLowerCase()
    const lugar = lugares.find((l) => estado && l.admin1?.toLowerCase() === estado) ?? lugares[0]
    return lugar ? [lugar.latitude, lugar.longitude] : null
  } catch {
    return null
  }
}

function coordenadasDoNavegador(): Promise<[number, number] | null> {
  return new Promise((pronto) => {
    if (!navigator.geolocation) return pronto(null)
    navigator.geolocation.getCurrentPosition(
      (p) => pronto([p.coords.latitude, p.coords.longitude]),
      () => pronto(null),
      { timeout: 8000, maximumAge: VALIDADE }
    )
  })
}

export async function buscarClimaReal(): Promise<Clima> {
  try {
    const guardado: Guardado | null = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
    if (guardado && Date.now() - guardado.em < VALIDADE) return guardado.clima
  } catch {
    /* Sem armazenamento: consulta de novo */
  }
  const lugar = (await coordenadasDaCidade()) ?? (await coordenadasDoNavegador())
  if (!lugar) return 'limpo'
  try {
    const tempo = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lugar[0]}&longitude=${lugar[1]}&current=weather_code`).then((r) => r.json())
    const clima = climaDoCodigo(Number(tempo.current?.weather_code ?? 0))
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ clima, em: Date.now() } satisfies Guardado))
    } catch {
      /* Sem armazenamento */
    }
    return clima
  } catch {
    return 'limpo'
  }
}

/*
 * Clima "Estação": muda sozinho a cada 3 horas, sorteado com o tempo mais comum
 * de cada estação no Brasil (hemisfério sul). O sorteio sai da data e do bloco de horas,
 * então todo mundo vê o mesmo clima no mesmo horário e ele não pisca ao trocar de página.
 */
type Estacao = 'verao' | 'outono' | 'inverno' | 'primavera'

const PESOS: Record<Estacao, [Clima, number][]> = {
  /* Verão: pancadas de chuva e tempestades no fim da tarde */
  verao: [['limpo', 45], ['chuva', 30], ['tempestade', 25]],
  outono: [['limpo', 60], ['neblina', 25], ['chuva', 15]],
  /* Inverno: neblina de manhã cedo e, de vez em quando, a neve de conto de fadas do castelo */
  inverno: [['limpo', 45], ['neblina', 35], ['neve', 12], ['chuva', 8]],
  primavera: [['limpo', 60], ['chuva', 28], ['tempestade', 12]],
}

export function estacaoDe(data: Date): Estacao {
  const mes = data.getMonth() + 1
  const dia = data.getDate()
  const md = mes * 100 + dia
  if (md >= 1221 || md < 320) return 'verao'
  if (md < 621) return 'outono'
  if (md < 923) return 'inverno'
  return 'primavera'
}

export const NOME_ESTACAO: Record<Estacao, string> = { verao: 'verão', outono: 'outono', inverno: 'inverno', primavera: 'primavera' }

/* Número de 0 a 1 que só depende do texto (o mesmo bloco de horas dá sempre o mesmo clima) */
function sorteio(texto: string) {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

export function climaDaEstacao(agora = new Date()): Clima {
  const pesos = PESOS[estacaoDe(agora)]
  const bloco = `${agora.getFullYear()}-${agora.getMonth()}-${agora.getDate()}-${Math.floor(agora.getHours() / 3)}`
  let alvo = sorteio(bloco) * pesos.reduce((s, [, p]) => s + p, 0)
  for (const [clima, peso] of pesos) {
    alvo -= peso
    if (alvo < 0) return clima
  }
  return 'limpo'
}

/* O clima que vale agora: o escolhido, o de verdade ("Real") ou o da estação */
export function useClimaEfetivo(escolha: EscolhaClima): Clima {
  const [real, setReal] = useState<Clima>('limpo')
  const [daEstacao, setDaEstacao] = useState<Clima>(() => climaDaEstacao())

  /* Confere a cada 5 minutos se o bloco de horas virou */
  useEffect(() => {
    if (escolha !== 'estacao') return
    const id = window.setInterval(() => setDaEstacao(climaDaEstacao()), 5 * 60_000)
    return () => window.clearInterval(id)
  }, [escolha])

  useEffect(() => {
    if (escolha !== 'real') return
    let ativo = true
    const atualizar = () => buscarClimaReal().then((c) => ativo && setReal(c))
    atualizar()
    const id = window.setInterval(atualizar, VALIDADE)
    return () => {
      ativo = false
      window.clearInterval(id)
    }
  }, [escolha])

  if (escolha === 'real') return real
  if (escolha === 'estacao') return daEstacao
  return escolha
}
