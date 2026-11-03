import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { transicaoLigada } from '../../utils/preferencias'
import styles from './transicao.module.css'

type Motivo = 'navegar' | 'acao'
/*
 * entrando: a floresta aparece e cobre a página
 * pronta: a página nova já está por baixo, esperando ser pintada
 * revelando: troca feita pelo código ou pelo voltar/avançar; a tela já nasce cheia
 * saindo: o portal brilha e a floresta abre
 */
type Fase = 'entrando' | 'pronta' | 'revelando' | 'saindo'

interface Estado {
  motivo: Motivo
  fase: Fase
  frase: string
  /* Muda a cada transição, para reiniciar os temporizadores */
  id: number
}

/* Tempos em ms (iguais aos do CSS) */
const ENTRADA = 520
const SAIDA = 460
/* Quanto a tela fica cheia quando a troca não veio de um clique */
const SEGURA_REVELAR = 320
const ATRASO_ACAO = 150
const MINIMO_ACAO = 700
/* Travas de segurança: a tela nunca fica presa */
const LIMITE_NAVEGAR = 2500
const LIMITE_ACAO = 15000

/* Desenho da cena (gerado por scripts/gerar-transicao.cjs) */
const LARGURA = 480
const ALTURA = 270
/* Centro do portal no desenho: fica o mais perto possível do meio da tela */
const PORTAL = { x: 240, y: 160 }
const TELA_PEQUENA = 640
const ARTE = ['fundo.png', 'meio.png', 'frente-esq.png', 'frente-dir.png', 'anim.svg', 'selo.svg']

/* Ligada nas Configurações (ou, sem escolha lá, junto com as Animações) */
const ativa = () => transicaoLigada()

/* Uma frase por transição, escolhida pelo destino (sem sortear a cada vez) */
function fraseDe(motivo: Motivo, destino = '') {
  if (motivo === 'acao') return 'Preparando o mundo'
  if (destino.includes('mensagens')) return 'Conectando os destinos'
  if (destino.includes('projetos') || destino.includes('historico') || destino.includes('andamento')) return 'Explorando novos territórios'
  return 'Atravessando o véu'
}

/*
 * Menor escala inteira que cobre a tela (pixels iguais, sem borrar e sem cortar a moldura de troncos).
 * O portal vai para o meio da tela até onde o desenho deixa; o selo acompanha o portal.
 */
function medidas() {
  const w = window.innerWidth
  const h = window.innerHeight
  const s = Math.max(1, Math.ceil(w / LARGURA), Math.ceil(h / ALTURA))
  const topo = Math.min(0, Math.max(h - ALTURA * s, h / 2 - PORTAL.y * s))
  return { s, esquerda: w / 2 - PORTAL.x * s, topo, portalY: topo + PORTAL.y * s, pequena: w < TELA_PEQUENA }
}

/*
 * Tela de transição: uma passagem pelo portal da floresta.
 * Ao clicar num link interno, a floresta cobre a página e só então a rota troca;
 * quando a página nova já foi pintada, o portal brilha e a floresta abre.
 */
export default function TransicaoPortal() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado | null>(null)
  const [caminhoVisto, setCaminhoVisto] = useState(pathname)
  const inicioAcao = useRef(0)

  /* A rota trocou: cobre a página nova (se ainda não estiver coberta) e prepara a saída */
  if (pathname !== caminhoVisto) {
    setCaminhoVisto(pathname)
    if (estado && estado.fase !== 'saindo') {
      setEstado({ ...estado, fase: 'pronta', id: estado.id + 1 })
    } else if (ativa()) {
      setEstado({ motivo: 'navegar', fase: 'revelando', frase: fraseDe('navegar', pathname), id: (estado?.id ?? 0) + 1 })
    }
  }

  /* Deixa a arte pronta antes da primeira transição */
  useEffect(() => {
    for (const nome of ARTE) new Image().src = `/transicao/${nome}`
  }, [])

  /* Segura o clique em links internos: a floresta cobre primeiro, a rota troca depois */
  useEffect(() => {
    let navegar: ReturnType<typeof setTimeout> | undefined
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = (e.target as Element | null)?.closest?.('a')
      if (!link || !link.href || (link.target && link.target !== '_self') || link.hasAttribute('download')) return
      if (link.closest('[data-sem-transicao]')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      if (!ativa()) return

      e.preventDefault()
      setEstado((atual) => ({ motivo: 'navegar', fase: 'entrando', frase: fraseDe('navegar', url.pathname), id: (atual?.id ?? 0) + 1 }))
      /* Vários cliques seguidos: vale o último */
      clearTimeout(navegar)
      navegar = setTimeout(() => navigate(url.pathname + url.search + url.hash), ENTRADA)
    }
    /* Captura: roda antes do Link do React Router */
    document.addEventListener('click', aoClicar, true)
    return () => {
      document.removeEventListener('click', aoClicar, true)
      clearTimeout(navegar)
    }
  }, [navigate])

  /* Ações na API (salvar, enviar...): a tela aparece só se demorar um pouco */
  useEffect(() => {
    let atraso: ReturnType<typeof setTimeout> | undefined
    const aoMudar = (e: Event) => {
      if (!ativa()) return
      const emAndamento = (e as CustomEvent<number>).detail
      clearTimeout(atraso)
      if (emAndamento > 0) {
        atraso = setTimeout(() => {
          inicioAcao.current = Date.now()
          setEstado((atual) => atual ?? { motivo: 'acao', fase: 'entrando', frase: fraseDe('acao'), id: 1 })
        }, ATRASO_ACAO)
      } else {
        atraso = setTimeout(
          () => setEstado((atual) => (atual && atual.motivo === 'acao' && atual.fase === 'entrando' ? { ...atual, fase: 'saindo' } : atual)),
          Math.max(0, MINIMO_ACAO - (Date.now() - inicioAcao.current))
        )
      }
    }
    window.addEventListener('api:acao', aoMudar)
    return () => {
      window.removeEventListener('api:acao', aoMudar)
      clearTimeout(atraso)
    }
  }, [])

  /* Andamento das fases */
  useEffect(() => {
    if (!estado) return
    const sair = () => setEstado((atual) => (atual && atual.id === estado.id ? { ...atual, fase: 'saindo' } : atual))

    if (estado.fase === 'pronta' || estado.fase === 'revelando') {
      /* Espera a página nova ser pintada (dois quadros) antes de abrir a floresta */
      let q1 = 0
      let q2 = 0
      const id = setTimeout(
        () => {
          q1 = requestAnimationFrame(() => {
            q2 = requestAnimationFrame(sair)
          })
        },
        estado.fase === 'revelando' ? SEGURA_REVELAR : 0
      )
      return () => {
        clearTimeout(id)
        cancelAnimationFrame(q1)
        cancelAnimationFrame(q2)
      }
    }
    if (estado.fase === 'saindo') {
      const id = setTimeout(() => setEstado((atual) => (atual && atual.id === estado.id ? null : atual)), SAIDA)
      return () => clearTimeout(id)
    }
    /* Entrando: se a rota não trocar (ou a ação não terminar), sai mesmo assim */
    const id = setTimeout(sair, estado.motivo === 'navegar' ? ENTRADA + LIMITE_NAVEGAR : LIMITE_ACAO)
    return () => clearTimeout(id)
  }, [estado])

  if (!estado) return null

  const { s, esquerda, topo, portalY, pequena } = medidas()
  const camada = (nome: string, classe = '') => <img className={`${styles.camada} ${classe}`} src={`/transicao/${nome}`} alt="" draggable={false} />
  const selo = 56 * Math.min(s, 3)

  return (
    <div className={`${styles.tela} ${styles[estado.fase]}`} data-movimento-livre role="status" aria-live="polite" aria-busy={estado.fase !== 'saindo'}>
      <div className={styles.palco} style={{ width: LARGURA * s, height: ALTURA * s, left: esquerda, top: topo }} aria-hidden="true">
        {camada('fundo.png', styles.fundo)}
        {camada('meio.png', styles.meio)}
        {camada('anim.svg')}
        {!pequena && camada('particulas.svg')}
        {camada('frente-esq.png', styles.esq)}
        {camada('frente-dir.png', styles.dir)}
      </div>
      <div className={styles.clarao} aria-hidden="true" />
      <img className={styles.selo} src="/transicao/selo.svg" alt="" style={{ width: selo, height: selo, top: portalY }} />
      <p className={styles.frase} style={{ top: portalY + selo / 2 + 18 }}>
        {estado.frase}
        <span className={styles.pontos} aria-hidden="true">...</span>
      </p>
    </div>
  )
}
