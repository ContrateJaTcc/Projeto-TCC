import type { Clima } from './preferencias'

/*
 * Som ambiente do clima, sintetizado na hora (sem arquivos de áudio):
 * chuva = chiado filtrado; tempestade = chuva mais forte, ronco grave e trovões de vez em quando;
 * neve e neblina = vento que sobe e desce devagar; tempo limpo = vento fraco, corvos de vez em quando
 * e o crepitar das tochas. Tudo baixinho, por baixo do site.
 */

let contexto: AudioContext | null = null
let ruido: AudioBuffer | null = null
/* O que está tocando agora: o volume geral (para sumir aos poucos) e como parar tudo */
let atual: { saida: GainNode; parar: () => void } | null = null
let pedido: Clima | null = null

const VOLUME = 0.9
const ENTRADA = 1.5
const SAIDA = 1

function prepararContexto() {
  contexto ??= new AudioContext()
  if (!ruido) {
    /* 2 segundos de chiado branco, repetidos sem parar */
    ruido = contexto.createBuffer(1, contexto.sampleRate * 2, contexto.sampleRate)
    const dados = ruido.getChannelData(0)
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1
  }
  return contexto
}

function fonteDeRuido(ctx: AudioContext) {
  const fonte = ctx.createBufferSource()
  fonte.buffer = ruido
  fonte.loop = true
  return fonte
}

function filtro(ctx: AudioContext, tipo: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter()
  f.type = tipo
  f.frequency.value = freq
  f.Q.value = q
  return f
}

function ganho(ctx: AudioContext, valor: number) {
  const g = ctx.createGain()
  g.gain.value = valor
  return g
}

/* Chiado de chuva: corta os graves e os agudos demais */
function chuva(ctx: AudioContext, saida: AudioNode, forca: number) {
  const fonte = fonteDeRuido(ctx)
  fonte.connect(filtro(ctx, 'highpass', 900)).connect(filtro(ctx, 'lowpass', 5200)).connect(ganho(ctx, forca)).connect(saida)
  fonte.start()
  return [fonte]
}

/* Vento: faixa estreita de ruído com o volume subindo e descendo devagar */
function vento(ctx: AudioContext, saida: AudioNode, freq: number, forca: number) {
  const fonte = fonteDeRuido(ctx)
  const volume = ganho(ctx, forca)
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.08
  lfo.connect(ganho(ctx, forca * 0.7)).connect(volume.gain)
  fonte.connect(filtro(ctx, 'bandpass', freq, 0.9)).connect(volume).connect(saida)
  fonte.start()
  lfo.start()
  return [fonte, lfo]
}

/* Trovão: estouro grave que demora a sumir; volta a cada 12 a 28 segundos */
function trovoes(ctx: AudioContext, saida: AudioNode) {
  let id = 0
  const trovejar = () => {
    const fonte = fonteDeRuido(ctx)
    const volume = ganho(ctx, 0)
    const agora = ctx.currentTime
    volume.gain.linearRampToValueAtTime(0.35, agora + 0.08)
    volume.gain.exponentialRampToValueAtTime(0.001, agora + 3.5)
    fonte.connect(filtro(ctx, 'lowpass', 180 + Math.random() * 160)).connect(volume).connect(saida)
    fonte.start(agora)
    fonte.stop(agora + 3.6)
    id = window.setTimeout(trovejar, 12000 + Math.random() * 16000)
  }
  id = window.setTimeout(trovejar, 4000)
  return () => window.clearTimeout(id)
}

/* Corvo: um "cráá" rouco (onda dente de serra caindo de tom), uma a três vezes; volta a cada 18 a 40 segundos */
function corvos(ctx: AudioContext, saida: AudioNode) {
  let id = 0
  const crocitar = () => {
    const vezes = 1 + Math.floor(Math.random() * 3)
    for (let k = 0; k < vezes; k++) {
      const inicio = ctx.currentTime + k * 0.42
      const voz = ctx.createOscillator()
      voz.type = 'sawtooth'
      voz.frequency.setValueAtTime(620 + Math.random() * 60, inicio)
      voz.frequency.exponentialRampToValueAtTime(360, inicio + 0.28)
      const volume = ganho(ctx, 0)
      volume.gain.linearRampToValueAtTime(0.035, inicio + 0.03)
      volume.gain.exponentialRampToValueAtTime(0.001, inicio + 0.3)
      voz.connect(filtro(ctx, 'bandpass', 1100, 1.2)).connect(volume).connect(saida)
      voz.start(inicio)
      voz.stop(inicio + 0.32)
    }
    id = window.setTimeout(crocitar, 18000 + Math.random() * 22000)
  }
  id = window.setTimeout(crocitar, 6000)
  return () => window.clearTimeout(id)
}

/* Tocha crepitando: estalinhos curtos de chiado em tempos irregulares */
function tochas(ctx: AudioContext, saida: AudioNode) {
  let id = 0
  const estalar = () => {
    const agora = ctx.currentTime
    const fonte = fonteDeRuido(ctx)
    const volume = ganho(ctx, 0)
    volume.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.014, agora + 0.004)
    volume.gain.exponentialRampToValueAtTime(0.0005, agora + 0.05)
    fonte.connect(filtro(ctx, 'bandpass', 2200 + Math.random() * 1800, 1.5)).connect(volume).connect(saida)
    fonte.start(agora, Math.random())
    fonte.stop(agora + 0.06)
    id = window.setTimeout(estalar, 60 + Math.random() * 380)
  }
  id = window.setTimeout(estalar, 500)
  return () => window.clearTimeout(id)
}

function montar(ctx: AudioContext, clima: Clima, saida: AudioNode): () => void {
  const fontes: AudioScheduledSourceNode[] = []
  let pararTrovoes = () => {}
  let pararNoite = () => {}
  /* Tempo limpo: vento fraquinho, corvos de vez em quando e as tochas do castelo crepitando */
  if (clima === 'limpo') {
    fontes.push(...vento(ctx, saida, 320, 0.018))
    const pararCorvos = corvos(ctx, saida)
    const pararTochas = tochas(ctx, saida)
    pararNoite = () => {
      pararCorvos()
      pararTochas()
    }
  }
  if (clima === 'chuva') fontes.push(...chuva(ctx, saida, 0.05))
  if (clima === 'tempestade') {
    fontes.push(...chuva(ctx, saida, 0.08))
    const ronco = fonteDeRuido(ctx)
    ronco.connect(filtro(ctx, 'lowpass', 120)).connect(ganho(ctx, 0.05)).connect(saida)
    ronco.start()
    fontes.push(ronco)
    pararTrovoes = trovoes(ctx, saida)
  }
  if (clima === 'neve') fontes.push(...vento(ctx, saida, 420, 0.035))
  if (clima === 'neblina') fontes.push(...vento(ctx, saida, 260, 0.03))
  return () => {
    pararTrovoes()
    pararNoite()
    for (const f of fontes) f.stop()
  }
}

/* Some aos poucos com o que está tocando */
function soltarAtual() {
  if (!atual || !contexto) return
  const { saida, parar } = atual
  const agora = contexto.currentTime
  saida.gain.cancelScheduledValues(agora)
  saida.gain.setValueAtTime(saida.gain.value, agora)
  saida.gain.linearRampToValueAtTime(0, agora + SAIDA)
  window.setTimeout(parar, SAIDA * 1000 + 50)
  atual = null
}

function comecar(clima: Clima) {
  soltarAtual()
  try {
    const ctx = prepararContexto()
    const saida = ganho(ctx, 0)
    saida.connect(ctx.destination)
    saida.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + ENTRADA)
    atual = { saida, parar: montar(ctx, clima, saida) }
  } catch {
    /* Navegador sem áudio */
  }
}

/*
 * O navegador só deixa tocar som depois que a pessoa clica ou aperta uma tecla:
 * até lá o pedido fica guardado e começa no primeiro gesto.
 */
function aoPrimeiroGesto() {
  window.removeEventListener('pointerdown', aoPrimeiroGesto)
  window.removeEventListener('keydown', aoPrimeiroGesto)
  void prepararContexto().resume()
  if (pedido) comecar(pedido)
}

/* Toca o som do clima (ou nada, com null) */
export function somDoClima(clima: Clima | null) {
  if (clima === pedido) return
  pedido = clima
  if (!clima) return soltarAtual()
  if (contexto?.state === 'running') return comecar(clima)
  /* Já houve clique nesta página (ex.: na própria chave): dá para começar agora */
  if (navigator.userActivation?.hasBeenActive) return void prepararContexto().resume().then(() => pedido && comecar(pedido))
  window.addEventListener('pointerdown', aoPrimeiroGesto)
  window.addEventListener('keydown', aoPrimeiroGesto)
}
