import { ALTURA, LARGURA } from './camadas'
import styles from './fundopixel.module.css'
import { faseDaLua, iluminacao } from '../../utils/conquistas'

/* Lua do desenho (igual a LUA em scripts/gerar-fundo.cjs) */
const LUA = { x: 246, y: 86, r: 40 }


/*
 * Pedaço apagado da lua, linha por linha, em pixels inteiros do desenho.
 * Visto do Brasil (hemisfério sul) a crescente acende pela esquerda e a minguante fica acesa à direita.
 * Perto da cheia não desenha nada: fica a lua inteira do desenho.
 */
function sombra(fase: number) {
  const { x: mx, y: my, r } = LUA
  const escura: string[] = []
  const borda: string[] = []
  for (let y = my - r; y < my + r; y++) {
    const dy = y + 0.5 - my
    const w = Math.sqrt(Math.max(0, r * r - dy * dy))
    if (w < 0.5) continue
    /* Parte acesa da linha, em distância do centro */
    const crescente = fase < 0.5
    const limite = crescente ? -w * Math.cos(2 * Math.PI * fase) : w * Math.cos(2 * Math.PI * fase)
    const [de, ate] = crescente ? [-w, limite] : [limite, w]
    for (let x = Math.floor(mx - w); x < Math.ceil(mx + w); x++) {
      const dx = x + 0.5 - mx
      if (Math.abs(dx) > w) continue
      if (dx >= de && dx <= ate) continue
      const longe = Math.min(Math.abs(dx - de), Math.abs(dx - ate))
      /* Um pixel de meia-sombra no limite, alternado como pontilhado */
      if (longe < 1.5 && (x + y) % 2 === 0) borda.push(`M${x} ${y}h1v1h-1z`)
      else escura.push(`M${x} ${y}h1v1h-1z`)
    }
  }
  return { escura: escura.join(''), borda: borda.join('') }
}

export default function LuaFase({ data }: { data?: Date }) {
  const fase = faseDaLua(data)
  const caminhos = iluminacao(fase) > 0.96 ? null : sombra(fase)
  if (!caminhos) return null
  return (
    <svg className={styles.extra} viewBox={`0 0 ${LARGURA} ${ALTURA}`} shapeRendering="crispEdges" aria-hidden="true">
      {/* O lado apagado ainda deixa ver um pouco das manchas (luz cinzenta da Terra) */}
      <path d={caminhos.escura} fill="#131321" fillOpacity={0.86} />
      <path d={caminhos.borda} fill="#131321" fillOpacity={0.5} />
    </svg>
  )
}
