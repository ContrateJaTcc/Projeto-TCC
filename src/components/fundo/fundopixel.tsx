import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { emSilencio, lerPreferencias, movimentoLigado, temaAtual, type Clima, type Preferencias } from '../../utils/preferencias'
import { useClimaEfetivo } from '../../utils/climareal'
import { tentarConquista } from '../../utils/conquistas'
import { useCenarioGlobal } from '../../utils/cenarioglobal'
import { somDoClima } from '../../utils/ambiente'
import Fogos from './fogos'
import { ALTURA, CAMADAS, LARGURA, type Tema } from './camadas'
import { Camadas, CamadasClima } from './cena'
import LuaFase from './luafase'
import SurpresaNaCamada from './surpresas'
import { CAMADA, useSurpresa } from './usesurpresa'
import { EfeitoTema, SobreposicaoEvento, EnfeitesDoEvento } from './enfeites'
import { eventoAtual } from '../../utils/eventos'
import { useTemaCenario } from '../../utils/temacenario'
import styles from './fundopixel.module.css'

/* Linha do desenho que fica logo abaixo do cabeçalho (topo da lua) */
const LINHA_FOCO = 36
/* Linhas que interessam mostrar: da lua até o chão da frente */
const LINHAS_IMPORTANTES = 254
const CABECALHO = 80

/* Abaixo desta largura, menos coisas se mexendo e nada de parallax com o mouse */
const TELA_PEQUENA = 640
/* Duração da troca suave entre noite e dia (igual ao CSS) */
const TROCA_TEMA = 700
/* Quanto tempo os fogos ficam na tela (o último estouro termina antes disso) */
const DURACAO_FOGOS = 5000

/* Véu extra por clima: escurece com chuva, mais ainda com tempestade */
const VEU_CLIMA: Record<Clima, string> = { limpo: '', chuva: 'veuChuva', tempestade: 'veuTempestade', neve: '', neblina: '' }

/* Cor do topo do céu (preenche telas mais altas que o desenho) */
const TOPO_CEU: Record<Tema, string> = { escuro: '#0b0b13', claro: '#4a3c8a' }

/*
 * Modo Auto: na última hora antes do pôr do sol a noite vai aparecendo por cima,
 * e na primeira hora depois do nascer ela vai sumindo (às 18h e às 6h o tema troca de vez)
 */
function noiteChegando(agora: Date) {
  const h = agora.getHours() + agora.getMinutes() / 60
  if (h >= 17 && h < 18) return h - 17
  if (h >= 6 && h < 7) return 7 - h
  return 0
}

const AREA_PRIVADA = /^\/(freelancer|contratante|administrador)(\/|$)/
/* Páginas públicas com o mesmo tema da home */
const PUBLICA_COM_TEMA = /^\/(p\/[^/]+|certificado\/[^/]+|sobre)\/?$/

/* Escala inteira que cobre a tela: cada pixel do desenho vira um quadrado igual */
function escalaPara(largura: number, altura: number) {
  return Math.max(1, Math.ceil(largura / LARGURA), Math.ceil(altura / ALTURA))
}

/*
 * Topo do desenho: a lua logo abaixo do cabeçalho, sem deixar buraco embaixo.
 * Em telas muito largas (ultrawide) cabem menos linhas: o corte desce um pouco
 * para não perder a floresta e o chão.
 */
function topoPara(escala: number, altura: number, cabecalho = CABECALHO) {
  const visiveis = (altura - cabecalho) / escala
  const linha = LINHA_FOCO + Math.max(0, LINHAS_IMPORTANTES - visiveis) * 0.5
  return Math.min(0, Math.max(altura - ALTURA * escala, cabecalho - linha * escala))
}

/* Fundo pixel art com parallax (fica atrás do site inteiro) */
export default function FundoPixel() {
  const { pathname } = useLocation()
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias)
  const [tela, setTela] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const camadas = useRef<(HTMLDivElement | null)[]>([])
  /* Camadas da noite que aparecem por cima no anoitecer (andam junto no parallax) */
  const camadasNoite = useRef<(HTMLDivElement | null)[]>([])
  /* Modo "só o fundo": o cenário passa por cima do site inteiro */
  const [soFundo, setSoFundo] = useState(false)

  const escala = escalaPara(tela.w, tela.h)
  const topo = topoPara(escala, tela.h, soFundo ? 0 : CABECALHO)
  /* Parte do desenho escondida embaixo: é o quanto as camadas podem subir */
  const folga = topo + ALTURA * escala - tela.h
  const telaPequena = tela.w < TELA_PEQUENA

  /* Modo claro na área logada e na home, como o resto do tema ("auto" já vem resolvido pela hora) */
  const tema: Tema = temaAtual(prefs) === 'claro' && (AREA_PRIVADA.test(pathname) || pathname === '/' || PUBLICA_COM_TEMA.test(pathname)) ? 'claro' : 'escuro'

  /* Com a aba escondida nada se mexe: as animações saem e voltam quando a pessoa volta */
  const [oculta, setOculta] = useState(() => document.hidden)
  const movimento = movimentoLigado(prefs)
  const animar = movimento && !oculta
  /* O supremo pode forçar o clima de todo mundo; o tema forçado já vem dentro de temaAtual */
  const cenario = useCenarioGlobal()
  const clima = useClimaEfetivo(cenario.clima ?? prefs.clima)

  const surpresa = useSurpresa(animar)
  /* Evento do ano (Halloween, Natal...) e o cenário comprado na loja */
  const evento = eventoAtual()?.codigo ?? null
  const temaCenario = useTemaCenario()

  /* Anoitecer gradual: só no Auto, sem tema forçado e com o pôr do sol na tela; confere a cada minuto */
  const auto = prefs.tema === 'auto' && !cenario.tema && tema === 'claro'
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [auto])
  const noite = auto ? noiteChegando(agora) : 0
  const comNoite = noite > 0

  /* Por cima das camadas: a lua na fase de hoje (só à noite) e a surpresa da vez */
  const extras: Record<string, React.ReactNode> = {}
  for (const camada of new Set(Object.values(CAMADA))) extras[camada] = <SurpresaNaCamada surpresa={surpresa} camada={camada} tema={tema} />
  if (tema === 'escuro') extras.ceu = <>{<LuaFase data={agora} />}{extras.ceu}</>
  if (evento) {
    for (const c of ['ceu', 'castelo', 'frente']) extras[c] = <>{extras[c]}<EnfeitesDoEvento codigo={evento} camada={c} /></>
  }

  /* Som do clima: só com a opção ligada, a aba à vista e fora do horário silencioso */
  const silencioso = emSilencio(prefs)
  useEffect(() => {
    somDoClima(prefs.somAmbiente && !oculta && !silencioso ? clima : null)
  }, [prefs.somAmbiente, oculta, clima, silencioso])

  /* Fogos: cada comemoração ganha um número novo (a hora), para a animação começar do zero; 0 = sem fogos */
  const [festa, setFesta] = useState(0)

  /* Ao trocar de tema, o anterior fica por cima um instante e some aos poucos */
  const [temaVisto, setTemaVisto] = useState<Tema>(tema)
  const [anterior, setAnterior] = useState<Tema | null>(null)
  if (tema !== temaVisto) {
    setAnterior(temaVisto)
    setTemaVisto(tema)
  }
  useEffect(() => {
    if (!anterior) return
    const id = setTimeout(() => setAnterior(null), TROCA_TEMA)
    return () => clearTimeout(id)
  }, [anterior])

  useEffect(() => {
    const aoMudar = (e: Event) => setPrefs((e as CustomEvent<Preferencias>).detail)
    const aoRedimensionar = () => setTela({ w: window.innerWidth, h: window.innerHeight })
    const abrir = () => setSoFundo(true)
    const aoMudarVisibilidade = () => setOculta(document.hidden)
    const aoComemorar = () => {
      if (movimentoLigado()) setFesta(Date.now())
    }
    window.addEventListener('preferencias', aoMudar)
    window.addEventListener('resize', aoRedimensionar)
    window.addEventListener('ver-fundo', abrir)
    window.addEventListener('comemorar', aoComemorar)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      window.removeEventListener('preferencias', aoMudar)
      window.removeEventListener('resize', aoRedimensionar)
      window.removeEventListener('ver-fundo', abrir)
      window.removeEventListener('comemorar', aoComemorar)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [])

  /* Com o navegador folgado, já baixa a arte do outro tema: a troca entre noite e dia não pisca */
  useEffect(() => {
    const outro: Tema = tema === 'claro' ? 'escuro' : 'claro'
    const baixar = () => {
      for (const c of CAMADAS) {
        new Image().src = `/fundo/${c.nome}-${outro}.png`
        if (c.anim) new Image().src = `/fundo/${c.nome}-anim-${outro}.svg`
      }
    }
    const ocioso = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500))
    const id = ocioso(baixar)
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id)
  }, [tema])

  /* Os fogos saem da tela depois do último estouro */
  useEffect(() => {
    if (!festa) return
    const id = setTimeout(() => setFesta(0), DURACAO_FOGOS)
    return () => clearTimeout(id)
  }, [festa])

  /* Esc fecha o modo "só o fundo" (e quem usa acha a conquista secreta do explorador) */
  useEffect(() => {
    if (!soFundo) return
    tentarConquista('explorador')
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSoFundo(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [soFundo])

  /*
   * Parallax: ao rolar, as camadas de perto sobem mais e revelam o chão;
   * com o mouse, elas andam alguns pixels para os lados (só em computador).
   * Tudo anda em pixels inteiros do desenho, para não borrar a pixel art.
   */
  useEffect(() => {
    let quadro = 0
    const mouse = { atual: 0, alvo: 0 }
    const usarMouse = movimento && !telaPequena && window.matchMedia('(pointer: fine)').matches

    const mover = () => {
      quadro = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progresso = movimento && !soFundo && max > 0 ? Math.min(1, window.scrollY / max) : 0
      /* O mouse é seguido com atraso, para o movimento sair macio */
      mouse.atual += (mouse.alvo - mouse.atual) * 0.08
      if (Math.abs(mouse.alvo - mouse.atual) < 0.003) mouse.atual = mouse.alvo
      CAMADAS.forEach((c, i) => {
        const x = Math.round(-mouse.atual * c.ponteiro) * escala
        const y = -Math.round((progresso * c.k * folga) / escala) * escala
        for (const el of [camadas.current[i], camadasNoite.current[i]]) {
          if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        }
      })
      if (mouse.atual !== mouse.alvo) pedir()
    }
    const pedir = () => {
      if (!quadro) quadro = requestAnimationFrame(mover)
    }
    const aoMoverMouse = (e: PointerEvent) => {
      mouse.alvo = (e.clientX / window.innerWidth) * 2 - 1
      pedir()
    }

    mover()
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    if (usarMouse) window.addEventListener('pointermove', aoMoverMouse, { passive: true })
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
      window.removeEventListener('pointermove', aoMoverMouse)
    }
  }, [escala, folga, movimento, pathname, soFundo, telaPequena, tema, comNoite])

  const estiloPalco = {
    width: LARGURA * escala,
    height: ALTURA * escala,
    top: topo,
    marginLeft: (-LARGURA * escala) / 2,
    '--s': escala,
  } as React.CSSProperties

  return (
    <>
    <div
      className={`${styles.fundo} ${soFundo ? styles.soFundo : ''}`}
      style={{ backgroundColor: TOPO_CEU[tema] }}
      aria-hidden={!soFundo}
      onClick={() => setSoFundo(false)}
    >
      <div className={styles.palco} style={estiloPalco}>
        <Camadas
          tema={tema}
          animar={animar}
          telaPequena={telaPequena}
          refs={camadas}
          noCeu={festa > 0 && <Fogos key={festa} />}
          extras={extras}
        />
        {/* Neblina andando sobre a cena; com as animações desligadas vira um véu parado (ver abaixo) */}
        {clima === 'neblina' && animar && <img className={styles.neblina} src={`/fundo/neblina-${tema}.svg`} alt="" draggable={false} />}
      </div>
      {noite > 0 && (
        <div className={`${styles.palco} ${styles.crepusculo}`} style={{ ...estiloPalco, opacity: noite }}>
          <Camadas tema="escuro" animar={false} telaPequena={telaPequena} refs={camadasNoite} extras={{ ceu: <LuaFase data={agora} /> }} />
        </div>
      )}
      {anterior && (
        <div key={anterior} className={`${styles.palco} ${styles.saindo}`} style={estiloPalco}>
          <Camadas tema={anterior} animar={false} telaPequena={telaPequena} />
        </div>
      )}

      <CamadasClima clima={clima} tema={tema} animar={animar} escala={escala} />
      <SobreposicaoEvento codigo={evento} animar={animar} escala={escala} />
      <EfeitoTema tema={temaCenario} cena={tema} animar={animar} escala={escala} />
      {!soFundo && <div className={`${styles.veu} ${VEU_CLIMA[clima] ? styles[VEU_CLIMA[clima]] : ''}`} />}
      {soFundo && <p className={styles.dica}>Clique ou aperte Esc para voltar</p>}
    </div>

    {!soFundo && (
      <button type="button" className={styles.olho} onClick={() => setSoFundo(true)} title="Ver só o fundo" aria-label="Ver só o fundo">
        <Eye size={18} strokeWidth={2.2} />
      </button>
    )}
    </>
  )
}
