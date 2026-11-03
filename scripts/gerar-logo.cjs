/*
 * Logo em pixel art: chapéu de bruxa com fivela e duas faíscas, em cores vivas
 * (roxo vivo no chapéu, faixa roxa escura e fivela dourada).
 * Saída: src/components/imgs/logo.png e public/favicon.png
 * Uso: node scripts/gerar-logo.cjs
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const W = 36
const H = 28

const C = {
  contorno: '#140b20',
  brilho: '#a47ce6', luz: '#7c52c4', roxo: '#5b349a', sombra: '#412478', fundo: '#2c1852',
  faixa: '#1c0d33', faixaLuz: '#3b1d6e', faixaBrilho: '#5b2fa0',
  ouro: '#f0a83a', ouroLuz: '#ffe07a', ouroSombra: '#b46e24',
  faisca: '#ffd25a', faiscaRoxa: '#c49bff',
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

/* Grade de cores (null = transparente) */
const g = Array.from({ length: H }, () => Array(W).fill(null))
const marca = Array.from({ length: H }, () => Array(W).fill(''))
const pintar = (x, y, c, m = '') => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  g[y][x] = c
  if (m) marca[y][x] = m
}

function dentroPoligono(pts, x, y) {
  let d = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d
  }
  return d
}

const OX = 2
const OY = 1

/* Aba: elipse larga e achatada */
const aba = (x, y) => ((x - 15.5 - OX) / 14.6) ** 2 + ((y - 21.6 - OY) / 4.1) ** 2 <= 1

/* Cone levemente inclinado para a direita */
const cone = [[7.8, 20], [10.2, 12], [12.6, 6.2], [15.4, 2.2], [18.4, 2.2], [19.6, 6.4], [20.4, 12], [23.2, 20]].map(([x, y]) => [x + OX, y + OY])

/* Ponta torta: traço que vai afinando, curvando para a direita e para baixo */
const ponta = [[16.2, 3.4, 3.4], [19.4, 2.6, 2.9], [22.4, 3.6, 2.3], [24.4, 5.8, 1.8], [25, 8.6, 1.3]].map(([x, y, w]) => [x + OX, y + OY, w])
function naPonta(x, y) {
  for (let i = 1; i < ponta.length; i++) {
    const [ax, ay, aw] = ponta[i - 1]
    const [bx, by, bw] = ponta[i]
    const dx = bx - ax
    const dy = by - ay
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    if (Math.hypot(x - ax - u * dx, y - ay - u * dy) <= (aw + (bw - aw) * u) / 2) return { u: (i - 1 + u) / (ponta.length - 1), lado: (x - ax - u * dx) * -dy + (y - ay - u * dy) * dx }
  }
  return null
}

const FAIXA = [16.4 + OY, 20.4 + OY]

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const px = x + 0.5
    const py = y + 0.5
    if (aba(px, py)) {
      /* Embaixo e à esquerda a aba pega luz; à direita fica na sombra */
      const u = (px - OX - 0.9) / 29.2
      const baixo = (py - OY - 21.6) / 4.1
      let c = C.roxo
      if (u > 0.74) c = C.sombra
      else if (baixo > 0.35 && u < 0.5) c = C.luz
      if (baixo > 0.35 && u < 0.18 && bayer(x, y) > 0.3) c = C.brilho
      if (u > 0.9 || (baixo > 0.55 && u > 0.6)) c = C.fundo
      pintar(x, y, c, 'aba')
    }
  }
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const px = x + 0.5
    const py = y + 0.5
    if (dentroPoligono(cone, px, py) && py < FAIXA[1]) {
      /* Posição dentro da largura do cone nesta linha */
      let esq = px
      let dir = px
      while (dentroPoligono(cone, esq - 1, py)) esq--
      while (dentroPoligono(cone, dir + 1, py)) dir++
      const u = (px - esq) / Math.max(1, dir - esq)
      let c = C.roxo
      if (u < 0.16) c = C.luz
      else if (u > 0.36 && u < 0.5) c = C.luz
      if (u > 0.4 && u < 0.47 && py > 4 && py < 15) c = C.brilho
      if (u > 0.72) c = C.sombra
      if (u > 0.9) c = C.fundo
      pintar(x, y, c, 'cone')
      if (py >= FAIXA[0]) {
        c = u > 0.62 ? C.faixaLuz : C.faixa
        if (py < FAIXA[0] + 1 && u > 0.62) c = C.faixaBrilho
        pintar(x, y, c, 'faixa')
      }
    } else {
      const p = naPonta(px, py)
      if (p && !g[y][x]) pintar(x, y, p.lado < -0.6 ? C.luz : p.lado > 0.5 || p.u > 0.82 ? C.sombra : C.roxo, 'cone')
    }
  }
}

/* A faixa passa um pouco das bordas do cone */
for (let y = Math.ceil(FAIXA[0] - 0.5); y < FAIXA[1] - 0.5; y++) {
  const xs = []
  for (let x = 0; x < W; x++) if (marca[y][x] === 'faixa') xs.push(x)
  if (!xs.length) continue
  pintar(xs[0] - 1, y, C.faixa, 'faixa')
  pintar(xs[xs.length - 1] + 1, y, C.faixaLuz, 'faixa')
}

/* Sombra da faixa sobre a aba */
for (let x = 0; x < W; x++) {
  const y = Math.floor(FAIXA[1] - 0.5) + 1
  if (marca[y - 1]?.[x] === 'faixa' && marca[y][x] === 'aba') pintar(x, y, C.fundo)
}

/* Fivela: contorno, moldura dourada e furo */
const FX = 10
const FY = 15
for (let j = 0; j < 7; j++) {
  for (let i = 0; i < 6; i++) {
    const borda = i === 0 || j === 0 || i === 5 || j === 6
    const moldura = !borda && (i === 1 || j === 1 || i === 4 || j === 5)
    let c = C.contorno
    if (moldura) c = i === 1 || j === 1 ? C.ouroLuz : i === 4 || j === 5 ? C.ouroSombra : C.ouro
    if (moldura && (i === 1 || j === 1) && (i === 4 || j === 5)) c = C.ouro
    if (!borda && !moldura) c = i === 3 && j === 4 ? C.faixaLuz : C.contorno
    pintar(FX + i, FY + j, c, 'fivela')
  }
}

/* Faíscas */
function faisca(cx, cy, r, c) {
  pintar(cx, cy, c)
  for (let k = 1; k <= r; k++) {
    pintar(cx + k, cy, c)
    pintar(cx - k, cy, c)
    pintar(cx, cy + k, c)
    pintar(cx, cy - k, c)
  }
}

/* Contorno escuro de 1 pixel em volta de tudo */
const cheio = g.map((l) => l.map((c) => !!c))
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (cheio[y][x]) continue
    const vizinho = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => cheio[y + dy]?.[x + dx])
    if (vizinho) pintar(x, y, C.contorno)
  }
}
faisca(3, 6, 2, C.faisca)
faisca(6, 12, 1, C.faiscaRoxa)
pintar(29 + OX - 1, 13, C.faisca)

/* ---------- PNG ---------- */
const TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = TABELA[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function png(grade, escala, largura, altura, dx, dy) {
  const linhas = Buffer.alloc((largura * 4 + 1) * altura)
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const gx = Math.floor(x / escala) - dx
      const gy = Math.floor(y / escala) - dy
      const c = grade[gy]?.[gx]
      if (!c) continue
      const n = parseInt(c.slice(1), 16)
      linhas.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], y * (largura * 4 + 1) + 1 + x * 4)
    }
  }
  const pedaco = (tipo, dados) => {
    const t = Buffer.from(tipo)
    const tam = Buffer.alloc(4)
    tam.writeUInt32BE(dados.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, dados])))
    return Buffer.concat([tam, t, dados, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(linhas, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

/* Corta as bordas vazias */
let [x0, y0, x1, y1] = [W, H, 0, 0]
g.forEach((l, y) => l.forEach((c, x) => {
  if (!c) return
  x0 = Math.min(x0, x)
  y0 = Math.min(y0, y)
  x1 = Math.max(x1, x + 1)
  y1 = Math.max(y1, y + 1)
}))
const raiz = path.join(__dirname, '..')
const E = 8
fs.writeFileSync(path.join(raiz, 'src/components/imgs/logo.png'), png(g, E, (x1 - x0) * E, (y1 - y0) * E, x0, y0))
/* Favicon quadrado de 256 px, centralizado */
const lado = Math.max(x1 - x0, y1 - y0) + 1
const EF = Math.floor(256 / lado)
const sobra = Math.floor((256 - lado * EF) / 2 / EF)
fs.writeFileSync(path.join(raiz, 'public/favicon.png'), png(g, EF, 256, 256, Math.floor((lado - (x1 - x0)) / 2) - x0 + sobra, Math.floor((lado - (y1 - y0)) / 2) - y0 + sobra))
console.log(`logo ${(x1 - x0)}x${(y1 - y0)} pixels`)
