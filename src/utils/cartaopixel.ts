/*
 * Cartões em pixel art para baixar e compartilhar (Retrospectiva do ano e Marcos comemorativos).
 * Desenha num canvas quadrado de 1080 px, o tamanho que as redes sociais aceitam sem cortar.
 */

export interface Cartao {
  /* Linha pequena no topo, ex.: "Retrospectiva 2026" */
  topo: string
  /* O destaque: um número ou uma palavra curta */
  destaque: string
  /* Frase embaixo do destaque */
  legenda: string
  /* Linha do rodapé, ex.: "Ana Freelancer · ContrateJá" */
  rodape: string
  cor?: 'ouro' | 'roxo' | 'verde' | 'ciano'
}

const LADO = 1080

const CORES = {
  ouro: ['#2a1a4a', '#ffc23d'],
  roxo: ['#1d0e3a', '#c88bff'],
  verde: ['#10302a', '#5fe0a0'],
  ciano: ['#0e2a3a', '#5ec4d6'],
} as const

/* Quebra a frase em linhas que cabem na largura */
function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const saida: string[] = []
  let atual = ''
  for (const palavra of texto.split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(teste).width > largura && atual) {
      saida.push(atual)
      atual = palavra
    } else atual = teste
  }
  if (atual) saida.push(atual)
  return saida
}

export async function desenharCartao(canvas: HTMLCanvasElement, c: Cartao) {
  canvas.width = LADO
  canvas.height = LADO
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await document.fonts?.ready.catch(() => {})
  const [fundo, destaque] = CORES[c.cor ?? 'ouro']

  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, LADO, LADO)

  /* Estrelinhas em pixel (sempre no mesmo lugar: o cartão sai igual toda vez) */
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 70; i++) {
    const x = (i * 397) % LADO
    const y = (i * 211 + (i % 7) * 53) % LADO
    const t = i % 5 === 0 ? 8 : 4
    ctx.fillRect(x, y, t, t)
  }

  /* Moldura grossa como os painéis do site */
  ctx.fillStyle = destaque
  ctx.fillRect(40, 40, LADO - 80, 16)
  ctx.fillRect(40, LADO - 56, LADO - 80, 16)
  ctx.fillRect(40, 40, 16, LADO - 80)
  ctx.fillRect(LADO - 56, 40, 16, LADO - 80)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '400 34px "Press Start 2P", monospace'
  ctx.fillText(c.topo, LADO / 2, 190)

  /* Destaque: diminui a letra até caber */
  let tamanho = 300
  ctx.font = `400 ${tamanho}px "Jersey 10", "Pixelify Sans", sans-serif`
  while (ctx.measureText(c.destaque).width > LADO - 200 && tamanho > 90) {
    tamanho -= 10
    ctx.font = `400 ${tamanho}px "Jersey 10", "Pixelify Sans", sans-serif`
  }
  ctx.fillStyle = '#1b1b30'
  ctx.fillText(c.destaque, LADO / 2 + 10, 560 + 10)
  ctx.fillStyle = destaque
  ctx.fillText(c.destaque, LADO / 2, 560)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 52px Inter, system-ui, sans-serif'
  linhas(ctx, c.legenda, LADO - 220).slice(0, 3).forEach((l, i) => ctx.fillText(l, LADO / 2, 690 + i * 66))

  ctx.font = '600 32px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(c.rodape, LADO / 2, LADO - 120)
}

/* Baixa o cartão como PNG (ou abre o compartilhar do celular, quando dá) */
export async function baixarCartao(c: Cartao, arquivo: string, compartilhar = false) {
  const canvas = document.createElement('canvas')
  await desenharCartao(canvas, c)
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
  if (!blob) return
  const file = new File([blob], arquivo, { type: 'image/png' })
  if (compartilhar && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: c.topo, text: `${c.destaque} ${c.legenda}` })
      return
    } catch {
      /* Cancelou: baixa normalmente */
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
