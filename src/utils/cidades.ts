import { useEffect, useState } from 'react'

/*
 * Coordenadas das cidades brasileiras (IBGE, via github.com/kelvins/municipios-brasileiros, licença MIT),
 * guardadas em public/dados/cidades.json com 2 casas decimais (uns 1 km de precisão).
 * O mapa mostra só a cidade de cada projeto ou freelancer, nunca um endereço: é o que o site guarda.
 * O arquivo (170 KB, uns 50 KB comprimido) só é baixado quando alguém abre um mapa.
 */

export type Cidades = Record<string, [nome: string, lat: number, lng: number][]>

export interface Ponto {
  lat: number
  lng: number
}

export const normalizarCidade = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

let baixando: Promise<Cidades> | null = null
let carregando: Promise<Map<string, Ponto>> | null = null

/* O arquivo em si (o cadastro usa os nomes; o mapa, as coordenadas) */
export function baixarCidades() {
  baixando ??= fetch('/dados/cidades.json')
    .then((r) => {
      if (!r.ok) throw new Error('Não deu para carregar a lista de cidades.')
      return r.json() as Promise<Cidades>
    })
    .catch((erro) => {
      baixando = null
      throw erro
    })
  return baixando
}

/* "rj:volta redonda" -> ponto */
export function carregarCidades() {
  carregando ??= baixarCidades()
    .then((dados) => {
      const mapa = new Map<string, Ponto>()
      for (const [uf, lista] of Object.entries(dados)) {
        for (const [nome, lat, lng] of lista) mapa.set(`${uf.toLowerCase()}:${normalizarCidade(nome)}`, { lat, lng })
      }
      return mapa
    })
    .catch((erro) => {
      carregando = null
      throw erro
    })
  return carregando
}

/* null enquanto carrega; depois uma função que acha a cidade (ou null se não reconhecer o nome) */
export function useCidades() {
  const [achar, setAchar] = useState<((cidade?: string | null, uf?: string | null) => Ponto | null) | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    carregarCidades()
      .then((mapa) => vivo && setAchar(() => (cidade?: string | null, uf?: string | null) => (cidade && uf ? mapa.get(`${uf.trim().toLowerCase()}:${normalizarCidade(cidade)}`) ?? null : null)))
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
  }, [])

  return { achar, erro }
}

/*
 * Nomes oficiais das cidades de um estado, para sugerir e conferir no cadastro.
 * null enquanto carrega (ou se o arquivo não vier: aí o campo aceita o que for digitado e o servidor confere).
 */
export function useNomesCidades(uf: string) {
  const [dados, setDados] = useState<Cidades | null>(null)

  useEffect(() => {
    let vivo = true
    baixarCidades()
      .then((d) => vivo && setDados(d))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  return dados && uf ? (dados[uf] ?? []).map(([nome]) => nome) : null
}

/* "sao jose dos campos" -> "São José dos Campos" (ou null se não existir na lista) */
export function nomeOficial(nomes: string[], digitado: string) {
  const alvo = normalizarCidade(digitado)
  return nomes.find((n) => normalizarCidade(n) === alvo) ?? null
}

/* Distância em linha reta (km), pela fórmula de haversine */
export function distanciaKm(a: Ponto, b: Ponto) {
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export const textoDistancia = (km: number) => (km < 1 ? 'na sua cidade' : `a ${Math.round(km).toLocaleString('pt-BR')} km`)

/* Centro do Brasil, para quando não sabemos onde a pessoa está */
export const CENTRO_BRASIL: Ponto = { lat: -14.2, lng: -51.9 }
