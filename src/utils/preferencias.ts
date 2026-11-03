/* Preferências do site (ficam salvas neste navegador) */
export type Tema = 'escuro' | 'claro'
/* "auto" segue a hora do dia: dia das 6h às 18h, noite no resto */
export type EscolhaTema = Tema | 'auto'
export type Clima = 'limpo' | 'chuva' | 'tempestade' | 'neve' | 'neblina'
/*
 * "real" segue o tempo de verdade na cidade da pessoa; "estacao" muda sozinho de vez em quando,
 * com o tempo mais comum em cada estação do ano (os dois em utils/climareal.ts)
 */
export type EscolhaClima = Clima | 'real' | 'estacao'

export interface Preferencias {
  tema: EscolhaTema
  /*
   * Tela de transição (portal da floresta) entre páginas e ações.
   * null = acompanha as Animações; true/false = escolha própria (ligada aparece mesmo com o resto parado)
   */
  transicao: boolean | null
  /* null = segue o sistema ("reduzir movimento"); true/false = escolha feita aqui, que vale mais que o sistema */
  animacoes: boolean | null
  /* Som ao chegar mensagem */
  som: boolean
  /* Clima no fundo */
  clima: EscolhaClima
  /* Som de chuva, vento e trovão acompanhando o clima */
  somAmbiente: boolean
  /* Acessibilidade: tamanho da letra, alto contraste e fonte comum no lugar da pixelada */
  fonte: TamanhoFonte
  contraste: boolean
  fonteSimples: boolean
  /* Para onde o login leva */
  paginaInicial: PaginaInicial
  /* Horário silencioso: sem plim e sem som de ambiente entre as horas escolhidas */
  silencio: boolean
  silencioDe: number
  silencioAte: number
  /* Acessibilidade: links sempre sublinhados e contorno grosso no que está com o foco do teclado */
  sublinharLinks: boolean
  focoForte: boolean
  /* Idioma dos textos principais (utils/idioma.ts) */
  idioma: Idioma
}

export type Idioma = 'pt' | 'en'

export type PaginaInicial = 'painel' | 'mensagens' | 'historico' | 'agenda'

export type TamanhoFonte = 'normal' | 'grande' | 'maior'

const CHAVE = 'preferencias'

const PADRAO: Preferencias = {
  tema: 'escuro', transicao: null, animacoes: null, som: true, clima: 'limpo', somAmbiente: false, fonte: 'normal', contraste: false, fonteSimples: false,
  paginaInicial: 'painel', silencio: false, silencioDe: 22, silencioAte: 7, sublinharLinks: false, focoForte: false, idioma: 'pt',
}

/* Está no horário silencioso agora? (o intervalo pode virar a noite: das 22h às 7h) */
export function emSilencio(p: Preferencias = lerPreferencias(), agora = new Date()) {
  if (!p.silencio || p.silencioDe === p.silencioAte) return false
  const h = agora.getHours()
  return p.silencioDe < p.silencioAte ? h >= p.silencioDe && h < p.silencioAte : h >= p.silencioDe || h < p.silencioAte
}

/* Caminho da página inicial escolhida (o painel é a área de cada papel) */
export function caminhoInicial(papel: string, p: Preferencias = lerPreferencias()) {
  if (papel === 'administrador' || p.paginaInicial === 'painel') return `/${papel}`
  return `/${papel}/${p.paginaInicial}`
}

const SISTEMA_REDUZIDO = '(prefers-reduced-motion: reduce)'

/*
 * Se o site se mexe. O que a pessoa escolheu nas Configurações manda; sem escolha, vale o sistema
 * (no Windows: Acessibilidade > Efeitos visuais > Efeitos de animação).
 */
export function movimentoLigado(p: Preferencias = lerPreferencias()) {
  return p.animacoes ?? !window.matchMedia(SISTEMA_REDUZIDO).matches
}

/* Se o portal aparece: a escolha própria dele, senão o mesmo que as Animações */
export function transicaoLigada(p: Preferencias = lerPreferencias()) {
  return p.transicao ?? movimentoLigado(p)
}

const COR_BARRA: Record<Tema, string> = { escuro: '#1b1b30', claro: '#fbf5ef' }

const NASCER = 6
const POR = 18

/* Esconde o site e mostra só o fundo (o FundoPixel escuta este evento) */
export const verSoFundo = () => window.dispatchEvent(new Event('ver-fundo'))

/* Fogos sobre o castelo (projeto concluído, nível novo) */
export const comemorar = () => window.dispatchEvent(new Event('comemorar'))

/*
 * Cenário global: o que o administrador supremo forçou para o site inteiro (null = cada um escolhe).
 * Vem do servidor por utils/cenarioglobal.ts; fica aqui porque o tema e o clima dependem dele.
 */
export interface CenarioGlobal {
  tema: Tema | null
  clima: Clima | null
  /* Hora em que o supremo soltou fogos (cada site solta uma vez) */
  fogos: number | null
  /* Faixa de aviso no topo de todas as páginas */
  aviso: string | null
}

export const CENARIO_LIVRE: CenarioGlobal = { tema: null, clima: null, fogos: null, aviso: null }
let cenario: CenarioGlobal = CENARIO_LIVRE

export const lerCenarioGlobal = () => cenario

export function definirCenarioGlobal(novo: CenarioGlobal) {
  if (JSON.stringify(novo) === JSON.stringify(cenario)) return
  cenario = novo
  reaplicar()
  window.dispatchEvent(new CustomEvent('cenario-global', { detail: novo }))
}

/* Tema que vale agora: o forçado pelo supremo, senão a escolha, resolvendo o "auto" pela hora local */
export function temaAtual(p: Preferencias, agora = new Date()): Tema {
  if (cenario.tema) return cenario.tema
  if (p.tema !== 'auto') return p.tema
  const h = agora.getHours()
  return h >= NASCER && h < POR ? 'claro' : 'escuro'
}

export function lerPreferencias(): Preferencias {
  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE) ?? '{}')
    /* Versão antiga guardava só a chuva ligada/desligada */
    if (!salvas.clima && salvas.chuva) salvas.clima = 'chuva'
    delete salvas.chuva
    return { ...PADRAO, ...salvas }
  } catch {
    return PADRAO
  }
}

export function aplicarPreferencias(p: Preferencias = lerPreferencias()) {
  const raiz = document.documentElement
  const tema = temaAtual(p)
  raiz.dataset.theme = tema === 'claro' ? 'light' : 'dark'
  raiz.dataset.movimento = movimentoLigado(p) ? 'normal' : 'reduzido'
  raiz.dataset.fonte = p.fonte
  raiz.dataset.contraste = p.contraste ? 'alto' : 'normal'
  raiz.dataset.fonteSimples = p.fonteSimples ? '1' : '0'
  raiz.dataset.sublinhar = p.sublinharLinks ? '1' : '0'
  raiz.dataset.foco = p.focoForte ? 'forte' : 'normal'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema])
}

export function salvarPreferencias(mudanca: Partial<Preferencias>) {
  const nova = { ...lerPreferencias(), ...mudanca }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(nova))
  } catch {
    /* Sem armazenamento: vale só nesta visita */
  }
  aplicarPreferencias(nova)
  window.dispatchEvent(new CustomEvent('preferencias', { detail: nova }))
  return nova
}

/* Avisa o site de novo (sem mudar nada salvo) quando algo de fora muda o resultado das preferências */
function reaplicar() {
  const p = lerPreferencias()
  aplicarPreferencias(p)
  window.dispatchEvent(new CustomEvent('preferencias', { detail: p }))
}

/* Sem escolha feita aqui, acompanha o sistema se a pessoa ligar ou desligar as animações por lá */
export function vigiarSistema() {
  window.matchMedia(SISTEMA_REDUZIDO).addEventListener('change', () => {
    if (lerPreferencias().animacoes === null) reaplicar()
  })
}

/* No modo "auto", confere a hora a cada minuto e troca o tema quando o sol nasce ou se põe */
export function vigiarHorario() {
  let visto = temaAtual(lerPreferencias())
  setInterval(() => {
    const agora = temaAtual(lerPreferencias())
    if (agora === visto) return
    visto = agora
    reaplicar()
  }, 60_000)
}
