import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ponto } from '../../utils/cidades'
import styles from './mapa.module.css'

/*
 * Mapa do OpenStreetMap (Leaflet) com um marcador em pixel art por cidade.
 * Carregado só quando alguém abre um mapa (React.lazy), para não pesar o resto do site.
 */

export interface PontoMapa {
  chave: string
  ponto: Ponto
  /* Número dentro do marcador (quantos projetos ou freelancers na cidade; 0 = só o alfinete) */
  quantidade: number
  rotulo: string
}

interface MapaProps {
  pontos: PontoMapa[]
  /* Onde a pessoa está (marcador "Você") */
  centro?: Ponto | null
  raioKm?: number | null
  selecionado?: string | null
  aoEscolher?: (chave: string | null) => void
  altura?: number
  /* Texto para leitores de tela: o que o mapa mostra */
  descricao: string
}

export default function Mapa({ pontos, centro = null, raioKm = null, selecionado = null, aoEscolher, altura = 420, descricao }: MapaProps) {
  const caixa = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const camada = useRef<L.LayerGroup | null>(null)
  const escolher = useRef(aoEscolher)
  /* Só reenquadra quando mudam os lugares (escolher uma cidade não mexe no zoom da pessoa) */
  const enquadrado = useRef('')

  useEffect(() => {
    escolher.current = aoEscolher
  }, [aoEscolher])

  /* Cria o mapa uma vez */
  useEffect(() => {
    if (!caixa.current) return
    const m = L.map(caixa.current, { zoomSnap: 0.5, scrollWheelZoom: false, attributionControl: true }).setView([-14.2, -51.9], 4)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 13,
      minZoom: 3,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    m.attributionControl.setPrefix(false)
    camada.current = L.layerGroup().addTo(m)
    m.on('click', () => escolher.current?.(null))
    mapa.current = m
    /* O tamanho certo só existe depois que a página termina de montar */
    const t = setTimeout(() => m.invalidateSize(), 50)
    return () => {
      clearTimeout(t)
      m.remove()
      mapa.current = null
      camada.current = null
      enquadrado.current = ''
    }
  }, [])

  /* Marcadores, raio e enquadramento */
  useEffect(() => {
    const m = mapa.current
    const grupo = camada.current
    if (!m || !grupo) return
    grupo.clearLayers()

    const limites: L.LatLngExpression[] = []

    if (centro) {
      /* Ponto roxo pequeno, por baixo dos marcadores das cidades (não esconde nenhum) */
      L.circleMarker([centro.lat, centro.lng], { radius: 7, color: '#ffffff', weight: 3, fillColor: '#7c55b8', fillOpacity: 1, interactive: false }).addTo(grupo)
      if (raioKm) {
        const circulo = L.circle([centro.lat, centro.lng], { radius: raioKm * 1000, color: '#d99a1e', weight: 2, dashArray: '6 6', fillOpacity: 0.06, interactive: false }).addTo(grupo)
        const b = circulo.getBounds()
        limites.push(b.getNorthWest(), b.getSouthEast())
      } else {
        limites.push([centro.lat, centro.lng])
      }
    }

    for (const p of pontos) {
      const ativo = p.chave === selecionado
      const marcador = L.marker([p.ponto.lat, p.ponto.lng], {
        icon: L.divIcon({
          className: `${styles.marcador} ${ativo ? styles.ativo : ''}`,
          html: `<span>${p.quantidade || ''}</span>`,
          iconSize: [30, 34],
          iconAnchor: [15, 34],
        }),
        title: p.rotulo,
        alt: p.rotulo,
        riseOnHover: true,
        /* A cidade escolhida e as com mais itens ficam por cima quando os marcadores se encostam */
        zIndexOffset: ativo ? 1000 : p.quantidade * 10,
      }).addTo(grupo)
      marcador.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        escolher.current?.(p.chave === selecionado ? null : p.chave)
      })
      /* Enter no marcador focado faz o mesmo que clicar */
      marcador.on('keypress', (e) => {
        const tecla = (e as L.LeafletKeyboardEvent).originalEvent.key
        if (tecla === 'Enter' || tecla === ' ') escolher.current?.(p.chave === selecionado ? null : p.chave)
      })
      if (!raioKm) limites.push([p.ponto.lat, p.ponto.lng])
    }

    const chave = JSON.stringify([limites, raioKm])
    if (chave === enquadrado.current) return
    enquadrado.current = chave
    if (limites.length === 1) m.setView(limites[0], 10)
    else if (limites.length > 1) m.fitBounds(L.latLngBounds(limites), { padding: [36, 36], maxZoom: 11 })
  }, [pontos, centro, raioKm, selecionado])

  return (
    <div className={styles.moldura}>
      <div ref={caixa} className={styles.mapa} style={{ height: altura }} role="region" aria-label={descricao} />
    </div>
  )
}
