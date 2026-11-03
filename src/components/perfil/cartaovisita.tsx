import { useEffect, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import { Download, Link2, X, IdCard } from 'lucide-react'
import { useToast } from '../../context/useToast'
import { linkPerfilPublico } from '../../utils/perfilpublico'
import styles from './perfil.module.css'

interface Props {
  usuId: number
  nome: string
  foto: string | null
  nivel?: number
  areas: string[]
  nota?: number
  aoFechar: () => void
}

const LARGURA = 640
const ALTURA = 360

/* Imagem da foto (data URI ou endereço com CORS); sem ela, o cartão usa as iniciais */
function carregarImagem(src: string) {
  return new Promise<HTMLImageElement | null>((pronto) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => pronto(img)
    img.onerror = () => pronto(null)
    img.src = src
  })
}

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/* Corta o texto para caber na largura, com reticências */
function caber(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  if (ctx.measureText(texto).width <= largura) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > largura) t = t.slice(0, -1)
  return `${t}…`
}

async function desenhar(canvas: HTMLCanvasElement, p: Props, link: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await document.fonts?.ready.catch(() => {})
  ctx.imageSmoothingEnabled = false

  /* Céu noturno em faixas, borda pixel dupla */
  const faixas = ['#0b0b13', '#131321', '#1b1b30', '#212139', '#272744']
  faixas.forEach((cor, i) => {
    ctx.fillStyle = cor
    ctx.fillRect(0, (ALTURA / faixas.length) * i, LARGURA, ALTURA / faixas.length + 1)
  })
  ctx.fillStyle = '#f2d3ab'
  for (const [x, y] of [[40, 30], [300, 22], [520, 60], [470, 300], [90, 320], [200, 50]]) ctx.fillRect(x, y, 3, 3)
  ctx.strokeStyle = '#f2d3ab'
  ctx.lineWidth = 6
  ctx.strokeRect(9, 9, LARGURA - 18, ALTURA - 18)
  ctx.strokeStyle = '#8b6d9c'
  ctx.lineWidth = 3
  ctx.strokeRect(20, 20, LARGURA - 40, ALTURA - 40)

  /* Rosto */
  const img = p.foto ? await carregarImagem(p.foto) : null
  ctx.fillStyle = '#494d7e'
  ctx.fillRect(40, 48, 120, 120)
  if (img) ctx.drawImage(img, 44, 52, 112, 112)
  else {
    ctx.fillStyle = '#383a61'
    ctx.fillRect(44, 52, 112, 112)
    ctx.fillStyle = '#fbf5ef'
    ctx.font = '700 44px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(iniciais(p.nome), 100, 110)
  }

  /* Nome, nível e áreas */
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#c69fa5'
  ctx.font = '400 15px "Press Start 2P", monospace'
  ctx.fillText('CONTRATE JÁ', 180, 66)
  ctx.fillStyle = '#fbf5ef'
  ctx.font = '400 50px "Jersey 10", "Pixelify Sans", Inter, sans-serif'
  ctx.fillText(caber(ctx, p.nome, 260), 180, 118)
  ctx.fillStyle = '#f2d3ab'
  ctx.font = '700 17px Inter, system-ui, sans-serif'
  const linha = ['Freelancer', p.nivel ? `nível ${p.nivel}` : null, p.nota ? `★ ${p.nota.toLocaleString('pt-BR')}` : null].filter(Boolean).join(' · ')
  ctx.fillText(linha, 180, 148)
  ctx.fillStyle = '#e6dadb'
  ctx.font = '500 15px Inter, system-ui, sans-serif'
  ctx.fillText(caber(ctx, p.areas.join(' · ') || 'Portfólio e avaliações no link', 260), 180, 176)

  /* Link escrito, para quem não tem leitor de QR */
  ctx.fillStyle = '#b3a2bc'
  ctx.font = '500 13px Inter, system-ui, sans-serif'
  ctx.fillText(caber(ctx, link.replace(/^https?:\/\//, ''), 400), 40, 312)
  ctx.fillStyle = '#fbf5ef'
  ctx.font = '700 15px Inter, system-ui, sans-serif'
  ctx.fillText('Aponte a câmera para ver meu perfil', 40, 290)

  /* QR code em quadrados duros, com margem clara */
  const qr = qrcode(0, 'M')
  qr.addData(link)
  qr.make()
  const n = qr.getModuleCount()
  const lado = 150
  const celula = Math.floor(lado / n)
  const real = celula * n
  const x0 = LARGURA - 40 - real - 12
  const y0 = ALTURA - 40 - real - 12
  ctx.fillStyle = '#fbf5ef'
  ctx.fillRect(x0 - 12, y0 - 12, real + 24, real + 24)
  ctx.fillStyle = '#1b1b30'
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(x0 + c * celula, y0 + r * celula, celula, celula)
}

/* Cartão de visita: imagem para baixar e mandar, com QR code do perfil público */
export default function CartaoVisita(props: Props) {
  const toast = useToast()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pronto, setPronto] = useState(false)
  const link = linkPerfilPublico(props.usuId, props.nome)

  useEffect(() => {
    if (!canvas.current) return
    let vivo = true
    desenhar(canvas.current, props, link).then(() => vivo && setPronto(true))
    return () => {
      vivo = false
    }
  }, [props, link])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && props.aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [props])

  function baixar() {
    if (!canvas.current) return
    const a = document.createElement('a')
    a.href = canvas.current.toDataURL('image/png')
    a.download = `cartao-${props.nome.split(' ')[0].toLowerCase()}-contrateja.png`
    a.click()
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      toast.mostrar('Link do seu perfil copiado!')
    } catch {
      toast.mostrar('Não deu para copiar o link.', 'erro')
    }
  }

  return (
    <div className={styles.modalVeu} onPointerDown={(e) => e.target === e.currentTarget && props.aoFechar()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-cartao">
        <div className={styles.editorTopo}>
          <strong id="titulo-cartao"><IdCard size={16} strokeWidth={2.2} /> Cartão de visita</strong>
          <button type="button" onClick={props.aoFechar} aria-label="Fechar o cartão"><X size={16} strokeWidth={2.4} /></button>
        </div>
        <canvas ref={canvas} width={LARGURA} height={ALTURA} className={styles.cartaoCanvas} role="img" aria-label={`Cartão de visita de ${props.nome} com QR code para o perfil público`} />
        <p className={styles.cartaoDica}>Mande a imagem no WhatsApp, coloque no Instagram ou imprima: o QR code abre o seu perfil público.</p>
        <div className={styles.cartaoAcoes}>
          <button type="button" className={styles.botaoPequeno} onClick={copiar}><Link2 size={15} strokeWidth={2.4} /> Copiar link</button>
          <button type="button" className={styles.usarAvatar} onClick={baixar} disabled={!pronto}><Download size={15} strokeWidth={2.4} /> Baixar imagem</button>
        </div>
      </div>
    </div>
  )
}
