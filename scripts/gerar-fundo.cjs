/*
 * Gera o fundo pixel art do site em camadas (parallax), em clima de fantasia sombria.
 * Saída em public/fundo/: <camada>-<tema>.png, <camada>-anim-<tema>.svg e chuva.svg
 * Temas: escuro (noite de lua, roxa e sombria) e claro (dia nublado, azul e enevoado)
 * Uso: node scripts/gerar-fundo.cjs
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { ruido, aleatorio, fantasma } = require('./pixel-lib.cjs')

/* 270 linhas visíveis + 30 de sobra para o parallax */
const W = 480
const H = 300
const HORIZONTE = 200
const LUA = { x: 246, y: 86, r: 40 }
/* Sol se pondo atrás do castelo, como a lua à noite: grande e à vista, com o castelo recortado na frente */
const SOL = { x: 246, y: 110, r: 30 }
/* Quem ilumina a cena que está sendo desenhada (troca a cada tema) */
let FONTE = LUA
/* Em volta do dragão pousado nenhum galho cresce, para ele ficar à vista: [x0, y0, x1, y1] */
const AREA_DRAGAO = [298, 80, 374, 142]
/* Lado para onde as sombras caem no chão (contrário da luz) */
const ladoSombra = () => (FONTE.x > W / 2 ? -1 : 1)

/* ---------- Cores e tela ---------- */

const hex = (h) => {
  const n = parseInt(h.slice(1), 16)
  return h.length === 9 ? [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}
const misturar = (a, b, t) => cor(a).map((v, i) => Math.round(v + (cor(b)[i] - v) * t))
const cor = (c) => (typeof c === 'string' ? hex(c) : c)

/* Matriz de Bayer: pontilhado clássico de pixel art */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

class Tela {
  constructor(w = W, h = H) {
    this.w = w
    this.h = h
    this.d = new Uint8ClampedArray(w * h * 4)
  }

  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }

  set(x, y, c) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (!this.dentro(x, y) || !c) return
    const k = cor(c)
    const i = (y * this.w + x) * 4
    this.d[i] = k[0]
    this.d[i + 1] = k[1]
    this.d[i + 2] = k[2]
    this.d[i + 3] = k[3] ?? 255
  }

  apagar(x, y) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (this.dentro(x, y)) this.d.fill(0, (y * this.w + x) * 4, (y * this.w + x) * 4 + 4)
  }

  get(x, y) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (!this.dentro(x, y)) return null
    const i = (y * this.w + x) * 4
    return this.d[i + 3] ? [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]] : null
  }

  /* Pinta por cima com transparência */
  luz(x, y, c, a) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (!this.dentro(x, y) || a <= 0 || !c) return
    const k = cor(c)
    const i = (y * this.w + x) * 4
    const ba = this.d[i + 3] / 255
    const oa = a + ba * (1 - a)
    for (let j = 0; j < 3; j++) this.d[i + j] = (k[j] * a + this.d[i + j] * ba * (1 - a)) / oa
    this.d[i + 3] = oa * 255
  }

  /* Brilho redondo em degraus pontilhados */
  brilho(cx, cy, r, c, forca) {
    if (!c) return
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
        if (d >= 1) continue
        const bruto = forca * (1 - d) ** 1.4
        const passo = forca / 4
        const a = Math.floor(bruto / passo + bayer(x, y)) * passo
        if (a > 0) this.luz(x, y, c, Math.min(1, a))
      }
    }
  }

  pinta(teste, caixa = [0, 0, this.w, this.h]) {
    const [x0, y0, x1, y1] = caixa.map(Math.round)
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) {
        const c = teste(x + 0.5, y + 0.5, x, y)
        if (c) this.set(x, y, c)
      }
    }
  }

  ret(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }

  circulo(cx, cy, r, c) {
    this.pinta((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r && c, [cx - r - 1, cy - r - 1, cx + r + 2, cy + r + 2])
  }

  elipse(cx, cy, rx, ry, c) {
    this.pinta((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && c, [cx - rx - 1, cy - ry - 1, cx + rx + 2, cy + ry + 2])
  }

  poligono(pts, c) {
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    this.pinta(
      (x, y) => {
        let dentro = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i]
          const [xj, yj] = pts[j]
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
        }
        return dentro && c
      },
      [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 2, Math.max(...ys) + 2]
    )
  }

  linha(ax, ay, bx, by, g, c) {
    const dx = bx - ax
    const dy = by - ay
    const tam = dx * dx + dy * dy || 1
    const r = g / 2
    this.pinta(
      (x, y) => {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / tam))
        return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r && c
      },
      [Math.min(ax, bx) - r - 1, Math.min(ay, by) - r - 1, Math.max(ax, bx) + r + 2, Math.max(ay, by) + r + 2]
    )
  }

  /* Traço com largura variando ponto a ponto: [[x, y, largura], ...] */
  traco(pts, c) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay, aw] = pts[i - 1]
      const [bx, by, bw] = pts[i]
      const passos = Math.ceil(Math.hypot(bx - ax, by - ay) * 2)
      for (let k = 0; k <= passos; k++) {
        const u = k / passos
        this.circulo(ax + (bx - ax) * u, ay + (by - ay) * u, (aw + (bw - aw) * u) / 2, c)
      }
    }
  }

  /* Copia outra tela por cima */
  colar(outra) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = outra.get(x, y)
        if (c) c[3] === 255 ? this.set(x, y, c) : this.luz(x, y, c, c[3] / 255)
      }
    }
  }

  png() {
    return codificarPNG(this.w, this.h, this.d)
  }
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function codificarPNG(w, h, dados) {
  const linhas = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    linhas[y * (w * 4 + 1)] = 0
    Buffer.from(dados.buffer, y * w * 4, w * 4).copy(linhas, y * (w * 4 + 1) + 1)
  }
  const pedaco = (tipo, conteudo) => {
    const t = Buffer.from(tipo)
    const tam = Buffer.alloc(4)
    tam.writeUInt32BE(conteudo.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, conteudo])))
    return Buffer.concat([tam, t, conteudo, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(linhas, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

/* Ruído em camadas */
function fbm(semente) {
  const n = ruido(semente)
  return (x, y) => n(x, y) * 0.55 + n(x * 2.1 + 7.3, y * 2.1 + 3.1) * 0.3 + n(x * 4.3 + 11.7, y * 4.3 + 5.9) * 0.15
}

/* Direção (normalizada) de um ponto até a fonte de luz */
function luzPara(x, y) {
  const dx = FONTE.x - x
  const dy = FONTE.y - y
  const d = Math.hypot(dx, dy) || 1
  return [dx / d, dy / d]
}

/* Borda virada para a luz clareia; as outras ganham meio-tom pontilhado. "fundo": largura da borda acesa */
function contornoLuz(c, luz, meio, alcance = Infinity, fundo = 1) {
  const marcas = []
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (!c.get(x, y)) continue
      const dx = Math.sign(FONTE.x - x)
      const dy = Math.sign(FONTE.y - y)
      let paraLua = false
      for (let k = 1; k <= fundo && !paraLua; k++) paraLua = !c.get(x + dx * k, y) || !c.get(x, y + dy * k)
      const vazio = [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([a, b]) => !c.get(x + a, y + b))
      if (paraLua && Math.hypot(x - LUA.x, y - LUA.y) < alcance) marcas.push([x, y, luz])
      else if (vazio && meio && bayer(x, y) > 0.5) marcas.push([x, y, meio])
    }
  }
  for (const [x, y, c2] of marcas) c.set(x, y, c2)
}

/* Faixa de névoa pontilhada */
function nevoaFaixa(t, c, centro, largura, forca, semente) {
  const n = fbm(semente)
  for (let y = Math.floor(centro - largura * 2.5); y < centro + largura * 2.5; y++) {
    for (let x = 0; x < W; x++) {
      const a = forca * Math.exp(-(((y - centro) / largura) ** 2)) * (0.55 + 0.9 * n(x / 30, y / 6))
      const q = Math.floor(a / 0.08 + bayer(x, y)) * 0.08
      if (q > 0) t.luz(x, y, c, Math.min(1, q))
    }
  }
}

/* ---------- Paletas ---------- */

const PALETAS = {
  /* Noite de lua: preto, roxo profundo, ameixa e violeta */
  escuro: {
    ceu: ['#06040d', '#090611', '#0d0817', '#120a1e', '#180d26', '#1f112f', '#281539', '#321a43', '#3d204c', '#48264f'],
    estrela: '#e6dcff', estrelaFraca: '#4a3c6c',
    lua: '#e4d9ec', luaClara: '#faf5ff', luaMancha: '#c3b2d4', luaBorda: '#a08fb8', halo: '#b892e0',
    nuvemFundo: '#120a1c', nuvemSombra: '#1d1129', nuvem: '#2b1939', nuvemMeio: '#45294f', nuvemLuz: '#7c5085', nuvemBrilho: '#d49cb4',
    montLonge: '#22183a', montLongeLuz: '#3d2d5a', montMeio: '#160f25', montMeioLuz: '#31244a', torreLonge: '#2b2045', nevoa: '#5d4680',
    dragao: '#07040c', dragaoLuz: '#4f3c6c',
    rocha: '#110b1b', rochaLuz: '#2e2342', rochaMeio: '#191126', rochaSombra: '#08050e',
    castelo: '#09060f', casteloMeio: '#150f20', casteloLuz: '#5b4878', telhado: '#09060f', portao: '#ff8a4a', portaoClara: '#ffd08a',
    janela: '#ff8a4a', janelaClara: '#ffd08a', janelaRoxa: '#b77cff', janelaApagada: '#1d1529', bandeira: '#6e1a2c',
    lanterna: '#ffb36a', brilho: '#ff8f52', brilhoRoxo: '#9a5cff',
    silhuetaLonge: '#1d1430', silhuetaLongeLuz: '#33264c', silhueta: '#120c1e', silhuetaLuz: '#2a1f3c',
    chao: '#0b0812', chaoLuz: '#1c1626', chaoSombra: '#050308',
    caminho: '#1a1422', caminhoLuz: '#2b2334', caminhoJunta: '#0b0810',
    pedra: '#1b1626', pedraLuz: '#3a3149', pedraSombra: '#0b0911', runa: '#7a4cd6',
    meioRacha: '#07050b', meioEscuro: '#0d0915', meioBase: '#16101f', meioLuz: '#2a2038', meioBrilho: '#463759',
    troncoRacha: '#040306', troncoEscuro: '#09060d', tronco: '#140e1a', troncoLuz: '#2a2032', troncoBrilho: '#5a4872',
    musgo: '#16211f', musgoLuz: '#2c3f37',
    fungo: '#a66bff', fungoLuz: '#e8d2ff', grama: '#0d0a14', gramaLuz: '#221b30',
    luaSombra: '#9d8ab8', luaVioleta: '#b6a0d4', troncoRoxo: '#1f1329', corrupcao: '#4a2384', corrupcaoLuz: '#a46cff',
    poca: '#07050d', janelaFraca: '#a8532f', corrente: '#3a3348', folhaSeca: '#3a2232', folhaSecaLuz: '#5c3a4c',
    bruxa: '#040307', corvo: '#030205', gato: '#040308', espada: '#2e2a38', espadaLuz: '#7d7890', cristal: '#3e1d6e', cristalLuz: '#b98aff',
  },
  /*
   * Pôr do sol: céu do violeta ao amarelo (cores da referência); o resto pela teoria das cores:
   * a luz é quente (laranja, pêssego) nas bordas viradas para o sol e as sombras vão para a
   * complementar fria (violeta e índigo). Ao longe, tudo se mistura na névoa rosada do céu.
   */
  claro: {
    dia: true,
    ceu: ['#4a3c8a', '#6a3f92', '#94419a', '#c04a96', '#e05a8a', '#f06c7a', '#f8826a', '#fc9a5c', '#feb052', '#ffc24c'],
    estrela: '#ffffff', estrelaFraca: '#ffffff',
    lua: '#fff0b0', luaClara: '#fffbe0', luaMancha: '#ffe08a', luaBorda: '#ffc860', halo: '#ffd27a',
    nuvemFundo: '#7a3a8a', nuvemSombra: '#9a3f8e', nuvem: '#c84a86', nuvemMeio: '#ee6a78', nuvemLuz: '#ff9a6a', nuvemBrilho: '#ffd08a',
    montLonge: '#8a4a8e', montLongeLuz: '#e07a7a', montMeio: '#5a3478', montMeioLuz: '#c4607a', torreLonge: '#9a5090', nevoa: '#f0a0a0',
    dragao: '#2a1a40', dragaoLuz: '#e07a6a',
    rocha: '#3e2650', rochaLuz: '#e08068', rochaMeio: '#4a2e5a', rochaSombra: '#2a1a3c',
    castelo: '#3a2850', casteloMeio: '#2e2042', casteloLuz: '#f09a6a', telhado: '#24183a', portao: '#ff9a50', portaoClara: '#ffd890',
    janela: '#ffb060', janelaClara: '#fff0c0', janelaRoxa: '#e0a0ff', janelaApagada: '#24183a', bandeira: '#c0304a',
    lanterna: '#ffd09a', brilho: '#ffa860', brilhoRoxo: '#c070d0',
    silhuetaLonge: '#7a4080', silhuetaLongeLuz: '#d06a7a', silhueta: '#55306e', silhuetaLuz: '#a85476',
    chao: '#3a2448', chaoLuz: '#6a3a5a', chaoSombra: '#2a1838',
    caminho: '#6a4a62', caminhoLuz: '#c87a6e', caminhoJunta: '#3a2840',
    pedra: '#6a4a6e', pedraLuz: '#e8907a', pedraSombra: '#3e2a4e', runa: '#b070c0',
    meioRacha: '#24142e', meioEscuro: '#321c3e', meioBase: '#43284c', meioLuz: '#7a3e5e', meioBrilho: '#d87468',
    troncoRacha: '#1a0e20', troncoEscuro: '#28162e', tronco: '#3a2238', troncoLuz: '#6e3a4c', troncoBrilho: '#e8865e',
    musgo: '#4a4a3e', musgoLuz: '#8a7a4a',
    fungo: '#c070c0', fungoLuz: '#ffd0e0', grama: '#3e2a3a', gramaLuz: '#7a4a4a',
    luaSombra: '#ffc860', luaVioleta: '#f6a080', troncoRoxo: '#3a2448', corrupcao: '#7a3a9a', corrupcaoLuz: '#d080ff',
    poca: '#2a1838', janelaFraca: '#c07a50', corrente: '#4a3048', folhaSeca: '#8a4a3a', folhaSecaLuz: '#c0704a',
    bruxa: '#1a0e24', corvo: '#160c1e', gato: '#120a18', espada: '#6a5060', espadaLuz: '#f0c0a0', cristal: '#7a3aa0', cristalLuz: '#e0a0ff',
  },
}

/* ---------- Dados das animações (posições geradas junto com o desenho) ---------- */
const anim = {
  estrelas: [], janelas: [], lanternas: [], lampioes: [], olhosDragao: [], olhoSerpente: [], runas: [], orbe: [],
  fungos: [], fios: [], cristais: [], olhosGato: [], corvos: [], veias: [], fendas: [], poca: [], tochas: [], lago: [], janelasApagadas: [],
}

/* ---------- Árvores retorcidas ---------- */

const angDif = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

/*
 * Cresce um ramo em passos: o ângulo torce a cada passo, a largura afina
 * e saem ramos menores. Nas pontas ficam garras finas e tortas.
 */
function crescer(rand, segs, x, y, ang, comp, larg, nivel, o) {
  const passos = Math.max(2, Math.min(o.passos, Math.round(comp / 2.5)))
  const l = comp / passos
  const torcao = o.torcao * (1 + (o.nivel - nivel) * 0.35)
  let w = larg
  for (let i = 0; i < passos; i++) {
    ang += (rand() - 0.5) * torcao
    ang += nivel === o.nivel ? angDif(o.alvoTronco ?? o.alvo, ang) * 0.12 + Math.sin(i * 0.9 + o.fase) * o.curva : angDif(o.alvo, ang) * o.puxao
    if (!o.raiz && Math.sin(ang) > 0.3) ang -= 0.3
    if (o.xMax !== undefined && x > o.xMax) ang += angDif(-Math.PI / 2, ang) * 0.45
    if (o.xMin !== undefined && x < o.xMin) ang += angDif(-Math.PI / 2, ang) * 0.45
    const nx = x + Math.cos(ang) * l
    const ny = y + Math.sin(ang) * l
    /* O galho para antes de entrar numa área que precisa ficar livre */
    if (o.evitar && nx > o.evitar[0] && nx < o.evitar[2] && ny > o.evitar[1] && ny < o.evitar[3]) return
    const nw = Math.max(o.minimo, w * (1 - o.afina / passos))
    segs.push({ ax: x, ay: y, aw: w, bx: nx, by: ny, bw: nw, nivel })
    if (nivel > 0 && i >= passos * 0.3 && i < passos - 1 && rand() < o.ramifica) {
      const lado = rand() < 0.5 ? -1 : 1
      crescer(rand, segs, nx, ny, ang + lado * (0.5 + rand() * 0.6), comp * (0.4 + rand() * 0.3), Math.max(o.minimo, nw * (0.5 + rand() * 0.2)), nivel - 1, o)
    }
    x = nx
    y = ny
    w = nw
  }
  if (nivel > 0) {
    const filhos = 2 + (rand() < 0.3 ? 1 : 0)
    for (let k = 0; k < filhos; k++) {
      const abre = (k - (filhos - 1) / 2) * (0.6 + rand() * 0.4) + (rand() - 0.5) * 0.3
      crescer(rand, segs, x, y, ang + abre, comp * (0.55 + rand() * 0.25), Math.max(o.minimo, w * (0.6 + rand() * 0.15)), nivel - 1, o)
    }
  } else if (o.quebra && rand() < o.quebra) {
    segs.push({ ax: x, ay: y, aw: w, bx: x + Math.cos(ang) * 1.5, by: y + Math.sin(ang) * 1.5, bw: w * 0.6, nivel: -2 })
  } else if (o.garras) {
    for (let k = 0; k < 2 + Math.floor(rand() * 2); k++) {
      let a = ang + (rand() - 0.5) * 1.6
      let gx = x
      let gy = y
      for (let j = 0; j < 2; j++) {
        const lg = 2 + rand() * 3
        const nx = gx + Math.cos(a) * lg
        const ny = gy + Math.sin(a) * lg
        segs.push({ ax: gx, ay: gy, aw: o.minimo, bx: nx, by: ny, bw: o.minimo, nivel: -1 })
        gx = nx
        gy = ny
        a += (rand() < 0.5 ? -1 : 1) * (0.4 + rand() * 0.5)
      }
    }
  }
}

/*
 * Pinta os galhos: luz do lado da lua, rachaduras que seguem o comprimento,
 * musgo por cima dos galhos deitados e nós na casca.
 */
function madeira(t, segs, cores, semente, L, op = {}) {
  const n = fbm(semente)
  const melhor = new Float32Array(W * H).fill(2)
  const tom = new Int8Array(W * H).fill(-1)
  const tons = [cores.racha, cores.escuro, cores.base, cores.luz, cores.brilho, cores.musgo, cores.musgoLuz, cores.roxo ?? cores.base]
  let acum = 0
  for (const s of segs) {
    const dx = s.bx - s.ax
    const dy = s.by - s.ay
    const tam2 = dx * dx + dy * dy || 1e-6
    const tam = Math.sqrt(tam2)
    const r = Math.max(s.aw, s.bw) / 2 + 1
    const deitado = Math.abs(dx) > Math.abs(dy) * 1.2
    for (let py = Math.max(0, Math.floor(Math.min(s.ay, s.by) - r)); py <= Math.min(H - 1, Math.ceil(Math.max(s.ay, s.by) + r)); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(s.ax, s.bx) - r)); px <= Math.min(W - 1, Math.ceil(Math.max(s.ax, s.bx) + r)); px++) {
        const x = px + 0.5
        const y = py + 0.5
        const u = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / tam2))
        const ox = x - (s.ax + u * dx)
        const oy = y - (s.ay + u * dy)
        const meia = Math.max(0.5, (s.aw + (s.bw - s.aw) * u) / 2)
        const d = Math.hypot(ox, oy)
        if (d > meia) continue
        const rel = d / meia
        const i = py * W + px
        if (rel >= melhor[i]) continue
        melhor[i] = rel
        const nx = ox / meia
        const ny = oy / meia
        const lum = nx * L[0] + ny * L[1] + (bayer(px, py) - 0.5) * 0.3
        let k = 2
        if (lum > 0.5 && rel > 0.5) k = 4
        else if (lum > 0.12) k = 3
        else if (lum < -0.35) k = 1
        if (meia > 2.2) {
          const ao = acum + u * tam
          const atravessa = (ox * -dy + oy * dx) / tam
          if (n(ao / 16, atravessa / 1.3 + semente) > 0.68) k = k >= 3 ? 1 : 0
        }
        if (k === 2 && cores.roxo && n(px / 7 + 90, py / 9) > 0.62) k = 7
        if (op.musgo && deitado && meia > 1.4 && ny < -0.45 && n(px / 5, py / 3 + 50) > 0.52) k = lum > 0.1 ? 6 : 5
        tom[i] = k
      }
    }
    acum += tam
  }
  for (let i = 0; i < tom.length; i++) if (tom[i] >= 0) t.set(i % W, Math.floor(i / W), tons[tom[i]])

  /* Nós na casca dos troncos grossos */
  if (op.nos) {
    for (const s of segs) {
      if (Math.min(s.aw, s.bw) < 7 || op.rand() > 0.3) continue
      const cx = (s.ax + s.bx) / 2 + (op.rand() - 0.5) * s.aw * 0.4
      const cy = (s.ay + s.by) / 2
      t.elipse(cx, cy, 1.8, 2.8, cores.escuro)
      t.elipse(cx, cy + 0.5, 0.8, 1.4, cores.racha)
      t.set(cx, cy - 3, cores.luz)
      t.set(cx - 1, cy - 2, cores.luz)
    }
  }
}

/* Árvore retorcida inteira: tronco, galhos com garras e raízes grossas */
function arvoreRetorcida(t, cores, x, chao, altura, largura, alvo, semente, op = {}) {
  const rand = aleatorio(semente)
  const segs = []
  const o = {
    passos: 8, torcao: op.torcao ?? 0.26, puxao: op.puxao ?? 0.06, alvo, ramifica: op.ramifica ?? 0.2,
    afina: op.afina ?? 0.5, quebra: op.quebra ?? 0, minimo: 1, nivel: op.nivel ?? 4, garras: true, xMin: op.xMin, xMax: op.xMax, evitar: op.evitar,
    alvoTronco: -Math.PI / 2 + (op.inclina ?? 0), fase: rand() * 6, curva: op.curva ?? 0.12,
  }
  crescer(rand, segs, x, chao + 2, -Math.PI / 2 + (op.inclina ?? 0), altura, largura, o.nivel, o)
  const raizes = []
  for (let k = 0; k < (op.raizes ?? 5); k++) {
    const lado = k % 2 ? 1 : -1
    const a = lado > 0 ? 0.2 + rand() * 0.45 : Math.PI - 0.2 - rand() * 0.45
    crescer(rand, raizes, x + lado * largura * (0.1 + rand() * 0.25), chao - 2 - rand() * 4, a, largura * (0.9 + rand() * 1.1), largura * (0.3 + rand() * 0.15), 1, {
      ...o, torcao: 0.3, puxao: 0.12, ramifica: 0.25, nivel: 1, garras: false, raiz: true, xMin: undefined, xMax: undefined, alvo: lado > 0 ? 0.1 : Math.PI - 0.1, alvoTronco: lado > 0 ? 0.12 : Math.PI - 0.12, curva: 0.05,
    })
  }
  madeira(t, [...raizes, ...segs], cores, semente, luzPara(x, chao - altura / 2), { ...op, rand })
  /* Farpas nas pontas quebradas */
  for (const s of segs) {
    if (s.nivel !== -2) continue
    t.set(s.bx, s.by, cores.brilho)
    t.set(s.bx + Math.sign(s.bx - s.ax), s.by - 1, cores.luz)
  }
  return { segs, raizes, rand }
}

/* Árvore seca ao longe: só a silhueta, com a borda virada para a lua clara */
function arvoreSilhueta(t, x, chao, altura, c, luz, semente, nivel = 3) {
  const rand = aleatorio(semente)
  arvoreRetorcida(t, { racha: c, escuro: c, base: c, luz: c, brilho: luz }, x, chao, altura, Math.max(1.5, altura * 0.09), -Math.PI / 2 + (rand() - 0.5) * 0.7, semente, {
    nivel, raizes: 2, ramifica: 0.15, torcao: 0.35,
  })
}

/* Pinheiro morto: tronco fino e galhos caídos, com falhas */
function pinheiroMorto(t, x, chao, altura, c, luz, rand) {
  const inclina = (rand() - 0.5) * 0.12
  for (let i = 0; i < altura; i++) t.set(x + i * inclina, chao - i, c)
  for (let i = 3; i < altura - 2; i += 2 + Math.floor(rand() * 2)) {
    if (rand() < 0.1) continue
    const y = chao - altura + i
    const cx = x + (altura - i) * inclina
    const len = Math.max(1, i * 0.32 * (0.45 + rand() * 0.7))
    t.linha(cx, y, cx - len, y + len * 0.45, 1, c)
    t.linha(cx, y, cx + len, y + len * 0.45, 1, c)
    if (rand() < 0.5) t.set(cx - len, y + len * 0.45, luz)
  }
  t.set(x + altura * inclina, chao - altura - 1, c)
}

/* Musgo pendurado nos galhos deitados (alguns ficam só na animação, balançando) */
function fiosMusgo(t, P, segs, rand, qtd, registrar, nomeAnim) {
  const deitados = segs.filter((s) => s.nivel >= 1 && s.nivel <= 3 && Math.abs(s.bx - s.ax) > Math.abs(s.by - s.ay) && s.bw > 1.5 && s.by > 0)
  if (!deitados.length) return
  for (let k = 0; k < qtd; k++) {
    const s = deitados[Math.floor(rand() * deitados.length)]
    const u = rand()
    const x = Math.floor(s.ax + (s.bx - s.ax) * u)
    const y = Math.floor(s.ay + (s.by - s.ay) * u + s.bw / 2)
    const tam = 4 + Math.floor(rand() * 10)
    if (k < 5) {
      if (registrar) anim.fios.push([x, y, tam, nomeAnim])
      continue
    }
    for (let j = 0; j < tam; j++) t.set(x + (Math.floor(j / 4) % 2), y + j, j === tam - 1 ? P.musgoLuz : P.musgo)
  }
}

/* Cipós caindo em curva entre dois galhos */
function cipos(t, P, segs, rand, qtd) {
  const pontas = segs.filter((s) => s.nivel >= 1 && s.nivel <= 3 && s.by > 10)
  for (let k = 0, tentativas = 0; k < qtd && tentativas < 200; tentativas++) {
    const a = pontas[Math.floor(rand() * pontas.length)]
    const b = pontas[Math.floor(rand() * pontas.length)]
    if (!a || !b) return
    const dx = b.bx - a.bx
    if (Math.abs(dx) < 14 || Math.abs(dx) > 44 || Math.abs(b.by - a.by) > 14) continue
    k++
    const cai = 6 + rand() * 10
    const passos = Math.ceil(Math.abs(dx) * 1.5)
    for (let i = 0; i <= passos; i++) {
      const u = i / passos
      const x = a.bx + dx * u
      const y = a.by + (b.by - a.by) * u + cai * 4 * u * (1 - u)
      t.set(x, y, P.musgo)
      if (i % 7 === 3) t.set(x, y + 1, P.musgoLuz)
    }
  }
}

/* Veias violetas na casca, sinal da magia que corrompe a floresta */
function marcasCorrupcao(t, P, segs, rand, qtd, registrar) {
  const troncos = segs.filter((s) => s.aw > 9 && s.ay > 60)
  for (let k = 0; k < qtd && troncos.length; k++) {
    const s = troncos[Math.floor(rand() * troncos.length)]
    const u = rand()
    let x = Math.floor(s.ax + (s.bx - s.ax) * u + (rand() - 0.5) * s.aw * 0.4)
    let y = Math.floor(s.ay + (s.by - s.ay) * u)
    const tam = 5 + Math.floor(rand() * 4)
    for (let i = 0; i < tam; i++) {
      t.set(x, y, i === Math.floor(tam / 2) ? P.corrupcaoLuz : P.corrupcao)
      y--
      if (rand() < 0.4) x += rand() < 0.5 ? -1 : 1
    }
    if (registrar) anim.veias.push([x, y + Math.floor(tam / 2)])
  }
}

/* Corvo pousado, olhando para a esquerda */
const CORVO = ['..XX....', '.XXXX...', 'XXXXXX..', '..XXXXXX', '..XXXXX.', '...X.X..']

function corvos(t, P, segs, rand, faixaX, qtd, registrar) {
  const lugares = segs.filter((s) => s.nivel >= 1 && s.nivel <= 2 && Math.abs(s.bx - s.ax) > Math.abs(s.by - s.ay) * 1.5 && s.bw >= 1.5 && s.ax > faixaX[0] && s.ax < faixaX[1] && s.ay > 20)
  for (let k = 0; k < qtd && lugares.length; k++) {
    const s = lugares.splice(Math.floor(rand() * lugares.length), 1)[0]
    const x = Math.floor((s.ax + s.bx) / 2)
    const y = Math.floor((s.ay + s.by) / 2 - s.bw / 2) - 6
    CORVO.forEach((l, j) => [...l].forEach((ch, i) => ch === 'X' && t.set(x - 3 + i, y + j, P.corvo)))
    if (registrar) anim.corvos.push([x - 2, y + 1])
  }
}

/* Cogumelos que brilham na base das raízes */
function fungos(t, P, raizes, rand, qtd, registrar) {
  for (let k = 0; k < qtd; k++) {
    const s = raizes[Math.floor(rand() * Math.min(raizes.length, 12))]
    if (!s) return
    const x = Math.floor(s.ax + (s.bx - s.ax) * 0.5)
    const y = Math.floor(s.ay + (s.by - s.ay) * 0.5 - (s.aw + s.bw) / 4)
    t.set(x, y, P.troncoLuz)
    t.ret(x - 1, y - 1, 3, 1, P.fungo)
    t.set(x, y - 2, P.fungoLuz)
    t.brilho(x + 0.5, y - 1, 4, P.brilhoRoxo, 0.2)
    if (registrar) anim.fungos.push([x, y - 1])
  }
}

/* ---------- Camada 1: céu, lua e nuvens rasgadas ---------- */

function ceu(P, registrar) {
  const t = new Tela()
  const rand = aleatorio(5)
  const cores = P.ceu.map(hex)

  /* De dia a curva é mais aberta: o laranja do horizonte sobe mais pelo céu */
  const curva = P.dia ? 0.62 : 0.9
  t.pinta((x, y, px, py) => {
    const v = Math.min(cores.length - 1, Math.min(1, py / HORIZONTE) ** curva * (cores.length - 1))
    const b = Math.floor(v)
    return cores[Math.min(cores.length - 1, b + (v - b > bayer(px, py) ? 1 : 0))]
  })

  /* Poucas estrelas, frias e fracas */
  if (!P.dia) {
    for (let i = 0; i < 320; i++) {
      const x = Math.floor(rand() * W)
      const y = Math.floor(rand() ** 1.4 * 170)
      if (Math.hypot(x - LUA.x, y - LUA.y) < LUA.r + 18) continue
      const tipo = rand()
      if (tipo > 0.975) {
        t.set(x, y, P.estrela)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) t.luz(x + dx, y + dy, P.estrela, 0.45)
        if (registrar) anim.estrelas.push([x, y, 2])
      } else if (tipo > 0.86) {
        t.set(x, y, P.estrela)
        if (registrar && rand() > 0.5) anim.estrelas.push([x, y, 1])
      } else t.set(x, y, P.estrelaFraca)
    }
  }

  if (P.dia) claraoDoSol(t, P)
  else desenharLua(t, P)
  /* Neblina celeste baixa, quase imperceptível */
  nevoaFaixa(t, P.nevoa, 150, 10, 0.12, 19)
  return t
}

/* Lua cheia com halo, mares e crateras */
function desenharLua(t, P) {
  const { x: mx, y: my, r } = LUA
  for (let y = my - r - 34; y <= my + r + 34; y++) {
    for (let x = mx - r - 34; x <= mx + r + 34; x++) {
      const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my)
      if (d <= r || d > r + 34) continue
      const bruto = (P.dia ? 0.5 : 0.32) * (1 - (d - r) / 34) ** 1.6
      t.luz(x, y, P.halo, Math.floor(bruto / 0.06 + bayer(x, y)) * 0.06)
    }
  }
  const manchas = fbm(21)
  t.pinta(
    (x, y, px, py) => {
      const dx = x - mx
      const dy = y - my
      const d = Math.hypot(dx, dy)
      if (d > r) return false
      if (d > r - 1.2) return P.luaBorda
      if (P.dia) return (dx + dy) / r < -0.5 ? P.luaClara : d / r > 0.82 && bayer(px, py) > 0.5 ? P.luaMancha : P.lua
      const v = manchas(px / 13, py / 11)
      const fino = manchas(px / 4 + 40, py / 4)
      const lado = (dx + dy) / r
      /* Borda de baixo à direita mais apagada; mares em lavanda e violeta */
      if (d / r > 0.9 && lado > 0.3) return bayer(px, py) > 0.4 ? P.luaSombra : P.luaMancha
      if (v > 0.63) return fino > 0.55 ? P.luaSombra : P.luaVioleta
      if (v > 0.56) return bayer(px, py) > 0.5 ? P.luaVioleta : P.luaMancha
      if (v > 0.5 && fino > 0.6) return P.luaMancha
      if (lado < -0.7 && v < 0.5) return P.luaClara
      if (lado > 0.55 && bayer(px, py) > 0.7) return P.luaMancha
      return P.lua
    },
    [mx - r - 1, my - r - 1, mx + r + 2, my + r + 2]
  )
  /* Crateras de borda irregular: parede de cima na sombra, a de baixo acesa */
  const irregular = fbm(23)
  const crateras = [[-14, -12, 4.5], [10, 14, 6], [-6, 20, 3], [18, -8, 3.2], [-22, 6, 2.6], [4, -24, 2.2], [24, 10, 2], [-28, -6, 1.6], [-4, -4, 1.8], [14, -26, 1.6], [-18, 22, 2], [28, -14, 1.5]]
  for (const [cx, cy, cr] of P.dia ? [] : crateras) {
    const ox = mx + cx
    const oy = my + cy
    t.pinta(
      (x, y, px, py) => {
        if (Math.hypot(x - mx, y - my) > r - 1.5) return false
        const ddx = x - ox
        const ddy = y - oy
        const raio = cr * (0.85 + 0.3 * irregular(px / 2, py / 2))
        const d = Math.hypot(ddx, ddy)
        if (d > raio + 0.8) return false
        if (d > raio) return ddx + ddy > 0 && P.luaClara
        const lado = (ddx + ddy) / raio
        if (d > raio - 1.1) return lado < 0 ? P.luaSombra : P.luaClara
        return lado < -0.2 ? P.luaSombra : P.luaMancha
      },
      [ox - cr - 2, oy - cr - 2, ox + cr + 3, oy + cr + 3]
    )
  }

}

/* Sol se pondo: clarão grande e quente perto do horizonte e o disco atrás das montanhas */
function claraoDoSol(t, P) {
  for (let y = 0; y < HORIZONTE + 20; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SOL.x, (y - SOL.y) * 1.6)
      const a = 0.5 * Math.max(0, 1 - d / 230) ** 1.4
      const q = Math.floor(a / 0.07 + bayer(x, y)) * 0.07
      if (q > 0) t.luz(x, y, P.halo, Math.min(1, q))
    }
  }
  t.pinta(
    (x, y, px, py) => {
      const d = Math.hypot(x - SOL.x, y - SOL.y)
      if (d > SOL.r) return false
      if (d > SOL.r - 1.2) return P.luaBorda
      /* Faixas mais escuras atravessando o disco, como no pôr do sol */
      if ([SOL.y + 4, SOL.y + 9].some((fy) => Math.abs(py - fy) < 1) && bayer(px, py) > 0.3) return P.luaMancha
      return (x - SOL.x) + (y - SOL.y) < -SOL.r * 0.6 ? P.luaClara : P.lua
    },
    [SOL.x - SOL.r - 1, SOL.y - SOL.r - 1, SOL.x + SOL.r + 2, SOL.y + SOL.r + 2]
  )
}

/* Camada só das nuvens, que anda devagar por cima do céu */
function nuvens(P) {
  const t = new Tela()
  nuvensRasgadas(t, P, ceu(P, false))
  return t
}

/*
 * Nuvens em faixas compridas e rasgadas, escuras no miolo,
 * com a borda virada para a lua acesa em ameixa (de dia, branca).
 */
function nuvensRasgadas(t, P, fundo) {
  const a = fbm(31)
  const b = fbm(47)
  const tons = [P.nuvemFundo, P.nuvemSombra, P.nuvem, P.nuvemMeio, P.nuvemLuz, P.nuvemBrilho].map(hex)
  const faixa = (y) => Math.max(0.9 * Math.exp(-(((y - 56) / 15) ** 2)), Math.exp(-(((y - 122) / 13) ** 2)), Math.exp(-(((y - 174) / 12) ** 2)))
  const dens = (x, y) => {
    let d = a(x / 58, y / 10) * 0.65 + b(x / 17, y / 5.5) * 0.35 - (0.72 - 0.4 * faixa(y))
    if (Math.hypot(x - FONTE.x, y - FONTE.y) < FONTE.r + 6) d -= 0.09
    return d
  }
  t.pinta(
    (x, y, px, py) => {
      const d = dens(x, y)
      if (d <= 0) return false
      const [lx, ly] = luzPara(x, y)
      const borda = d - dens(x + lx * 4, y + ly * 4)
      const perto = Math.max(0, 1 - Math.hypot(x - FONTE.x, y - FONTE.y) / 160)
      const acesa = Math.max(-1, Math.min(1, borda * 26))
      const v = 1.6 + acesa * 1.6 - Math.min(1, d * 6) * 0.9 + perto * 1.8 * Math.max(0, acesa)
      let c = tons[Math.max(0, Math.min(5, Math.floor(v + (bayer(px, py) - 0.5) * 0.5)))]
      /* Perto do horizonte as nuvens somem no céu */
      const longe = Math.max(0, (py - 140) / 60)
      if (longe > 0) c = misturar(c, fundo.get(px, py) || c, Math.min(0.6, longe * 0.6))
      return c
    },
    [0, 0, W, HORIZONTE + 10]
  )
}

/* ---------- Camada 2: montanhas, torres ao longe, dragão e serpente ---------- */

function perfil(picos, aspereza, semente) {
  const n = fbm(semente)
  return Array.from({ length: W }, (_, x) => {
    let y = H
    for (const p of picos) y = Math.min(y, p.y + Math.abs(x - p.x) * p.i)
    return Math.round(y + (n(x / 8, semente) - 0.5) * aspereza + (n(x / 2.2, semente + 9) - 0.5) * aspereza * 0.6)
  })
}

function cordilheira(t, alt, corBase, corLuz, semente) {
  const n = fbm(semente)
  const sombra = misturar(corBase, '#000000', 0.3)
  for (let x = 0; x < W; x++) {
    const inclinacao = (alt[Math.min(W - 1, x + 1)] - alt[Math.max(0, x - 1)]) / 2
    const viradaLua = x < FONTE.x ? inclinacao > 0.15 : inclinacao < -0.15
    for (let y = alt[x]; y < H; y++) {
      const fundo = y - alt[x]
      let c = corBase
      if (fundo < 1) c = corLuz
      else if (viradaLua && fundo < 12 && n(x / 4, y / 4) + (12 - fundo) / 16 > 0.85 + bayer(x, y) * 0.2) c = corLuz
      /* Encosta de costas para a luz: sombra em manchas largas, sem riscos */
      else if (!viradaLua && fundo > 3 && n(x / 9, y / 7) > 0.6) c = sombra
      t.set(x, y, c)
    }
  }
}

/* Torre gótica distante: só uma agulha fina com pináculos */
function torreLonge(t, x, base, altura, c, luz, janela) {
  t.ret(x - 1, base - altura, 3, altura, c)
  t.poligono([[x - 2, base - altura], [x + 2.5, base - altura], [x + 0.5, base - altura - altura * 0.45]], c)
  t.set(x - 2, base - altura - 2, c)
  t.set(x + 2, base - altura - 2, c)
  t.set(x + 1, base - altura + 1, luz)
  if (janela) t.set(x, base - altura + 4, janela)
}

function montanhas(P, registrar) {
  const t = new Tela()
  const rand = aleatorio(33)
  const longe = perfil(
    [
      { x: 10, y: 128, i: 1.0 }, { x: 70, y: 112, i: 0.95 }, { x: 140, y: 136, i: 1.1 }, { x: 196, y: 152, i: 0.8 },
      { x: 300, y: 150, i: 0.85 }, { x: 356, y: 120, i: 1.05 }, { x: 424, y: 106, i: 0.95 }, { x: 476, y: 130, i: 1 },
    ],
    7,
    41
  )
  cordilheira(t, longe, P.montLonge, P.montLongeLuz, 41)
  /* Cidadela distante, quase sumindo na névoa */
  for (const [x, alt] of [[118, 26], [126, 34], [133, 20], [146, 28], [158, 18], [322, 22], [334, 32], [343, 24], [362, 36], [376, 20], [389, 26]]) {
    torreLonge(t, x, longe[x] + 6, alt * (0.85 + rand() * 0.3), P.torreLonge, P.montLongeLuz, !P.dia && rand() < 0.4 ? P.janela : null)
  }
  nevoaFaixa(t, P.nevoa, 168, 9, 0.38, 11)

  const meio = perfil([{ x: 28, y: 168, i: 0.9 }, { x: 72, y: 146, i: 1.25 }, { x: 132, y: 178, i: 0.8 }, { x: 336, y: 152, i: 1.25 }, { x: 462, y: 166, i: 1.1 }], 5, 57)
  cordilheira(t, meio, P.montMeio, P.montMeioLuz, 57)
  agulhaComSerpente(t, P, registrar)
  nevoaFaixa(t, P.nevoa, 200, 8, 0.42, 12)
  /* O lago vem depois da névoa do vale, para a água ficar à vista */
  lago(t, P, registrar)
  nevoaFaixa(t, P.nevoa, 212, 3, 0.2, 13)
  return t
}

/*
 * Lago no vale, atrás do penhasco: espelha o céu e as montanhas (de cabeça para baixo, mais escuros),
 * com ondinhas que deslocam as linhas e o caminho de luz do sol (ou da lua) na água.
 */
const LAGO = { topo: 194, fundo: 214 }
function lago(t, P, registrar) {
  const ceuCores = P.ceu.map(hex)
  const corCeu = (y) => ceuCores[Math.max(0, Math.min(ceuCores.length - 1, Math.floor((Math.min(1, y / HORIZONTE) ** 0.9) * (ceuCores.length - 1))))]
  const n = fbm(171)
  const borda = (x) => LAGO.topo + Math.round((n(x / 20, 3) - 0.5) * 4)
  const reflexo = []
  for (let y = LAGO.topo - 3; y < LAGO.fundo; y++) {
    for (let x = 0; x < W; x++) {
      const b = borda(x)
      if (y < b) continue
      /* Linha espelhada, com a ondinha mexendo o x de cada linha */
      const onda = Math.round(Math.sin(y * 1.7 + x * 0.05) * 1.2)
      const ys = 2 * b - y - 2
      const montanha = t.get(x + onda, ys)
      let c = misturar(montanha ?? corCeu(ys), '#000000', 0.18)
      /* Faixas de luz deitadas na água */
      if ((y - b) % 3 === 1 && n(x / 7 + y, y * 0.3) > 0.6) c = misturar(c, corCeu(ys), 0.5)
      /* Caminho de luz embaixo do sol ou da lua */
      const larg = 2 + (y - b) * 0.35 + n(x / 3, y) * 2
      if (Math.abs(x - FONTE.x) < larg && FONTE.y < LAGO.topo && (y + x) % 2 === 0) {
        c = P.dia ? P.luaClara : P.lua
        if (registrar && (y - b) % 4 === 0 && Math.abs(x - FONTE.x) < 2) reflexo.push([x, y])
      }
      t.set(x, y, c)
    }
    /* Margem: uma linha escura separando a água da terra */
  }
  for (let x = 0; x < W; x++) t.set(x, borda(x) - 1, misturar(P.montMeio, '#000000', 0.3))
  if (registrar) anim.lago.push(...reflexo)
}


/*
 * Dragão voando entre o castelo e a árvore da direita (pixel art enviada pelo grupo,
 * guardada em scripts/arte/dragao.json com paleta de 12 cores).
 * De dia ganha um pouco da névoa rosada do pôr do sol; à noite vira silhueta em tons do marinho
 * e depois a paleta da noite troca as cores como no resto da cena.
 */
function dragaoVoando(t, P, x, y, asasBaixas = false) {
  const arte = JSON.parse(fs.readFileSync(path.join(__dirname, 'arte', 'dragao.json'), 'utf8'))
  /* À noite vira silhueta: só a claridade de cada cor, em tons do marinho (sem cor quente para não brilhar) */
  const cores = arte.paleta.map((c) => {
    if (P.dia) return misturar(c, P.montLonge, 0.15)
    const [r, g, b] = hex(c)
    return misturar('#1b1b30', '#7e769e', (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255)
  })
  /* Segundo quadro: as asas (tudo acima dos ombros) encolhem em direção ao ombro, como no meio da batida */
  const OMBRO = 19
  const linhas = asasBaixas
    ? arte.linhas.map((_, j) => (j >= OMBRO ? arte.linhas[j] : '.'.repeat(arte.linhas[0].length)))
    : arte.linhas
  if (asasBaixas) {
    for (let j = 0; j < OMBRO; j++) {
      const nj = Math.round(OMBRO - (OMBRO - j) * 0.55)
      linhas[nj] = [...linhas[nj]].map((ch, i) => (arte.linhas[j][i] !== '.' ? arte.linhas[j][i] : ch)).join('')
    }
  }
  linhas.forEach((linha, j) => {
    ;[...linha].forEach((ch, i) => {
      const k = ch.charCodeAt(0) - 97
      if (k >= 0 && k < cores.length) t.set(x + i, y + j, cores[k])
    })
  })
}

/* Camada do dragão: o site anima esta camada subindo e descendo devagar */
const DRAGAO = { x: 306, y: 89, olho: [14, 25] }
function dragao(P) {
  const t = new Tela()
  dragaoVoando(t, P, DRAGAO.x, DRAGAO.y)
  return t
}
/* Quadro com as asas baixas (vai dentro da animação do dragão) */
function dragaoAsas(P) {
  const t = new Tela()
  dragaoVoando(t, P, DRAGAO.x, DRAGAO.y, true)
  return t
}

/*
 * Animação do dragão: os dois quadros trocando de vez em quando (duas batidas de asa e volta a planar)
 * e o olho acendendo à noite. Fica na camada do dragão, então sobe e desce junto com ele.
 */
function animDragao(dia, quadroA, quadroB) {
  const img = (classe, b64) => `<image class="${classe}" href="data:image/png;base64,${b64}" x="0" y="0" width="${W}" height="${H}" style="image-rendering:pixelated"/>`
  const [ox, oy] = [DRAGAO.x + DRAGAO.olho[0], DRAGAO.y + DRAGAO.olho[1]]
  const olho = dia ? '' : `<g class="olho"><circle cx="${ox + 0.5}" cy="${oy + 0.5}" r="2" fill="#f2d3ab" fill-opacity=".35"/><rect x="${ox}" y="${oy}" width="1" height="1" fill="#fbf5ef"/></g>`
  return svg(
    `.a{animation:quadroA 6.5s infinite;animation-timing-function:steps(1,end)}
.b{opacity:0;animation:quadroB 6.5s infinite;animation-timing-function:steps(1,end)}
.olho{opacity:0;animation:olho 9s ease-in-out infinite}
@keyframes quadroA{0%,78%{opacity:1}80%{opacity:0}84%{opacity:1}88%{opacity:0}92%,100%{opacity:1}}
@keyframes quadroB{0%,78%{opacity:0}80%{opacity:1}84%{opacity:0}88%{opacity:1}92%,100%{opacity:0}}
@keyframes olho{0%,40%{opacity:0}55%,80%{opacity:1}100%{opacity:0}}`,
    img('a', quadroA) + img('b', quadroB) + olho
  )
}

/* Agulha de pedra com uma serpente enrolada até o topo */
function agulhaComSerpente(t, P, registrar) {
  const cx = 412
  const base = 204
  const voltas = 4.4 * Math.PI
  const sobe = 70
  const corpo = (tela, frente, c) => {
    for (let k = 0; k <= 500; k++) {
      const a = (k / 500) * voltas
      if (Math.cos(a) > 0 !== frente) continue
      tela.circulo(cx + 8.5 * Math.sin(a), base - 6 - (a / voltas) * sobe, (4.2 - (2 * a) / voltas) / 2, c)
    }
  }
  const tras = new Tela()
  corpo(tras, false, misturar(P.dragao, P.montMeio, 0.4))
  t.colar(tras)

  const ag = new Tela()
  ag.poligono([[402, 206], [405, 172], [408, 146], [410.5, 124], [413, 120], [415.5, 128], [418, 150], [421, 180], [424, 206]], misturar(P.montMeio, '#000000', 0.35))
  contornoLuz(ag, P.montMeioLuz, null)
  t.colar(ag)

  const frente = new Tela()
  corpo(frente, true, misturar(P.dragao, P.dragaoLuz, 0.25))
  const hx = cx + 8.5 * Math.sin(voltas)
  const hy = base - 6 - sobe
  frente.poligono([[hx - 1, hy - 2], [hx + 3, hy - 3], [hx + 6, hy - 1.5], [hx + 3, hy + 0.5], [hx - 1, hy + 0.5]], P.dragao)
  contornoLuz(frente, P.dragaoLuz, null)
  t.colar(frente)
  if (registrar) anim.olhoSerpente.push([Math.floor(hx + 2), Math.floor(hy - 2)])
}

/* ---------- Camada 3: penhasco, castelo gótico e ponte quebrada ---------- */

function castelo(P, registrar) {
  const t = new Tela()
  const rand = aleatorio(77)
  const rocha = fbm(63)
  const fenda = fbm(64)
  const CHAO = 176

  /* Penhasco de rocha escura com fendas */
  const topo = []
  for (let x = 0; x < W; x++) {
    let y = CHAO
    if (x < 186) y = CHAO + (186 - x) * 0.95 - Math.max(0, 120 - x) * 0.35
    else if (x > 296) y = CHAO + (x - 296) * 0.9 - Math.max(0, x - 380) * 0.3
    y += (rocha(x / 5, 1.7) - 0.5) * (x >= 186 && x <= 296 ? 1 : 9)
    topo.push(Math.round(y))
  }
  for (let x = 0; x < W; x++) {
    for (let y = topo[x]; y < H; y++) {
      const v = rocha(x / 6, y / 4)
      let c = P.rocha
      if (v > 0.64) c = P.rochaMeio
      else if (v < 0.32) c = P.rochaSombra
      if (Math.abs(fenda(x / 3 + y / 9, y / 18) - 0.5) < 0.025) c = P.rochaSombra
      if (y - topo[x] < 1) c = P.rochaLuz
      else if (y - topo[x] < 5 && v > 0.55 && bayer(x, y) > 0.45) c = P.rochaLuz
      t.set(x, y, c)
    }
  }
  /* Arvorezinhas secas nas encostas */
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(100 + rand() * 290)
    if (x > 180 && x < 304) continue
    arvoreSilhueta(t, x, topo[x] + 2, 7 + rand() * 9, P.rochaSombra, P.rochaLuz, 700 + i)
  }

  /* Ponte de arcos que sai do penhasco e termina quebrada no vazio */
  const ponte = new Tela()
  const DECK = 182
  ponte.ret(116, DECK, 78, 238 - DECK, P.castelo)
  const pilares = [190, 172, 154, 136, 118]
  for (let i = 1; i < pilares.length; i++) {
    const meio = (pilares[i - 1] + pilares[i]) / 2
    const meiaVao = (pilares[i - 1] - pilares[i] - 5) / 2
    for (let y = DECK; y < 240; y++) for (let x = Math.floor(meio - meiaVao); x < meio + meiaVao; x++) {
      if (Math.abs(x + 0.5 - meio) < meiaVao && (y + 0.5 > 196 || ((x + 0.5 - meio) / meiaVao) ** 2 + ((y + 0.5 - 196) / (meiaVao * 0.95)) ** 2 < 1)) ponte.apagar(x, y)
    }
  }
  for (let x = 116; x < 194; x += 3) ponte.ret(x, DECK - 2, 2, 2, P.castelo)
  /* Ponta quebrada em degraus irregulares */
  for (let x = 110; x < 132; x++) {
    const corte = DECK - 3 + (132 - x) * 1.6 + rand() * 4
    for (let y = DECK - 3; y < Math.min(240, corte); y++) ponte.apagar(x, y)
  }
  for (let y = DECK + 2; y < 240; y += 4) for (let x = 116; x < 194; x++) if (ponte.get(x, y) && bayer(x, y) > 0.35) ponte.set(x, y, P.casteloMeio)
  contornoLuz(ponte, P.rochaLuz, P.casteloMeio)
  t.colar(ponte)
  /* Lampiões na ponte (o da ponta quebrada ficou apagado) */
  for (const [x, acesa] of [[176, true], [156, true], [136, false]]) {
    t.ret(x, DECK - 7, 1, 5, P.castelo)
    t.set(x, DECK - 8, acesa ? P.lanterna : P.casteloMeio)
    if (acesa) {
      t.brilho(x + 0.5, DECK - 7.5, 6, P.brilho, 0.3)
      if (registrar) anim.lanternas.push([x + 0.5, DECK - 7.5])
    }
  }

  /* Silhueta do castelo, em tela separada para o contorno de luz */
  const c = new Tela()
  const C = P.castelo
  /* Telhados e agulhas: de dia ficam mais escuros que a pedra */
  const remates = []
  const agulha = (cx, base, topoY, meia) => {
    c.poligono([[cx - meia, base], [cx + meia, base], [cx, topoY]], P.telhado)
    /* Remate (uma bolinha de pedra) na ponta das agulhas maiores */
    if (meia > 2) remates.push([Math.round(cx - 0.5), Math.round(topoY) - 1])
  }
  const torres = []
  /* Partes do castelo que ganham volume (lado da luz, meio e sombra): [x0, x1, topo, base] */
  const corpos = [[226, 257, 98, 152], [190, 294, 150, 178]]
  const torre = (x0, x1, topoY, base, ponta) => {
    corpos.push([x0, x1, topoY, base])
    c.ret(x0, topoY, x1 - x0, base - topoY, C)
    c.ret(x0 - 1, topoY, x1 - x0 + 2, 2, C)
    agulha((x0 + x1) / 2, topoY + 1, topoY - ponta, (x1 - x0) / 2 + 1)
    agulha(x0, topoY + 1, topoY - Math.max(4, ponta * 0.28), 1.2)
    agulha(x1, topoY + 1, topoY - Math.max(4, ponta * 0.28), 1.2)
    torres.push([x0, x1, topoY, base])
  }
  c.ret(190, 150, 104, CHAO - 150 + 2, C)
  /* Ameias com falhas e um trecho da muralha desmoronado */
  for (let x = 190; x < 294; x += 3) if (rand() > 0.22) c.ret(x, 147, 2, 3, C)
  torre(178, 185, 150, CHAO + 2, 14)
  torre(186, 196, 124, CHAO + 2, 28)
  torre(201, 209, 108, 151, 34)
  torre(213, 222, 126, 151, 20)
  torre(260, 268, 104, 151, 38)
  torre(272, 281, 122, 151, 24)
  torre(287, 297, 128, CHAO + 2, 28)
  torre(298, 304, 148, CHAO + 2, 14)
  /* Torre isolada na beira do penhasco, ligada por uma passarela em arco */
  torre(160, 168, 120, 204, 30)
  c.ret(168, 138, 18, 3, C)
  c.pinta((x, y) => y >= 141 && y < 152 && ((x - 177) / 7.5) ** 2 + ((y - 152) / 9) ** 2 >= 1 && C, [168, 141, 186, 152])
  for (let x = 168; x < 186; x += 2) c.set(x, 137, C)
  /* Sacadas de pedra na torre de menagem */
  for (const x0 of [221, 257]) {
    c.ret(x0, 130, 5, 1, C)
    for (let k = 0; k < 5; k += 2) c.set(x0 + k, 129, C)
  }
  /* Gárgulas saindo das cornijas */
  const gargula = (x, y, lado) => ['X...', 'XXXX', '.XX.'].forEach((l, j) => [...l].forEach((ch, i) => ch === 'X' && c.set(x + i * lado, y + j, C)))
  for (const [x, y, lado] of [[185, 126, -1], [298, 130, 1], [224, 100, -1], [259, 100, 1], [269, 106, 1], [200, 110, -1], [159, 122, -1]]) gargula(x, y, lado)
  /* Torre de menagem com agulha altíssima */
  c.ret(226, 98, 31, 54, C)
  c.ret(225, 98, 33, 2, C)
  agulha(241.5, 99, 74, 17)
  agulha(241.5, 80, 26, 3)
  c.ret(241, 20, 1, 7, C)
  for (const [x, alt] of [[225, 76], [258, 76], [232, 84], [251, 84]]) agulha(x, 99, alt, 1.4)
  /* Contrafortes em degraus dos dois lados da torre de menagem */
  for (const x0 of [222, 257]) {
    c.ret(x0, 134, 4, 18, C)
    c.ret(x0 + (x0 < 240 ? 1 : 0), 131, 3, 3, C)
    c.ret(x0 + (x0 < 240 ? 2 : 0), 128, 2, 3, C)
  }
  /* Arcobotantes */
  c.linha(226, 116, 214, 132, 1.6, C)
  c.linha(257, 116, 269, 130, 1.6, C)
  c.linha(201, 126, 196, 136, 1.4, C)
  c.linha(281, 128, 287, 138, 1.4, C)
  /* Bandeiras rasgadas */
  c.ret(264, 56, 1, 11, C)
  for (const [y, x0, x1] of [[56, 258, 264], [57, 257, 264], [58, 260, 264], [59, 262, 264], [58, 256, 257]]) c.ret(x0, y, x1 - x0, 1, P.bandeira)
  c.ret(205, 64, 1, 11, C)
  for (const [y, x0, x1] of [[64, 206, 212], [65, 206, 213], [66, 206, 210], [67, 206, 208], [66, 212, 213]]) c.ret(x0, y, x1 - x0, 1, P.bandeira)

  /* Trecho desmoronado na muralha */
  for (let x = 270; x < 278; x++) {
    const fundo = 2 + Math.floor(rand() * 5)
    for (let y = 147; y < 150 + fundo; y++) c.apagar(x, y)
  }
  /* À noite só a borda contra a lua acende; de dia o sol pega o lado esquerdo e o topo */
  if (P.dia) contornoLuz(c, P.casteloLuz, P.casteloMeio, Infinity, 2)
  else contornoLuz(c, P.casteloLuz, P.casteloMeio, LUA.r + 24)
  /* Blocos de pedra marcados na alvenaria */
  const base = hex(C)
  for (let y = 0; y < H; y++) {
    for (let x = 150; x < 310; x++) {
      const p = c.get(x, y)
      if (!p || p[0] !== base[0] || p[1] !== base[1] || p[2] !== base[2]) continue
      const junta = y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0
      if (junta) c.set(x, y, P.casteloMeio)
    }
  }

  const claro = misturar(C, P.casteloLuz, 0.3)
  const escuro = misturar(C, '#000000', 0.35)
  const juntaClara = misturar(P.casteloMeio, P.casteloLuz, 0.2)
  const juntaEscura = misturar(P.casteloMeio, '#000000', 0.3)
  const igual = (p, h) => p && p[0] === h[0] && p[1] === h[1] && p[2] === h[2]
  const hBase = hex(C)
  const hJunta = hex(P.casteloMeio)
  const hTelhado = hex(P.telhado)

  /* Volume: em cada torre, o lado virado para a luz clareia e o outro escurece (só de dia; à noite o castelo é silhueta contra a lua) */
  for (const [x0, x1, topoY, baseY] of P.dia ? corpos : []) {
    const luzEsquerda = FONTE.x < (x0 + x1) / 2
    for (let y = topoY; y < baseY; y++) {
      for (let x = x0; x < x1; x++) {
        const p = c.get(x, y)
        const pedra = igual(p, hBase)
        const junta = igual(p, hJunta)
        if (!pedra && !junta) continue
        const rel = (x + 0.5 - x0) / (x1 - x0)
        const lado = luzEsquerda ? rel : 1 - rel
        if (lado < 0.22 || (lado < 0.3 && bayer(x, y) > 0.5)) c.set(x, y, pedra ? claro : juntaClara)
        else if (lado > 0.74 || (lado > 0.66 && bayer(x, y) > 0.5)) c.set(x, y, pedra ? escuro : juntaEscura)
      }
    }
    /* Faixas de pedra entre os andares */
    for (let y = topoY + 10; y < baseY - 4; y += 16) {
      for (let x = x0; x < x1; x++) if (c.get(x, y) && !igual(c.get(x, y), hTelhado)) c.set(x, y, claro)
      for (let x = x0; x < x1; x++) if (c.get(x, y + 1)) c.set(x, y + 1, escuro)
    }
  }
  /* Cachorros (pedrinhas salientes) logo abaixo da cornija de cada torre */
  for (const [x0, x1, topoY] of torres) {
    for (let x = x0; x < x1; x++) c.set(x, topoY + 2, x % 2 ? claro : escuro)
  }
  /* Telhados em escamas: lado da luz mais claro, lado de trás mais escuro */
  const telhaLuz = misturar(P.telhado, P.casteloLuz, 0.28)
  const telhaSombra = misturar(P.telhado, '#000000', 0.3)
  for (let y = 0; y < (P.dia ? H : 0); y++) {
    let x = 150
    while (x < 310) {
      if (!igual(c.get(x, y), hTelhado)) {
        x++
        continue
      }
      let fim = x
      while (igual(c.get(fim + 1, y), hTelhado)) fim++
      const largura = fim - x + 1
      for (let i = x; i <= fim; i++) {
        const rel = largura > 1 ? (i - x) / (largura - 1) : 0.5
        const centro = (x + fim) / 2
        const lado = FONTE.x < centro ? rel : 1 - rel
        let cor = lado < 0.34 ? telhaLuz : lado > 0.7 ? telhaSombra : P.telhado
        if (y % 3 === 0 && (i + (Math.floor(y / 3) % 2) * 2) % 4 === 0) cor = telhaSombra
        c.set(i, y, cor)
      }
      x = fim + 1
    }
  }
  for (const [x, y] of remates) {
    c.set(x, y, C)
    c.set(x, y - 1, P.casteloLuz)
  }
  /* Hera subindo pelas paredes de baixo */
  const hera = fbm(91)
  for (let y = 150; y < 180; y++) {
    for (let x = 176; x < 306; x++) {
      const p = c.get(x, y)
      if (!p || igual(p, hTelhado)) continue
      if (hera(x / 5, y / 4) > 0.86 - (y - 150) / 90 && bayer(x, y) > 0.4) c.set(x, y, hera(x / 2, y / 2) > 0.55 ? P.musgoLuz : P.musgo)
    }
  }

  /* Janelas góticas finas: poucas acesas, algumas em roxo */
  const halos = []
  const janela = (x, y, alta, larga = 1) => {
    const acesa = rand() < 0.5
    const roxa = rand() < 0.28
    const fraca = !roxa && rand() < 0.35
    const corpo = roxa ? P.janelaRoxa : fraca ? P.janelaFraca : P.janela
    for (let k = 0; k < alta; k++) {
      for (let i = 0; i < larga; i++) {
        /* Arco pontudo: na janela de 3, a primeira linha só tem o meio */
        if (larga === 3 && k === 0 && i !== 1) continue
        let cor = acesa ? (k <= 1 && !fraca ? P.janelaClara : corpo) : P.janelaApagada
        /* Mainel (a coluninha do meio) dividindo a janela larga em duas */
        if (larga === 3 && i === 1 && k > 1) cor = escuro
        c.set(x + i, y + k, cor)
      }
    }
    /* Peitoril claro e escorrido escuro embaixo */
    c.ret(x - (larga > 1 ? 1 : 0), y + alta, larga + (larga > 1 ? 2 : 0), 1, claro)
    for (let k = 1; k < 4; k++) if (bayer(x, y + alta + k) > 0.4) c.set(x + Math.floor(larga / 2), y + alta + k, escuro)
    if (acesa && !fraca) halos.push([x + larga / 2, y + alta / 2, roxa])
    if (acesa && registrar && rand() < 0.6) anim.janelas.push([x, y, larga, alta, roxa ? 1 : 0])
    if (!acesa && registrar) anim.janelasApagadas.push([x, y, larga, alta])
  }
  for (const [x0, x1, topoY, base] of torres) {
    for (let y = topoY + 5; y < base - 8; y += 12) {
      if (x1 - x0 >= 9) janela(x0 + Math.floor((x1 - x0) / 2) - 1, y, 6, 3)
      else janela(x0 + Math.floor((x1 - x0) / 2), y, 5)
    }
  }
  for (let y = 106; y < 146; y += 10) for (const x of [229, 234, 249, 254]) janela(x, y, 5)
  /* Janelões góticos na torre de menagem */
  for (const [x, y] of [[236, 124], [244, 124], [236, 137], [244, 137]]) janela(x, y, 8, 3)
  for (let x = 194; x < 292; x += 8) if (x < 234 || x > 250) janela(x, 157, 3)
  /* Rosácea roxa e portão aceso */
  /* Rosácea: moldura clara, vidro roxo e raios de pedra */
  c.circulo(241.5, 112, 4.4, claro)
  c.circulo(241.5, 112, 3.4, P.janelaRoxa)
  for (const [dx, dy] of [[-3, 0], [-2, 0], [2, 0], [3, 0], [0, -3], [0, -2], [0, 2], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) c.set(241 + dx + (dx > 0 ? 0 : 0), 112 + dy, escuro)
  c.set(241, 112, P.janelaClara)
  /* Portão: arco de aduelas em volta, porta acesa e grade levadiça meio erguida */
  c.poligono([[234.5, 178], [234.5, 166], [241.5, 158.5], [248.5, 166], [248.5, 178]], claro)
  for (const [x, y] of [[235, 170], [236, 164], [238, 161], [241, 159], [245, 161], [247, 164], [248, 170]]) c.set(x, y, escuro)
  c.ret(237, 166, 9, 12, P.portao)
  c.poligono([[236.5, 167], [246.5, 167], [241.5, 161]], P.portao)
  c.ret(240, 169, 3, 9, P.portaoClara)
  for (let x = 237; x < 246; x += 2) for (let y = 162; y < 168; y++) if (c.get(x, y)) c.set(x, y, escuro)
  c.ret(237, 167, 9, 1, escuro)
  if (registrar) anim.janelas.push([240, 108, 3, 8, 1], [237, 164, 9, 13, 0])

  t.colar(c)
  /* Halos pequenos nas janelas acesas */
  for (const [x, y, roxa] of halos) t.brilho(x, y, 3, roxa ? P.brilhoRoxo : P.brilho, 0.16)
  /* Tochas dos dois lados do portão */
  for (const x of [233, 249]) {
    t.ret(x, 168, 1, 5, P.castelo)
    t.set(x, 167, P.lanterna)
    t.brilho(x + 0.5, 167.5, 5, P.brilho, 0.26)
    if (registrar) anim.tochas.push([x + 0.5, 167.5])
  }
  /* Correntes penduradas na passarela, uma com gaiola */
  for (const [x, tam] of [[171, 9], [182, 13]]) for (let k = 0; k < tam; k++) t.set(x, 152 + k, k % 2 ? P.corrente : P.casteloMeio)
  for (let i = 0; i < 5; i += 2) t.ret(180 + i, 165, 1, 6, P.corrente)
  t.ret(180, 165, 5, 1, P.corrente)
  t.ret(180, 170, 5, 1, P.corrente)
  t.brilho(241.5, 176, 12, P.brilho, 0.24)
  t.brilho(241.5, 112, 6, P.brilhoRoxo, 0.2)

  /* Escadaria em ziguezague pelo penhasco, do portão até a escadaria grande */
  escadaPenhasco(t, P, registrar)
  /* Névoa na base do castelo */
  nevoaFaixa(t, P.nevoa, 202, 5, 0.16, 15)
  return t
}

/*
 * Escadaria em ziguezague subindo o penhasco até o portão: lances que se alargam conforme descem,
 * cada um com degraus (quina iluminada, face na sombra) e muretas dos dois lados;
 * entre os lances, patamares com uma lanterna no canto de fora.
 */
function escadaPenhasco(t, P, registrar) {
  /* Pontos de virada: do portão (alto) até o começo da escadaria da floresta (baixo) */
  const curvas = [[241, 179], [223, 192], [257, 206], [227, 221], [240, 237]]
  const larguras = [5, 6, 7, 8]
  const quina = P.dia ? P.caminhoLuz : P.pedraLuz
  const luzEsq = FONTE.x < 240
  for (let i = 0; i < curvas.length - 1; i++) {
    const [ax, ay] = curvas[i]
    const [bx, by] = curvas[i + 1]
    const meia = larguras[i] / 2
    const altura = i < 2 ? 2 : 3
    for (let y = ay; y < by; y++) {
      const u = (y - ay) / (by - ay)
      const cx = ax + (bx - ax) * u
      const passo = (y - ay) % altura
      for (let x = Math.floor(cx - meia - 2); x <= cx + meia + 2; x++) {
        const d = x + 0.5 - cx
        if (Math.abs(d) <= meia) {
          /* Degrau: quina clara, piso, face da frente escura */
          t.set(x, y, passo === 0 ? quina : passo === altura - 1 ? P.caminhoJunta : P.caminho)
        } else if (Math.abs(d) <= meia + 1.6) {
          /* Mureta: o lado virado para a luz mais claro */
          const acesa = (d < 0) === luzEsq
          t.set(x, y, (y - ay) % 5 === 0 ? P.pedraSombra : acesa ? P.pedraLuz : P.pedra)
        }
      }
    }
  }
  /* Patamares nas viradas, com lanterna no canto de fora */
  for (let i = 1; i < curvas.length - 1; i++) {
    const [x, y] = curvas[i]
    const meia = larguras[i] / 2 + 2
    t.ret(Math.round(x - meia), y - 1, Math.round(meia * 2) + 1, 3, P.caminho)
    t.ret(Math.round(x - meia), y - 1, Math.round(meia * 2) + 1, 1, quina)
    t.ret(Math.round(x - meia), y + 2, Math.round(meia * 2) + 1, 1, P.caminhoJunta)
    const lado = x < 240 ? -1 : 1
    const lx = Math.round(x + lado * meia)
    t.ret(lx, y - 6, 1, 5, P.castelo)
    t.ret(lx - 1, y - 8, 3, 2, P.lanterna)
    t.set(lx, y - 9, P.castelo)
    t.brilho(lx + 0.5, y - 7, 6, P.brilho, 0.3)
    if (registrar) anim.lanternas.push([lx + 0.5, y - 7])
  }
  /* Soleira diante do portão */
  t.ret(235, 178, 13, 2, P.caminho)
  t.ret(235, 178, 13, 1, quina)
}

/* ---------- Camada 4: floresta morta/* ---------- Camada 4: floresta morta, ruínas, círculo de pedras e a bruxa ---------- */

/* Runas pequenas (3x3) gravadas nas pedras */
const RUNAS = [['X.X', '.X.', 'X.X'], ['XX.', 'X.X', 'XX.'], ['.X.', 'XXX', '.X.'], ['X..', 'XX.', 'X.X'], ['XXX', '.X.', '.X.']]

function floresta(P, registrar) {
  const t = new Tela()
  const rand = aleatorio(101)
  const n = fbm(105)

  /* Fileira distante: árvores secas e pinheiros mortos, quase sumindo na névoa */
  for (let x = -8; x < W + 8; x += 11 + Math.floor(rand() * 10)) {
    if (x > 216 && x < 264) continue
    const chao = 250 + Math.floor(rand() * 5)
    const teto = x > 96 && x < 206 ? 0.55 : 1
    if (rand() < 0.25) pinheiroMorto(t, x, chao, (12 + rand() * 16) * teto, P.silhuetaLonge, P.silhuetaLongeLuz, rand)
    else arvoreSilhueta(t, x, chao, (12 + rand() * 18) * teto, P.silhuetaLonge, P.silhuetaLongeLuz, 500 + x, 2)
  }
  t.pinta((x) => (x < 226 || x > 254) && P.silhuetaLonge, [0, 250, W, H])
  /* Névoa grossa entre as duas fileiras: separa os planos */
  nevoaFaixa(t, P.nevoa, 247, 7, 0.46, 13)

  /* Segunda fileira, mais perto e mais escura */
  for (let x = -8; x < W + 8; x += 18 + Math.floor(rand() * 14)) {
    if (x > 200 && x < 280) continue
    const chao = 263 + Math.floor(rand() * 4)
    const teto = x > 110 && x < 200 ? 0.6 : 1
    if (rand() < 0.4) pinheiroMorto(t, x, chao, (18 + rand() * 16) * teto, P.silhueta, P.silhuetaLuz, rand)
    else arvoreSilhueta(t, x, chao, (18 + rand() * 20) * teto, P.silhueta, P.silhuetaLuz, 600 + x)
  }

  /* Chão da floresta */
  for (let x = 0; x < W; x++) {
    const topo = 262 + Math.round((n(x / 16, 2) - 0.5) * 6)
    for (let y = topo; y < H; y++) {
      const v = n(x / 6, y / 3)
      t.set(x, y, y === topo ? P.chaoLuz : v > 0.68 ? P.chaoLuz : v < 0.3 ? P.chaoSombra : P.chao)
    }
  }

  /* Escadaria de pedra até o castelo (desenhada em escadaria()) */
  const lampioesEscada = escadaria(t, P)

  /* Ruína de um arco gótico */
  const r = new Tela()
  r.ret(134, 236, 5, 30, P.pedra)
  r.ret(133, 236, 7, 2, P.pedra)
  r.ret(153, 250, 5, 16, P.pedra)
  r.pinta((x, y) => {
    const d = Math.hypot(x - 146, y - 238)
    const ang = Math.atan2(y - 238, x - 146)
    return d > 7.5 && d < 11.5 && y < 238 && ang < -0.9 && P.pedra
  }, [130, 224, 162, 240])
  for (let y = 238; y < 266; y += 4) for (const x0 of [134, 153]) for (let x = x0; x < x0 + 5; x++) if (r.get(x, y) && bayer(x, y) > 0.4) r.set(x, y, P.pedraSombra)
  r.poligono([[153, 250], [155, 247], [156, 249], [158, 248], [158, 250]], P.pedra)
  contornoLuz(r, P.pedraLuz, P.pedraSombra)
  t.colar(r)

  /* Sombras das árvores do meio (de dia) */
  sombraNoChao(t, P, 118 + 30 * ladoSombra(), 273, 32, 2.2)
  sombraNoChao(t, P, 378 + 30 * ladoSombra(), 273, 32, 2.2)
  sombraNoChao(t, P, 418 + 18 * ladoSombra(), 271, 18, 1.6)

  /* Árvores do meio: retorcidas, meio apagadas pela névoa */
  const meio = { racha: P.meioRacha, escuro: P.meioEscuro, base: P.meioBase, luz: P.meioLuz, brilho: P.meioBrilho, musgo: P.meioLuz, musgoLuz: P.meioBrilho }
  arvoreRetorcida(t, meio, 118, 272, 58, 6, -1.1, 911, { nivel: 4, inclina: 0.08, raizes: 4, curva: 0.16 })
  arvoreRetorcida(t, meio, 378, 272, 66, 6.5, -2.1, 913, { nivel: 4, inclina: -0.1, raizes: 4, curva: 0.16, evitar: AREA_DRAGAO })

  /* Círculo de pedras com runas, onde a bruxa faz o ritual */
  t.brilho(326, 268, 16, P.brilhoRoxo, 0.15)
  const pedras = [[298, 268, 5, 10], [309, 266, 4, 13], [339, 266, 4, 14], [350, 268, 5, 11], [318, 270, 4, 8]]
  for (const [i, [x, base, w, alt]] of pedras.entries()) {
    sombraNoChao(t, P, x + w / 2 + (w / 2 + 4) * ladoSombra(), base + 1, 6, 1.2)
    const p = new Tela()
    p.pinta((px, py) => px >= x && px < x + w && py <= base && py > base - alt && !(py < base - alt + 2 && (px < x + 1 || px > x + w - 1)) && P.pedra, [x - 1, base - alt - 1, x + w + 1, base + 1])
    contornoLuz(p, P.pedraLuz, P.pedraSombra)
    t.colar(p)
    const runa = RUNAS[i % RUNAS.length]
    const rx = x + Math.floor((w - 3) / 2)
    const ry = base - alt + 3
    runa.forEach((l, j) => [...l].forEach((ch, k) => ch === 'X' && t.set(rx + k, ry + j, misturar(P.pedra, P.runa, 0.45))))
    if (registrar) anim.runas.push([rx, ry, i % RUNAS.length])
  }

  /* A bruxa, de chapéu pontudo e cajado, só a silhueta */
  const B = P.bruxa
  t.poligono([[325, 268], [333.5, 268], [331.5, 258], [329.5, 255], [327.5, 258]], B)
  t.elipse(329.5, 255, 2, 2.2, B)
  t.ret(325, 253, 9, 1, B)
  t.poligono([[327.5, 253], [331.5, 253], [330.8, 248], [332.6, 245.5], [330, 246.5]], B)
  t.linha(334.5, 268, 334.5, 252, 1, B)
  t.set(334, 251, P.fungoLuz)
  t.brilho(334.5, 251.5, 5, P.brilhoRoxo, 0.3)
  if (registrar) anim.orbe.push([334, 251])

  /* Árvore partida ao meio, sem copa */
  arvoreRetorcida(t, meio, 418, 270, 40, 6, -1.6, 914, { nivel: 1, quebra: 1, ramifica: 0.3, raizes: 3 })

  /* Estátua de anjo sem cabeça, meio sumida na névoa */
  const e = new Tela()
  e.ret(167, 258, 11, 6, P.pedra)
  e.ret(166, 257, 13, 1, P.pedra)
  e.poligono([[169, 257], [176, 257], [175, 244], [173, 241.5], [171, 244]], P.pedra)
  e.poligono([[175, 247], [181, 239], [180, 245], [177, 250]], P.pedra)
  e.poligono([[171, 247], [167, 243], [168, 249]], P.pedra)
  e.ret(172, 240, 2, 2, P.pedra)
  contornoLuz(e, P.pedraLuz, P.pedraSombra)
  t.colar(e)

  /* Lápides tortas dos dois lados do caminho */
  for (const [x, base, w, h, inc, cruz] of [[198, 271, 4, 7, 0.18, 0], [207, 274, 3, 6, -0.22, 1], [190, 277, 5, 6, 0.1, 0], [272, 272, 4, 8, -0.14, 0], [283, 275, 3, 6, 0.26, 1], [270, 281, 4, 5, 0.3, 0]]) {
    lapide(t, P, x, base, w, h, inc, cruz)
  }

  /* Fenda no chão de onde escapa uma luz violeta */
  t.brilho(150, 272, 8, P.brilhoRoxo, 0.24)
  for (const [x, y] of [[146, 271], [147, 271], [148, 272], [149, 273], [150, 273], [151, 273], [152, 274], [153, 274], [154, 274]]) {
    t.set(x, y, P.corrupcao)
    t.set(x, y - 1, P.chaoSombra)
  }
  t.set(150, 273, P.corrupcaoLuz)
  t.set(152, 274, P.corrupcaoLuz)
  if (registrar) anim.fendas.push([150, 273])

  /* Lampiões nos pilares das muretas da escadaria */
  for (const [x, y] of lampioesEscada) {
    t.ret(x, y - 7, 1, 7, P.troncoEscuro)
    t.ret(x - 1, y - 9, 3, 2, P.lanterna)
    t.set(x, y - 10, P.troncoEscuro)
    t.brilho(x + 0.5, y - 8, 9, P.brilho, 0.34)
    if (registrar) anim.lampioes.push([x + 0.5, y - 8])
  }

  /* Poça no patamar refletindo a lua e os lampiões */
  t.elipse(233, 270, 7, 1.6, P.poca)
  t.ret(229, 270, 2, 1, P.luaVioleta)
  t.ret(235, 270, 2, 1, P.janela)
  if (registrar) anim.poca.push([229, 270, 2], [235, 270, 2])

  nevoaFaixa(t, P.nevoa, 274, 5, 0.22, 14)
  return t
}

/* Sombra projetada no chão, só de dia (cai para o lado contrário do sol) */
function sombraNoChao(t, P, cx, cy, rx, ry) {
  if (!P.dia) return
  t.pinta((x, y, px, py) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && t.get(px, py) && bayer(px, py) > 0.3 && P.chaoSombra, [cx - rx - 1, cy - ry - 1, cx + rx + 2, cy + ry + 2])
}

/*
 * Escadaria de pedra em perspectiva: os degraus ficam mais altos e as pedras maiores perto de quem olha.
 * Cada degrau tem o piso (com a quina gasta e iluminada) e a face da frente na sombra; as juntas
 * desencontram de um degrau para o outro e há musgo nas frestas. Muretas dos dois lados,
 * com pilares para os lampiões, e um patamar de lajes no meio.
 * Devolve onde ficam os lampiões, no alto de cada pilar.
 */
function escadaria(t, P) {
  const TOPO = 236
  const PATAMAR = [266, 273]
  const meiaLarg = (y) => 4 + (y - TOPO) * 0.46
  const muroLarg = (y) => 2 + Math.floor((y - TOPO) / 22)
  const gasto = fbm(117)
  /* Quina dos degraus: de dia um tom mais suave, para não virar listras fortes */
  const quina = P.dia ? P.caminhoLuz : P.pedraLuz

  let y = TOPO
  let k = 0
  while (y < H) {
    if (y >= PATAMAR[0] && y < PATAMAR[1]) {
      /* Patamar: lajes grandes e lisas */
      for (let yy = y; yy < PATAMAR[1]; yy++) {
        const meia = meiaLarg(yy)
        for (let x = Math.round(240 - meia); x <= Math.round(240 + meia); x++) {
          const junta = (yy - PATAMAR[0]) % 4 === 3 || (x + (Math.floor((yy - PATAMAR[0]) / 4) % 2) * 5) % 10 === 0
          t.set(x, yy, yy === PATAMAR[0] ? quina : junta ? P.caminhoJunta : gasto(x / 4, yy / 3) > 0.64 ? P.caminhoLuz : P.caminho)
        }
      }
      y = PATAMAR[1]
      continue
    }
    const alt = 2 + Math.floor((y - TOPO) / 16)
    const face = Math.max(1, Math.round(alt * 0.45))
    const bloco = 5 + Math.floor((y - TOPO) / 10)
    const desloc = (k % 2) * Math.floor(bloco / 2)
    for (let j = 0; j < alt && y + j < H; j++) {
      const yy = y + j
      const meia = meiaLarg(yy)
      const x0 = Math.round(240 - meia)
      const x1 = Math.round(240 + meia)
      const naFace = j >= alt - face
      for (let x = x0; x <= x1; x++) {
        const junta = (x - x0 + desloc) % bloco === 0
        let c
        if (naFace) c = junta || j === alt - 1 ? P.caminhoJunta : P.pedraSombra
        else if (j === 0) c = gasto(x / 3, yy / 2 + k) < 0.3 ? P.caminho : quina
        else c = junta ? P.caminhoJunta : P.caminho
        if (!naFace && junta && gasto(x / 2, yy) > 0.66) c = P.musgo
        t.set(x, yy, c)
      }
    }
    y += alt
    k++
  }

  /* Muretas: faixa de pedra dos dois lados, com a borda virada para a luz mais clara */
  const luzEsq = FONTE.x < 240
  for (let yy = TOPO; yy < H; yy++) {
    const meia = meiaLarg(yy)
    const m = muroLarg(yy)
    for (const lado of [-1, 1]) {
      const borda = Math.round(240 + lado * (meia + 1))
      const acesa = (lado < 0) === luzEsq
      for (let i = 0; i <= m; i++) {
        const x = borda + lado * i
        let c = (yy - TOPO) % 5 === 0 ? P.pedraSombra : P.pedra
        if (i === 0) c = P.caminhoJunta
        else if (i === m) c = acesa ? P.pedraSombra : P.caminhoJunta
        else if (i === 1 && acesa) c = P.pedraLuz
        t.set(x, yy, c)
      }
    }
  }

  /* Pilares nas muretas, onde ficam os lampiões */
  const lampioes = []
  for (const yy of [250, 284]) {
    const meia = meiaLarg(yy)
    const m = muroLarg(yy)
    for (const lado of [-1, 1]) {
      const centro = Math.round(240 + lado * (meia + 1 + m / 2))
      const larg = m + 3
      const x0 = centro - Math.floor(larg / 2)
      t.ret(x0, yy - 4, larg, 6, P.pedra)
      t.ret(x0, yy - 4, larg, 1, P.pedraLuz)
      t.ret(x0 + (lado < 0 ? larg - 1 : 0), yy - 3, 1, 5, P.pedraSombra)
      t.ret(x0, yy + 2, larg, 1, P.caminhoJunta)
      lampioes.push([centro, yy - 4])
    }
  }
  return lampioes
}

/* Lápide torta (ou cruz), com musgo no pé *//* Lápide torta (ou cruz), com musgo no pé */
function lapide(t, P, x, base, w, h, inclina, cruz) {
  const p = new Tela()
  for (let j = 0; j < h; j++) {
    const y = base - j
    const dx = Math.round(j * inclina)
    if (cruz) {
      p.set(x + 1 + dx, y, P.pedra)
      if (j === h - 3) for (let i = 0; i < 3; i++) p.set(x + i + dx, y, P.pedra)
    } else {
      const topo = j >= h - 1 ? 1 : 0
      for (let i = topo; i < w - topo; i++) p.set(x + i + dx, y, P.pedra)
    }
  }
  contornoLuz(p, P.pedraLuz, P.pedraSombra)
  t.colar(p)
  t.set(x, base, P.musgo)
  t.set(x + w - 1, base, P.musgoLuz)
}

/* ---------- Camada 5: árvores gigantes na moldura, corvos, gato e detalhes ---------- */

function gato(t, P, ox, oy, registrar) {
  const G = P.gato
  t.poligono([[ox - 4, oy], [ox + 4, oy], [ox + 3, oy - 8], [ox - 3, oy - 8]], G)
  t.circulo(ox, oy - 10, 3, G)
  t.poligono([[ox - 3, oy - 11], [ox - 2.5, oy - 14.5], [ox - 0.8, oy - 12]], G)
  t.poligono([[ox + 0.8, oy - 12], [ox + 2.5, oy - 14.5], [ox + 3, oy - 11]], G)
  t.linha(ox + 4, oy - 1, ox + 8, oy - 4, 1.4, G)
  t.linha(ox + 8, oy - 4, ox + 7, oy - 9, 1.2, G)
  t.set(ox - 2, oy - 11, '#ffd54a')
  t.set(ox + 1, oy - 11, '#ffd54a')
  if (registrar) anim.olhosGato.push([ox - 2, oy - 11], [ox + 1, oy - 11])
}

function pedraRedonda(t, P, cx, cy, rx, ry) {
  const p = new Tela()
  const n = fbm(Math.round(cx * 7 + cy))
  p.pinta((x, y, px, py) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (n(px / 3, py / 3) > 0.6 ? P.pedraSombra : P.pedra), [cx - rx - 1, cy - ry - 1, cx + rx + 2, cy + ry + 2])
  contornoLuz(p, P.pedraLuz, P.pedraSombra)
  t.colar(p)
}

function frente(P, registrar) {
  const t = new Tela()
  const rand = aleatorio(131)
  const n = fbm(140)

  /* Chão: montes escuros nas laterais, deixando o caminho no meio */
  const topoChao = Array.from({ length: W }, (_, x) => Math.round(284 + (n(x / 14, 1) - 0.5) * 8 + Math.max(0, 64 - Math.abs(x - 240)) * 0.55))
  for (let x = 0; x < W; x++) {
    for (let y = topoChao[x]; y < H; y++) {
      const v = n(x / 5, y / 3)
      t.set(x, y, y === topoChao[x] ? P.chaoLuz : v > 0.68 ? P.chaoLuz : v < 0.3 ? P.chaoSombra : P.chao)
    }
  }
  for (const [cx, cy, rx, ry] of [[150, 293, 7, 5], [334, 293, 11, 7], [362, 298, 6, 4], [300, 300, 6, 4]]) {
    sombraNoChao(t, P, cx + rx * 1.3 * ladoSombra(), cy + ry * 0.6, rx * 1.3, 1.6)
    pedraRedonda(t, P, cx, cy, rx, ry)
  }

  /* Coluna caída, partida na ponta */
  const col = new Tela()
  col.ret(98, 292, 26, 6, P.pedra)
  col.ret(95, 290, 4, 10, P.pedra)
  for (const y of [294, 296]) for (let x = 99; x < 124; x++) if (bayer(x, y) > 0.3) col.set(x, y, P.pedraSombra)
  for (let y = 292; y < 298; y++) for (let x = 121 + Math.floor(rand() * 2); x < 124; x++) col.apagar(x, y)
  contornoLuz(col, P.pedraLuz, P.pedraSombra)
  t.colar(col)
  for (let x = 100; x < 120; x += 2 + Math.floor(rand() * 3)) t.set(x, 291, P.musgo)

  /* Folhas secas em montinhos perto das raízes e da beira do caminho (nada solto ao acaso) */
  for (const [cx, cy] of [[62, 297], [150, 299], [194, 297], [288, 298], [372, 300], [428, 298]]) {
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(cx + (rand() - 0.5) * 10)
      const y = Math.floor(cy + (rand() - 0.5) * 3)
      if (y >= H || !t.get(x, y)) continue
      t.set(x, y, rand() > 0.5 ? P.folhaSeca : P.folhaSecaLuz)
      t.set(x + 1, y, P.folhaSeca)
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rand() * W)
    const y = topoChao[x] + 2 + Math.floor(rand() * 8)
    if (y < H) t.linha(x, y, x + 3 + rand() * 3, y - rand() * 2, 1, P.troncoLuz)
  }

  /* As duas árvores gigantes, retorcidas, que emolduram a tela (de dia, com a sombra no chão) */
  sombraNoChao(t, P, 30 + 60 * ladoSombra(), 299, 60, 4)
  sombraNoChao(t, P, 452 + 60 * ladoSombra(), 300, 60, 4)
  const madeiraFrente = { racha: P.troncoRacha, escuro: P.troncoEscuro, base: P.tronco, luz: P.troncoLuz, brilho: P.troncoBrilho, musgo: P.musgo, musgoLuz: P.musgoLuz, roxo: P.troncoRoxo }
  const esq = arvoreRetorcida(t, madeiraFrente, 30, 300, 128, 40, -0.95, 1201, { nivel: 4, inclina: 0.1, afina: 0.36, ramifica: 0.16, torcao: 0.26, xMax: 140, musgo: true, nos: true, raizes: 6, quebra: 0.25 })
  const dir = arvoreRetorcida(t, madeiraFrente, 452, 302, 118, 36, -Math.PI + 0.95, 1202, { nivel: 4, inclina: -0.1, afina: 0.36, ramifica: 0.16, torcao: 0.28, xMin: 376, musgo: true, nos: true, raizes: 6, quebra: 0.25, evitar: AREA_DRAGAO })
  fiosMusgo(t, P, esq.segs, esq.rand, 26, registrar, 'e')
  cipos(t, P, esq.segs, esq.rand, 4)
  cipos(t, P, dir.segs, dir.rand, 3)
  marcasCorrupcao(t, P, esq.segs, esq.rand, 3, registrar)
  marcasCorrupcao(t, P, dir.segs, dir.rand, 2, registrar)
  fiosMusgo(t, P, dir.segs, dir.rand, 22, registrar, 'd')
  corvos(t, P, esq.segs, esq.rand, [50, 150], 2, registrar)
  corvos(t, P, dir.segs, dir.rand, [330, 430], 1, registrar)
  fungos(t, P, esq.raizes, esq.rand, 4, registrar)
  fungos(t, P, dir.raizes, dir.rand, 4, registrar)

  /* Gato preto em cima da pedra */
  gato(t, P, 334, 287, registrar)

  /* Espada quebrada fincada no chão */
  const g = topoChao[166] + 1
  t.ret(166, g - 8, 1, 8, P.espada)
  for (let y = g - 8; y < g; y += 2) t.set(166, y, P.espadaLuz)
  t.ret(164, g - 9, 5, 1, P.espada)
  t.ret(166, g - 12, 1, 3, P.troncoEscuro)
  t.set(166, g - 13, P.espadaLuz)

  /* Cristais mágicos meio enterrados */
  for (const [pts, luz] of [[[[398, 302], [400, 291], [403, 302]], [400, 292]], [[[401, 302], [405, 286], [408, 302]], [404, 288]], [[[406, 302], [409, 294], [412, 302]], [409, 295]]]) {
    t.poligono(pts, P.cristal)
    t.linha(luz[0], luz[1], luz[0] - 1, 300, 1, P.cristalLuz)
  }
  t.brilho(405, 294, 9, P.brilhoRoxo, 0.2)
  /* Cristal pequeno brotando da pedra */
  t.poligono([[147, 289], [148.5, 284], [150, 289]], P.cristal)
  t.set(148, 285, P.cristalLuz)
  t.brilho(148.5, 287, 4, P.brilhoRoxo, 0.16)
  if (registrar) anim.cristais.push([405, 290])

  /* Grama seca e arbustos de espinhos */
  for (let x = 0; x < W; x++) {
    if (topoChao[x] >= H || rand() > 0.55) continue
    t.ret(x, topoChao[x] - Math.floor(rand() * 4), 1, 4, rand() > 0.5 ? P.gramaLuz : P.grama)
  }
  for (const x of [126, 186, 290, 376]) {
    if (topoChao[x] >= H - 2) continue
    arvoreSilhueta(t, x, topoChao[x] + 1, 6 + rand() * 5, P.chaoSombra, P.gramaLuz, 1300 + x)
  }
  return t
}

/* ---------- Animações (SVG por camada, mesmo sistema de coordenadas) ---------- */

const svg = (estilo, corpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges"><style>${estilo}</style>${corpo}</svg>`

/* Desenho em texto ("X" = pixel) para retângulos SVG, juntando pixels vizinhos da mesma linha */
function desenho(linhas, dx = 0, dy = 0) {
  let s = ''
  linhas.forEach((l, y) => {
    for (let x = 0; x < l.length; x++) {
      if (l[x] !== 'X') continue
      let fim = x
      while (l[fim + 1] === 'X') fim++
      s += `<rect x="${x + dx}" y="${y + dy}" width="${fim - x + 1}" height="1"/>`
      x = fim
    }
  })
  return s
}

/* Faixa de névoa que se repete na horizontal (vira imagem dentro do SVG) */
function nevoaImagem(c, w, h, semente, forca) {
  const t = new Tela(w, h)
  const n = ruido(semente)
  const k = hex(c)
  const continua = (x, y, esc) => {
    const u = x / w
    return n(x / esc, y) * (1 - u) + n((x - w) / esc, y) * u
  }
  for (let y = 0; y < h; y++) {
    const perfilY = Math.sin(((y + 0.5) / h) * Math.PI) ** 1.5
    for (let x = 0; x < w; x++) {
      const v = continua(x, y / 7, 34) * 0.65 + continua(x, y / 4 + 20, 13) * 0.35
      const a = Math.max(0, (v - 0.42) * 2.2) * perfilY * forca
      const q = Math.floor(a / 0.07 + bayer(x, y)) * 0.07
      if (q > 0) t.set(x, y, [k[0], k[1], k[2], Math.round(Math.min(1, q) * 255)])
    }
  }
  return t.png().toString('base64')
}

function faixaNevoa(classe, b64, y, h) {
  const img = (x) => `<image href="data:image/png;base64,${b64}" x="${x}" y="${y}" width="${W}" height="${h}" style="image-rendering:pixelated" preserveAspectRatio="none"/>`
  return `<g class="${classe}">${img(0)}${img(W)}</g>`
}

/* Dragão voando ao longe, em dois quadros de asa */
const DRAGAO_A = [
  '...........X......X.........',
  '..........XX.....XX.........',
  '.........XXX....XXX.........',
  '........XXXX...XXXX.........',
  '.......XXXXX..XXXXX.........',
  '......XXXXXX.XXXXXX......XX.',
  'X....XXXXXXXXXXXXXX.....XXXX',
  '.XX..XXXXXXXXXXXXXXXXXXXXX..',
  '...XXXXXXXXXXXXXXXXXXX......',
  '..........XX....XX..........',
]
const DRAGAO_B = [
  '............................',
  '............................',
  '............................',
  '............................',
  '..........................XX',
  'X......................XXXX.',
  '.XX..XXXXXXXXXXXXXXXXXXXX...',
  '...XXXXXXXXXXXXXXXXXXXX.....',
  '......XXXXXXXXXXXX..........',
  '.......XXXXXXXXX............',
  '........XXXXXX..............',
  '.........XXXX...............',
]
const BRUXA_VOO = ['.....X......', '....XX......', '...XXX......', '..XXXXX.....', '....XX......', 'XXXXXXXXXXX.', 'XX...X.X....']
const AVE = [['X...X', '.X.X.', '..X..'], ['.....', 'XX.XX', '..X..']]

function aves(classe, x, y, c) {
  return `<g class="${classe}"><g transform="translate(${x} ${y})" fill="${c}"><g class="a1">${desenho(AVE[0])}</g><g class="a2">${desenho(AVE[1])}</g></g></g>`
}

function animCeu(dia) {
  const rand = aleatorio(201)
  let corpo = ''
  for (const [x, y, tam] of dia ? [] : anim.estrelas) {
    const estilo = `animation-duration:${(3 + rand() * 4).toFixed(2)}s;animation-delay:-${(rand() * 5).toFixed(2)}s`
    corpo +=
      tam === 2
        ? `<g class="p" style="${estilo}" fill="#f2eaff"><rect x="${x}" y="${y - 2}" width="1" height="5"/><rect x="${x - 2}" y="${y}" width="5" height="1"/></g>`
        : `<rect class="p" style="${estilo}" x="${x - 1}" y="${y}" width="3" height="1" fill="#f2eaff"/>`
  }
  /* Estrelas cadentes (só à noite): rastro em diagonal, longe da lua; cada uma passa rápido e some por um bom tempo */
  for (const [x, y, dur, atraso] of dia ? [] : [[420, 22, 14, -3], [150, 16, 19, -11], [350, 40, 23, -17]]) {
    const rastro = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x + i * 2}" y="${y - i}" width="2" height="1" fill="#f2eaff" fill-opacity="${(1 - i * 0.17).toFixed(2)}"/>`).join('')
    corpo += `<g class="ec" style="animation-duration:${dur}s;animation-delay:${atraso}s">${rastro}</g>`
  }
  /* Dragão cruzando o céu bem longe, quase uma nuvem */
  const corDragao = dia ? '#2a1a40' : '#0a0612'
  corpo += `<g class="dv"><g transform="translate(0 52)" fill="${corDragao}" fill-opacity="${dia ? 0.5 : 0.75}"><g class="a1 lento">${desenho(DRAGAO_A)}</g><g class="a2 lento">${desenho(DRAGAO_B)}</g></g></g>`
  /* Estrelas cadentes raras */
  for (const [i, [x, y]] of (dia ? [] : [[140, 30], [372, 52]]).entries()) {
    let rastro = ''
    for (let k = 0; k < 12; k++) rastro += `<rect x="${x + k}" y="${y - Math.floor(k / 2)}" width="1" height="1" fill="#fbf5ef" fill-opacity="${(1 - k / 12).toFixed(2)}"/>`
    corpo += `<g class="cadente" style="animation-duration:${23 + i * 14}s;animation-delay:${4 + i * 9}s">${rastro}</g>`
  }
  /* Raios de sol saindo do sol que se põe (só de dia), atrás das nuvens e do castelo */
  if (dia) {
    /* Ângulos a partir do sol: do horizonte à esquerda, passando por cima, até o horizonte à direita */
    for (const [i, [ang, abre]] of [[-2.85, 0.06], [-2.35, 0.05], [-1.95, 0.07], [-1.2, 0.06], [-0.8, 0.05], [-0.3, 0.07]].entries()) {
      const alcance = 420
      const p = (a2) => `${(SOL.x + Math.cos(a2) * alcance).toFixed(1)},${(SOL.y + Math.sin(a2) * alcance).toFixed(1)}`
      corpo += `<polygon class="raio" style="animation-delay:-${(i * 2.3).toFixed(1)}s" points="${SOL.x},${SOL.y} ${p(ang - abre)} ${p(ang + abre)}" fill="#ffd08a"/>`
    }
  }
  /* Bruxa na vassoura, bem longe */
  corpo += `<g class="bv"><g class="bob" transform="translate(0 132)" fill="${dia ? '#24163a' : '#0a0612'}" fill-opacity="${dia ? 0.55 : 0.8}">${desenho(BRUXA_VOO)}</g></g>`
  /* Bando de corvos distante */
  corpo += `<g class="bando">${[[0, 0], [8, -4], [14, 3], [22, -2]].map(([x, y]) => aves('', x, 26 + y, dia ? '#24163a' : '#07050c')).join('')}</g>`
  return svg(
    `.p{animation:piscar 4s steps(2,end) infinite}
.ec{opacity:0;animation:cadente 14s steps(500,end) infinite}
@keyframes cadente{0%{opacity:0;transform:translate(0,0)}.5%{opacity:1}5%{opacity:0;transform:translate(-56px,28px)}100%{opacity:0;transform:translate(-56px,28px)}}
.dv{animation:cruzar 120s steps(600,end) infinite;animation-delay:-38s}
.bando{animation:bando 55s steps(300,end) infinite;animation-delay:-12s}
.a1{animation:asa .5s steps(1,end) infinite}.a2{animation:asa .5s steps(1,end) infinite reverse}
.lento{animation-duration:1.4s}
.bv{animation:bruxa 150s steps(560,end) infinite;animation-delay:-95s}
.cadente{opacity:0;animation-name:cair;animation-iteration-count:infinite;animation-timing-function:linear}
@keyframes cair{0%{opacity:0;transform:translate(0,0)}2%{opacity:1}7%{opacity:0;transform:translate(-40px,20px)}100%{opacity:0;transform:translate(-40px,20px)}}
.raio{opacity:.07;animation:raio 11s ease-in-out infinite}
@keyframes raio{50%{opacity:.14}}
@keyframes bruxa{0%{transform:translate(${W + 20}px,0)}45%{transform:translate(-30px,-16px)}100%{transform:translate(-30px,-16px)}}
@keyframes piscar{50%{opacity:.15}}
@keyframes asa{0%{opacity:1}50%{opacity:0}}
@keyframes cruzar{0%{transform:translate(-40px,0)}62%{transform:translate(${W + 20}px,-22px)}100%{transform:translate(${W + 20}px,-22px)}}
@keyframes bando{0%{transform:translate(${W + 10}px,0)}70%{transform:translate(-40px,14px)}100%{transform:translate(-40px,14px)}}`,
    corpo
  )
}

function animMontanhas(dia, P) {
  const rand = aleatorio(181)
  let corpo = `<g class="re1">${faixaNevoa('nm', nevoaImagem(P.nevoa, W, 30, 74, dia ? 0.4 : 0.34), 182, 30)}</g>`
  if (!dia) {
    /* Olhos do dragão pousado e da serpente acendem devagar */
    for (const [x, y] of anim.olhosDragao) corpo += `<g class="od"><circle cx="${x + 0.5}" cy="${y + 0.5}" r="2.5" fill="#ffb05a" fill-opacity=".2"/><rect x="${x}" y="${y}" width="1" height="1" fill="#ffc87a"/></g>`
    for (const [x, y] of anim.olhoSerpente) corpo += `<g class="os"><circle cx="${x + 0.5}" cy="${y + 0.5}" r="2" fill="#9a5cff" fill-opacity=".3"/><rect x="${x}" y="${y}" width="1" height="1" fill="#d6b8ff"/></g>`
  }
  /* Brilhos no caminho de luz do lago */
  for (const [x, y] of anim.lago) corpo += `<rect class="lg" style="animation-delay:-${(rand() * 3).toFixed(2)}s" x="${x}" y="${y}" width="2" height="1" fill="#fbf5ef"/>`
  return svg(
    `.lg{opacity:0;animation:cintila 2.8s steps(2,end) infinite}
@keyframes cintila{50%{opacity:.9}}
.od{opacity:0;animation:acender 11s steps(10,end) infinite}
.os{opacity:0;animation:acender 15s steps(10,end) infinite;animation-delay:-6s}
@keyframes acender{0%,50%{opacity:0}65%,82%{opacity:.9}100%{opacity:0}}
.nm{animation:deriva 260s steps(${W},end) infinite}
.re1{animation:respirar 23s ease-in-out infinite}
@keyframes deriva{to{transform:translateX(-${W}px)}}
@keyframes respirar{50%{opacity:.65}}`,
    corpo
  )
}

function animCastelo(dia) {
  const rand = aleatorio(211)
  let corpo = ''
  for (const [x, y, w, h, roxa] of anim.janelas) {
    corpo += `<rect class="v" style="animation-duration:${(2 + rand() * 4).toFixed(2)}s;animation-delay:-${(rand() * 4).toFixed(2)}s" x="${x}" y="${y}" width="${w}" height="${h}" fill="${roxa ? '#e2c8ff' : '#ffe2a8'}"/>`
  }
  for (const [x, y] of anim.lanternas) {
    corpo += `<circle class="l" style="animation-delay:-${(rand() * 2).toFixed(2)}s" cx="${x}" cy="${y}" r="4" fill="#ffb36a"/>`
  }
  /* Corvos rondando as torres */
  for (const [i, [x, y]] of [[214, 70], [262, 58], [236, 84]].entries()) {
    corpo += `<g class="r${i}">${aves('', x, y, dia ? '#24163a' : '#05040a')}</g>`
  }
  /* Janelas apagadas que acendem por um tempo e voltam a apagar, cada uma no seu ritmo (só à noite) */
  for (const [i, [x, y, w, h]] of (dia ? [] : anim.janelasApagadas.filter((_, k) => k % 2 === 0)).entries()) {
    corpo += `<rect class="ac" style="animation-duration:${(24 + (i * 7) % 23).toFixed(0)}s;animation-delay:-${((i * 11) % 30).toFixed(0)}s" x="${x}" y="${y + (w === 3 ? 1 : 0)}" width="${w}" height="${h - (w === 3 ? 1 : 0)}" fill="#ffd08a"/>`
  }
  /* Morcegos saindo da torre de menagem de vez em quando (só à noite) */
  if (!dia) {
    for (const [i, [dx, dy]] of [[-14, -10], [-6, -16], [4, -14], [12, -8], [18, -16]].entries()) {
      corpo += `<g class="mc" style="--dx:${dx * 4}px;--dy:${dy * 3}px;animation-delay:${(i * 0.18).toFixed(2)}s">${aves('', 239, 96, '#05040a')}</g>`
    }
  }
  for (const [x, y] of anim.tochas) corpo += `<circle class="to" cx="${x}" cy="${y}" r="3" fill="#ffb36a"/>`
  if (!dia) {
    const f = fantasma().rects()
    corpo += `<g class="g"><g transform="translate(276 132) scale(0.55)">${f}</g></g>`
  }
  return svg(
    `.v{opacity:0;animation:vela 3s steps(2,end) infinite}
.l{opacity:.1;animation:pulsar 2.6s steps(3,end) infinite}
.g{opacity:0;animation:assombrar 14s steps(10,end) infinite}
.to{opacity:.15;animation:chama .9s steps(3,end) infinite}
.ac{opacity:0;animation-name:acende;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}
@keyframes acende{0%,45%{opacity:0}48%,88%{opacity:.85}90%,100%{opacity:0}}
.mc{opacity:0;animation:revoada 31s steps(60,end) infinite}
@keyframes revoada{0%,82%{opacity:0;transform:translate(0,0)}83%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes chama{33%{opacity:.32}66%{opacity:.06}}
.r0{animation:rondar0 17s steps(68,end) infinite}.r1{animation:rondar1 21s steps(84,end) infinite;animation-delay:-7s}.r2{animation:rondar0 25s steps(100,end) infinite reverse;animation-delay:-11s}
.a1{animation:asa .45s steps(1,end) infinite}.a2{animation:asa .45s steps(1,end) infinite reverse}
@keyframes vela{50%{opacity:${dia ? 0.35 : 0.7}}}
@keyframes pulsar{50%{opacity:.24}}
@keyframes asa{0%{opacity:1}50%{opacity:0}}
@keyframes assombrar{0%,50%{opacity:0;transform:translateY(0)}62%{opacity:.6}85%{opacity:.6;transform:translateY(-5px)}100%{opacity:0;transform:translateY(-8px)}}
@keyframes rondar0{0%,100%{transform:translate(0,0)}25%{transform:translate(18px,-6px)}50%{transform:translate(34px,2px)}75%{transform:translate(16px,8px)}}
@keyframes rondar1{0%,100%{transform:translate(0,0)}30%{transform:translate(-20px,6px)}60%{transform:translate(-8px,14px)}80%{transform:translate(10px,4px)}}`,
    corpo
  )
}

function animFloresta(dia, P) {
  const rand = aleatorio(221)
  let corpo = `<g class="re1">${faixaNevoa('n1', nevoaImagem(P.nevoa, W, 46, 71, dia ? 0.5 : 0.45), 228, 46)}</g>`
  corpo += `<g class="re2">${faixaNevoa('n2', nevoaImagem(P.nevoa, W, 30, 72, dia ? 0.36 : 0.32), 252, 30)}</g>`
  /* Fogos-fátuos vagando entre as árvores */
  for (const [i, [x, y]] of (dia ? [[92, 250], [356, 244]] : [[92, 250], [156, 246], [300, 252], [356, 244], [410, 256]]).entries()) {
    const c = i % 3 ? '#b88cff' : '#8fb4ff'
    corpo += `<g class="w${i % 3}" style="animation-duration:${(9 + rand() * 8).toFixed(2)}s;animation-delay:-${(rand() * 10).toFixed(2)}s"><circle cx="${x + 0.5}" cy="${y + 0.5}" r="3" fill="${c}" fill-opacity="${dia ? 0.1 : 0.2}"/><rect x="${x}" y="${y}" width="1" height="1" fill="${dia ? '#ffe0c0' : '#efe2ff'}"/></g>`
  }
  /* De dia, faixas de luz do sol entrando entre as árvores, do alto à esquerda */
  for (const [i, x] of (dia ? [60, 150, 300, 390] : []).entries()) {
    corpo += `<polygon class="feixe" style="animation-delay:-${i * 3}s" points="${x},200 ${x + 10},200 ${x + 46},290 ${x + 30},290" fill="#ffd8a0"/>`
  }
  /* Chama dos lampiões do caminho */
  for (const [x, y] of anim.lampioes) corpo += `<circle class="lp" style="animation-delay:-${(rand() * 2).toFixed(2)}s" cx="${x}" cy="${y}" r="5" fill="#ffb36a"/>`
  /* Vaga-lumes (só à noite) */
  for (const [x, y] of dia ? [] : [[70, 244], [104, 258], [150, 238], [176, 262], [292, 246], [318, 240], [348, 258], [396, 250], [430, 262], [460, 244]]) {
    corpo += `<g class="vg" style="animation-duration:${(6 + rand() * 5).toFixed(2)}s;animation-delay:-${(rand() * 6).toFixed(2)}s"><circle cx="${x + 0.5}" cy="${y + 0.5}" r="2.5" fill="#ffd27a" fill-opacity=".25"/><rect x="${x}" y="${y}" width="1" height="1" fill="#fff2c0"/></g>`
  }
  /* Olhos entre os troncos distantes: raros, acendem e apagam devagar */
  for (const [i, [x, y, d]] of (dia ? [] : [[60, 256, 2], [438, 250, 2], [126, 262, 3]]).entries()) {
    corpo += `<g class="ol" style="animation-duration:${17 + i * 6}s;animation-delay:-${i * 5}s" fill="${i === 2 ? '#e0a050' : '#c9a0ff'}"><rect x="${x}" y="${y}" width="1" height="1"/><rect x="${x + d}" y="${y}" width="1" height="1"/></g>`
  }
  /* Runas acendendo uma de cada vez */
  for (const [i, [x, y, tipo]] of anim.runas.entries()) {
    corpo += `<g class="ru" style="animation-delay:-${(i * 2.3).toFixed(1)}s" fill="#d2b4ff">${desenho(RUNAS[tipo], x, y)}</g>`
  }
  /* Orbe do cajado pulsando e poeira mágica subindo do círculo */
  for (const [x, y] of anim.fendas) corpo += `<circle class="fe" cx="${x + 0.5}" cy="${y}" r="6" fill="#a46cff"/>`
  for (const [x, y, w] of anim.poca) corpo += `<rect class="pc" style="animation-delay:-${(rand() * 2).toFixed(2)}s" x="${x}" y="${y}" width="${w}" height="1" fill="#f2eaff"/>`
  for (const [x, y] of anim.orbe) corpo += `<circle class="orbe" cx="${x + 0.5}" cy="${y + 0.5}" r="3.5" fill="#c49cff"/>`
  for (let i = 0; i < 4; i++) {
    corpo += `<rect class="po" style="animation-duration:${(5 + rand() * 4).toFixed(2)}s;animation-delay:-${(rand() * 6).toFixed(2)}s" x="${Math.floor(304 + rand() * 46)}" y="${Math.floor(258 + rand() * 10)}" width="1" height="1" fill="#e2ccff"/>`
  }
  return svg(
    `.n1{animation:deriva 200s steps(${W},end) infinite}
.n2{animation:deriva 140s steps(${W},end) infinite reverse}
.re1{animation:respirar 19s ease-in-out infinite}.re2{animation:respirar 27s ease-in-out infinite;animation-delay:-9s}
@keyframes respirar{50%{opacity:.6}}
.lp{opacity:.12;animation:chama 2.2s steps(3,end) infinite}
.feixe{opacity:.06;animation:feixe 9s ease-in-out infinite}
@keyframes feixe{50%{opacity:.12}}
@keyframes chama{50%{opacity:.26}}
.vg{animation-name:vaga;animation-iteration-count:infinite;animation-timing-function:steps(30,end)}
@keyframes vaga{0%,100%{opacity:0;transform:translate(0,0)}20%{opacity:1}50%{opacity:.4;transform:translate(6px,-5px)}80%{opacity:1;transform:translate(-3px,-9px)}}
.ol{opacity:0;animation-name:olhar;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
@keyframes olhar{0%,62%{opacity:0}72%,86%{opacity:.8}96%,100%{opacity:0}}
.w0,.w1,.w2{animation-iteration-count:infinite;animation-timing-function:steps(40,end)}
.w0{animation-name:vagar0}.w1{animation-name:vagar1}.w2{animation-name:vagar2}
.ru{opacity:0;animation:runa 11.5s steps(8,end) infinite}
.orbe{opacity:.15;animation:pulsar 3.4s steps(4,end) infinite}
.fe{opacity:.08;animation:pulsar 5.5s steps(5,end) infinite}
.pc{opacity:0;animation:reflexo 2.6s steps(2,end) infinite}
@keyframes reflexo{50%{opacity:.5}}
.po{opacity:0;animation:subir 6s steps(14,end) infinite}
@keyframes deriva{to{transform:translateX(-${W}px)}}
@keyframes vagar0{0%,100%{opacity:0;transform:translate(0,0)}20%{opacity:1}50%{opacity:.6;transform:translate(10px,-5px)}80%{opacity:1;transform:translate(4px,-10px)}}
@keyframes vagar1{0%,100%{opacity:0;transform:translate(0,0)}25%{opacity:.9;transform:translate(-6px,-3px)}60%{opacity:.4;transform:translate(-14px,2px)}85%{opacity:.9;transform:translate(-5px,4px)}}
@keyframes vagar2{0%,100%{opacity:0;transform:translate(0,0)}30%{opacity:1;transform:translate(4px,4px)}55%{opacity:.5;transform:translate(12px,-2px)}75%{opacity:1;transform:translate(7px,-8px)}}
@keyframes runa{0%,100%{opacity:0}12%,30%{opacity:${dia ? 0.3 : 0.8}}45%{opacity:0}}
@keyframes pulsar{50%{opacity:.4}}
@keyframes subir{0%{opacity:0;transform:translate(0,0)}25%{opacity:.9}100%{opacity:0;transform:translate(3px,-22px)}}`,
    corpo
  )
}

function animFrente(dia, P) {
  const rand = aleatorio(231)
  let corpo = `<g class="re3">${faixaNevoa('nc', nevoaImagem(P.nevoa, W, 40, 73, dia ? 0.45 : 0.4), 262, 40)}</g>`
  /* Folhas secas caindo */
  for (const [i, [x, y]] of [[70, 60], [130, 30], [160, 90], [330, 50], [390, 20], [430, 80]].entries()) {
    corpo += `<rect class="fo" style="animation-duration:${(12 + i * 2.5).toFixed(1)}s;animation-delay:-${(i * 3.1).toFixed(1)}s" x="${x}" y="${y}" width="2" height="1" fill="${dia ? '#8a4a3a' : '#4a2c40'}"/>`
  }
  /* Poeira mágica no ar */
  for (const [x, y] of [[400, 284], [408, 280], [404, 290], [56, 290], [88, 294]]) {
    corpo += `<rect class="pm" style="animation-duration:${(7 + rand() * 7).toFixed(2)}s;animation-delay:-${(rand() * 9).toFixed(2)}s" x="${x}" y="${y}" width="1" height="1" fill="${dia ? '#ffd8b0' : '#c9a6ff'}"/>`
  }
  /* Musgo pendurado balançando */
  for (const [x, y, tam] of anim.fios) {
    const meio = Math.floor(tam / 2)
    corpo += `<g fill="${P.musgo}"><rect x="${x}" y="${y}" width="1" height="${meio}"/><g class="bal" style="animation-delay:-${(rand() * 4).toFixed(2)}s"><rect x="${x}" y="${y + meio}" width="1" height="${tam - meio - 1}"/><rect x="${x}" y="${y + tam - 1}" width="1" height="1" fill="${P.musgoLuz}"/></g></g>`
  }
  /* Cogumelos e cristais pulsando */
  for (const [x, y] of anim.fungos) corpo += `<circle class="fg" style="animation-delay:-${(rand() * 5).toFixed(2)}s" cx="${x + 0.5}" cy="${y + 0.5}" r="3" fill="#c49cff"/>`
  for (const [i, [x, y]] of anim.veias.entries()) corpo += `<g class="ve" style="animation-delay:-${(i * 1.9).toFixed(1)}s"><circle cx="${x + 0.5}" cy="${y + 0.5}" r="2.5" fill="#a46cff" fill-opacity=".35"/><rect x="${x}" y="${y}" width="1" height="1" fill="#e2ccff"/></g>`
  for (const [x, y] of anim.cristais) corpo += `<circle class="cr" cx="${x}" cy="${y}" r="6" fill="#b98aff"/>`
  /* Olhos no escuro, entre as raízes (só à noite) */
  if (!dia) {
    corpo += `<g class="olhos" fill="#e8a24a"><rect x="66" y="288" width="1" height="1"/><rect x="69" y="288" width="1" height="1"/></g>`
  }
  /* Gato e corvos piscando */
  for (const [x, y] of anim.olhosGato) corpo += `<rect class="o" x="${x}" y="${y}" width="1" height="1" fill="${P.gato}"/>`
  for (const [i, [x, y]] of anim.corvos.entries()) corpo += `<rect class="oc" style="animation-delay:-${i * 2.2}s" x="${x}" y="${y}" width="1" height="1" fill="${dia ? '#ffd0a0' : '#9a86b8'}"/>`
  return svg(
    `.nc{animation:deriva 160s steps(${W},end) infinite reverse}
.re3{animation:respirar 31s ease-in-out infinite;animation-delay:-4s}
@keyframes respirar{50%{opacity:.6}}
.fo{animation:cair 14s steps(40,end) infinite}
.pm{opacity:0;animation:flutuar 9s steps(24,end) infinite}
.bal{animation:balancar 4.5s steps(1,end) infinite}
.fg{opacity:.1;animation:pulsar 4.2s steps(4,end) infinite}
.cr{opacity:.08;animation:pulsar 6s steps(5,end) infinite}
.ve{opacity:0;animation:veia 8s steps(6,end) infinite}
@keyframes veia{0%,100%{opacity:0}40%,60%{opacity:1}}
.olhos{opacity:0;animation:espreitar 21s ease-in-out infinite}
.o{opacity:0;animation:piscar 6s steps(1,end) infinite}
.oc{opacity:0;animation:piscar 5s steps(1,end) infinite}
@keyframes deriva{to{transform:translateX(-${W}px)}}
@keyframes cair{0%{opacity:0;transform:translate(0,0)}8%{opacity:1}35%{transform:translate(14px,60px)}65%{transform:translate(2px,130px)}92%{opacity:1}100%{opacity:0;transform:translate(20px,200px)}}
@keyframes flutuar{0%,100%{opacity:0;transform:translate(0,0)}30%{opacity:.8}60%{opacity:.4;transform:translate(6px,-8px)}85%{opacity:.8;transform:translate(2px,-14px)}}
@keyframes balancar{50%{transform:translateX(1px)}}
@keyframes pulsar{50%{opacity:.3}}
@keyframes espreitar{0%,60%{opacity:0}70%,84%{opacity:.75}94%,100%{opacity:0}}
@keyframes piscar{0%,93%{opacity:0}94%,97%{opacity:1}98%,100%{opacity:0}}`,
    corpo
  )
}

/* Chuva fina em pixels (ladrilho que se repete); poucas gotas e meio apagadas, para não cansar a vista */
function chuva() {
  const rand = aleatorio(301)
  let corpo = ''
  for (let i = 0; i < 32; i++) {
    const x = Math.floor(rand() * 96)
    const y = Math.floor(rand() * 96)
    const tam = 3 + Math.floor(rand() * 4)
    corpo += `<rect x="${x}" y="${y}" width="1" height="${tam}" fill="#b9c6ff" fill-opacity="${(0.3 + rand() * 0.3).toFixed(2)}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" shape-rendering="crispEdges">${corpo}</svg>`
}

/* Neve em pixels (ladrilho que se repete): flocos de 1 pixel e alguns em cruz, mais perto */
function neve() {
  const rand = aleatorio(311)
  let corpo = ''
  for (let i = 0; i < 34; i++) {
    const x = 1 + Math.floor(rand() * 94)
    const y = 1 + Math.floor(rand() * 94)
    const a = (0.55 + rand() * 0.45).toFixed(2)
    corpo +=
      i % 6
        ? `<rect x="${x}" y="${y}" width="1" height="1" fill="#fbf5ef" fill-opacity="${a}"/>`
        : `<g fill="#fbf5ef" fill-opacity="${a}"><rect x="${x - 1}" y="${y}" width="3" height="1"/><rect x="${x}" y="${y - 1}" width="1" height="3"/></g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" shape-rendering="crispEdges">${corpo}</svg>`
}

/* Neblina: faixas grossas de névoa cobrindo do pé das montanhas ao chão, andando em sentidos opostos */
function neblina(dia, P) {
  const cor = dia ? misturar(P.nevoa, '#ffffff', 0.25) : misturar(P.nevoa, '#ffffff', 0.12)
  const c = paraHex(cor)
  let corpo = `<g class="ra">${faixaNevoa('na', nevoaImagem(c, W, 70, 81, dia ? 0.7 : 0.62), 150, 70)}</g>`
  corpo += `<g class="rb">${faixaNevoa('nb', nevoaImagem(c, W, 60, 82, dia ? 0.8 : 0.7), 206, 60)}</g>`
  corpo += `<g class="rc">${faixaNevoa('nc', nevoaImagem(c, W, 50, 83, dia ? 0.75 : 0.66), 252, 50)}</g>`
  return svg(
    `.na{animation:deriva 220s steps(${W},end) infinite}
.nb{animation:deriva 150s steps(${W},end) infinite reverse}
.nc{animation:deriva 110s steps(${W},end) infinite}
.ra{animation:respirar 21s ease-in-out infinite}.rb{animation:respirar 29s ease-in-out infinite;animation-delay:-8s}.rc{animation:respirar 17s ease-in-out infinite;animation-delay:-3s}
@keyframes deriva{to{transform:translateX(-${W}px)}}
@keyframes respirar{50%{opacity:.7}}`,
    corpo
  )
}

/*
 * Paleta da noite (escolhida para o site): as 6 cores mais sombras e meios-tons tirados delas.
 * A cena é desenhada como sempre e no fim cada pixel vira a cor da rampa com a mesma claridade;
 * luzes quentes (janelas, tochas, portão) viram pêssego e creme.
 */
const PALETA_NOITE = {
  rampa: ['#0b0b13', '#131321', '#1b1b30', '#272744', '#383a61', '#494d7e', '#6a5d8d', '#8b6d9c', '#c69fa5', '#f2d3ab', '#fbf5ef'].map(hex),
  rosa: hex('#c69fa5'),
  pessego: hex('#f2d3ab'),
  creme: hex('#fbf5ef'),
  /* Luzes quentes (janela, lanterna, tocha, portão): do halo fraco ao centro aceso, que fica pêssego forte */
  quente: ['#6f5d70', '#c69fa5', '#f2d3ab', '#f2d3ab'].map(hex),
  /* Luzes mágicas (runas, cristais, rosácea, fungos): do violeta ao creme */
  magica: ['#6a5d8d', '#8b6d9c', '#c69fa5', '#fbf5ef'].map(hex),
  /* < 1 clareia a cena; > 1 deixa mais pesada */
  curva: 0.85,
}
const luminancia = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255
const LUM_NOITE = PALETA_NOITE.rampa.map(luminancia)
/* Faixa de claridade da cena inteira (calculada uma vez, com as camadas empilhadas) */
let faixaNoite = [0, 1]
const paraHex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')

function corNoite(c) {
  const max = Math.max(c[0], c[1], c[2])
  const min = Math.min(c[0], c[1], c[2])
  const sat = max ? (max - min) / max : 0
  const l = Math.max(0, (luminancia(c) - faixaNoite[0]) / (faixaNoite[1] - faixaNoite[0] || 1)) ** PALETA_NOITE.curva
  /* Halos e pontos de luz quentes: cada degrau de brilho vira um tom, assim a luz ganha volta */
  if (sat > 0.3 && c[0] > c[2] * 1.2 && max > 45) {
    const calor = (max - 45) / 210
    return PALETA_NOITE.quente[calor < 0.2 ? 0 : calor < 0.45 ? 1 : calor < 0.75 ? 2 : 3]
  }
  /* Brilho mágico (violeta forte) */
  if (sat > 0.55 && c[2] > c[0] && max > 70) return PALETA_NOITE.magica[max < 120 ? 0 : max < 170 ? 1 : max < 220 ? 2 : 3]
  let melhor = 0
  for (let k = 1; k < LUM_NOITE.length; k++) if (Math.abs(LUM_NOITE[k] - l) < Math.abs(LUM_NOITE[melhor] - l)) melhor = k
  return PALETA_NOITE.rampa[melhor]
}

/* Empilha as camadas para achar a faixa de claridade e depois troca as cores de cada uma (a transparência fica) */
function aplicarPaletaNoite(telas) {
  /* Serve para cenas de qualquer tamanho (o fundo é 480x300, a transição 480x270) */
  const W = telas[0].w
  const H = telas[0].h
  const pilha = new Float32Array(W * H * 3)
  for (const tela of telas) {
    for (let i = 0; i < W * H; i++) {
      const al = tela.d[i * 4 + 3] / 255
      for (let k = 0; k < 3; k++) pilha[i * 3 + k] = pilha[i * 3 + k] * (1 - al) + tela.d[i * 4 + k] * al
    }
  }
  let lMin = 1
  let lMax = 0
  for (let i = 0; i < W * H; i++) {
    const v = luminancia([pilha[i * 3], pilha[i * 3 + 1], pilha[i * 3 + 2]])
    lMin = Math.min(lMin, v)
    lMax = Math.max(lMax, v)
  }
  faixaNoite = [lMin, lMax]
  for (const tela of telas) {
    for (let i = 0; i < W * H; i++) {
      if (!tela.d[i * 4 + 3]) continue
      const c = corNoite([tela.d[i * 4], tela.d[i * 4 + 1], tela.d[i * 4 + 2]])
      tela.d.set(c.slice(0, 3), i * 4)
    }
  }
}

/* As mesmas cores nas animações: troca cada cor do SVG e as cores usadas para gerar a névoa */
const svgNoite = (s) => s.replace(/#[0-9a-fA-F]{6}\b/g, (h) => paraHex(corNoite(hex(h))))
const paletaNoite = (P) => Object.fromEntries(Object.entries(P).map(([k, v]) => [k, typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? paraHex(corNoite(hex(v))) : v]))

/* Ferramentas de desenho reaproveitadas por outros geradores (ex.: scripts/gerar-transicao.cjs) */
module.exports = {
  Tela, bayer, fbm, hex, misturar, luzPara, contornoLuz, nevoaFaixa, nevoaImagem, desenho,
  arvoreRetorcida, arvoreSilhueta, pinheiroMorto, fiosMusgo, cipos,
  /* Paleta da noite: aplica nas camadas, nas cores de um SVG e numa cor solta */
  aplicarPaletaNoite, svgNoite, corNoite, paraHex,
  /* Troca a fonte de luz usada por luzPara e contornoLuz */
  usarLuz: (fonte) => {
    FONTE = fonte
  },
}

/* ---------- Saída ---------- */
if (require.main === module) {

  const pasta = path.join(__dirname, '..', 'public', 'fundo')
  fs.mkdirSync(pasta, { recursive: true })
  for (const antigo of fs.readdirSync(pasta)) fs.unlinkSync(path.join(pasta, antigo))
  const CAMADAS = { ceu, nuvens, montanhas, dragao, castelo, floresta, frente }
  let total = 0
  const quadrosDragao = {}
  for (const tema of ['escuro', 'claro']) {
    FONTE = tema === 'claro' ? SOL : LUA
    const telas = Object.entries(CAMADAS).map(([nome, desenhar]) => [nome, desenhar(PALETAS[tema], tema === 'escuro')])
    const asas = dragaoAsas(PALETAS[tema])
    if (tema === 'escuro') aplicarPaletaNoite([...telas.map(([, tela]) => tela), asas])
    quadrosDragao[tema] = [telas.find(([nome]) => nome === 'dragao')[1].png().toString('base64'), asas.png().toString('base64')]
    for (const [nome, tela] of telas) {
      const png = tela.png()
      fs.writeFileSync(path.join(pasta, `${nome}-${tema}.png`), png)
      total += png.length
    }
  }
  const arquivos = [['chuva.svg', chuva()], ['neve.svg', neve()]]
  for (const tema of ['escuro', 'claro']) {
    const dia = tema === 'claro'
    const P = dia ? PALETAS.claro : paletaNoite(PALETAS.escuro)
    const cores = dia ? (s) => s : svgNoite
    arquivos.push(
      [`ceu-anim-${tema}.svg`, cores(animCeu(dia))],
      [`montanhas-anim-${tema}.svg`, cores(animMontanhas(dia, P))],
      [`castelo-anim-${tema}.svg`, cores(animCastelo(dia))],
      [`floresta-anim-${tema}.svg`, cores(animFloresta(dia, P))],
      [`frente-anim-${tema}.svg`, cores(animFrente(dia, P))],
      [`neblina-${tema}.svg`, neblina(dia, P)],
      [`dragao-anim-${tema}.svg`, cores(animDragao(dia, ...quadrosDragao[tema]))]
    )
  }
  for (const [nome, conteudo] of arquivos) {
    fs.writeFileSync(path.join(pasta, nome), conteudo)
    total += conteudo.length
  }
  console.log(`fundo gerado em public/fundo (${(total / 1024).toFixed(0)} KB)`)
}
