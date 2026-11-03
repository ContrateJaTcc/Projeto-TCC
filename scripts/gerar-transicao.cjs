/*
 * Arte da tela de transição: uma floresta sombria com um portal de pedra no meio.
 * Saída em public/transicao/:
 *   fundo.png, meio.png, frente-esq.png, frente-dir.png  (camadas, 480x270)
 *   anim.svg (névoa, olhos, pulso do portal, bruxa), particulas.svg, selo.svg (indicador de carregamento)
 * Uso: node scripts/gerar-transicao.cjs
 */
const fs = require('fs')
const path = require('path')
const { aleatorio } = require('./pixel-lib.cjs')
const {
  Tela, bayer, fbm, hex, contornoLuz, nevoaFaixa, nevoaImagem, desenho,
  arvoreRetorcida, arvoreSilhueta, pinheiroMorto, fiosMusgo, usarLuz,
} = require('./gerar-fundo.cjs')

const W = 480
const H = 270
/* Centro do portal (a luz da cena sai dele) */
const PORTAL = { x: 240, y: 160 }

const C = {
  fundo: ['#0b0214', '#100319', '#150324', '#1b0530', '#22063c', '#2a0748', '#320757'],
  magico: '#985FC9', magicoClaro: '#c9a0ff', magicoBrilho: '#f0e2ff',
  longe: '#2a0b48', longeLuz: '#3a1660', perto: '#1b0631', pertoLuz: '#2a0f48', criatura: '#1f0838',
  nevoa: '#6a4a9a',
  chao: '#12031f', chaoLuz: '#1e0a30', chaoSombra: '#0a0114',
  laje: '#241038', lajeLuz: '#3a1e56', junta: '#0d0218',
  pedra: '#3a2a52', pedraLuz: '#7a62a6', pedraSombra: '#22163a', runa: '#5a3a8a',
  musgo: '#1e2a2e', musgoLuz: '#2e4040',
  haste: '#5a4a70',
}
/* Madeira do meio, iluminada de roxo pelo portal; a da frente quase preta */
const MEIO = { racha: '#08020e', escuro: '#120420', base: '#1c0a2e', luz: '#2c1246', brilho: '#5a3a8a', musgo: C.musgo, musgoLuz: C.musgoLuz, roxo: '#24103a' }
const FRENTE = { racha: '#020005', escuro: '#05010a', base: '#0a0312', luz: '#170826', brilho: '#341656', musgo: '#0e1418', musgoLuz: '#1e2a2a' }

usarLuz(PORTAL)

/* ---------- Fundo: céu de floresta, brilho do portal, silhuetas e criaturas ao longe ---------- */
function fundo() {
  const t = new Tela(W, H)
  const rand = aleatorio(11)
  const cores = C.fundo.map(hex)
  /* Mais claro na altura do portal, escurecendo para cima e para baixo */
  t.pinta((x, y, px, py) => {
    const v = Math.max(0, (1 - Math.abs(py - PORTAL.y) / 170) * (cores.length - 1))
    const b = Math.floor(v)
    return cores[Math.min(cores.length - 1, b + (v - b > bayer(px, py) ? 1 : 0))]
  })
  t.brilho(PORTAL.x, PORTAL.y, 150, C.magico, 0.32)
  t.brilho(PORTAL.x, PORTAL.y, 70, C.magicoClaro, 0.22)

  /* Primeira fileira, bem longe, recortada contra o brilho */
  for (let x = -6; x < W + 6; x += 11 + Math.floor(rand() * 10)) {
    if (x > 228 && x < 252) continue
    const chao = 198 + Math.floor(rand() * 6)
    if (rand() < 0.3) pinheiroMorto(t, x, chao, 22 + rand() * 26, C.longe, C.longeLuz, rand)
    else arvoreSilhueta(t, x, chao, 26 + rand() * 30, C.longe, C.longeLuz, 2100 + x, 3)
  }
  t.pinta(() => C.longe, [0, 201, W, H])

  /* Criaturas escondidas entre os troncos */
  criaturaChifres(t, 104, 201)
  criaturaCurvada(t, 384, 201)

  nevoaFaixa(t, C.nevoa, 202, 7, 0.34, 21)

  /* Segunda fileira, mais perto e mais escura */
  for (let x = -8; x < W + 8; x += 18 + Math.floor(rand() * 14)) {
    if (x > 206 && x < 274) continue
    const chao = 224 + Math.floor(rand() * 5)
    arvoreSilhueta(t, x, chao, 40 + rand() * 40, C.perto, C.pertoLuz, 2300 + x, 3)
  }
  t.pinta(() => C.perto, [0, 226, W, H])
  return t
}

/* Silhueta alta de chifres galhados, parada entre as árvores */
function criaturaChifres(t, x, chao) {
  const c = C.criatura
  t.ret(x - 1, chao - 14, 1, 14, c)
  t.ret(x + 3, chao - 14, 1, 14, c)
  t.elipse(x + 1, chao - 18, 4, 5, c)
  t.elipse(x + 1, chao - 25, 2.2, 2.8, c)
  for (const lado of [-1, 1]) {
    t.linha(x + 1, chao - 27, x + 1 + lado * 5, chao - 33, 1, c)
    t.linha(x + 1 + lado * 3, chao - 30, x + 1 + lado * 2, chao - 35, 1, c)
    t.linha(x + 1 + lado * 5, chao - 33, x + 1 + lado * 8, chao - 34, 1, c)
  }
}

/* Fera curvada, de costas largas e chifres para trás */
function criaturaCurvada(t, x, chao) {
  const c = C.criatura
  t.elipse(x, chao - 7, 8, 6, c)
  t.elipse(x - 7, chao - 9, 3.4, 3, c)
  t.linha(x - 8, chao - 11, x - 3, chao - 15, 1, c)
  t.linha(x - 6, chao - 11, x - 1, chao - 14, 1, c)
  for (const dx of [-5, -2, 3, 6]) t.ret(x + dx, chao - 3, 1, 3, c)
}

/* ---------- Meio: o portal de pedra, árvores retorcidas, cogumelos e o caminho ---------- */
function meio() {
  const t = new Tela(W, H)
  const rand = aleatorio(31)
  const n = fbm(33)

  /* Chão e caminho de lajes até o portal */
  for (let y = 214; y < H; y++) for (let x = 0; x < W; x++) {
    const v = n(x / 7, y / 4)
    t.set(x, y, v > 0.66 ? C.chaoLuz : v < 0.3 ? C.chaoSombra : C.chao)
  }
  for (let y = 212; y < H; y++) {
    const meia = 7 + (y - 212) * 0.75
    const linha = 3 + Math.floor((y - 212) / 16)
    for (let x = Math.floor(PORTAL.x - meia); x < PORTAL.x + meia; x++) {
      const junta = (y - 212) % linha === 0 || (x + Math.floor((y - 212) / linha) * 4) % (linha * 3) === 0
      const falha = n(x / 4 + 20, y / 4) < 0.28
      /* As lajes perto do portal pegam o roxo */
      const perto = Math.max(0, 1 - (y - 212) / 40)
      let c = junta ? C.junta : bayer(x, y) < perto * 0.6 ? C.lajeLuz : C.laje
      if (falha) c = C.chao
      t.set(x, y, c)
    }
  }

  /* Energia dentro do portal: anéis girando em direção ao centro */
  const tons = ['#320757', '#4a1a7a', '#6a3aa0', C.magico, C.magicoClaro, C.magicoBrilho].map(hex)
  const dentro = (x, y) => (Math.abs(x - PORTAL.x) < 22 && y >= 134 && y < 212) || Math.hypot(x - PORTAL.x, y - 134) < 22
  t.pinta(
    (x, y, px, py) => {
      if (!dentro(x, y)) return false
      const dx = (x - PORTAL.x) / 22
      const dy = (y - PORTAL.y) / 46
      const d = Math.min(1, Math.hypot(dx, dy))
      const ang = Math.atan2(dy, dx) + d * 5
      const giro = n(Math.cos(ang) * 2 + 9, Math.sin(ang) * 2 + 9)
      const v = (1 - d) * 4.2 + (giro - 0.5) * 1.6
      return tons[Math.max(0, Math.min(5, Math.floor(v + bayer(px, py) * 0.7)))]
    },
    [PORTAL.x - 24, 110, PORTAL.x + 25, 213]
  )

  /* Arco de pedra antiga com juntas e runas */
  const p = new Tela(W, H)
  for (const x0 of [208, 262]) {
    p.ret(x0, 134, 10, 80, C.pedra)
    p.ret(x0 - 2, 206, 14, 7, C.pedra)
  }
  p.pinta((x, y) => {
    const d = Math.hypot(x - PORTAL.x, y - 134)
    return d >= 22 && d < 32 && y < 135 && C.pedra
  }, [200, 100, 282, 136])
  /* Juntas: horizontais nos pilares, em leque no arco */
  for (const x0 of [208, 262]) for (let y = 139; y < 206; y += 6) for (let x = x0; x < x0 + 10; x++) p.set(x, y, C.pedraSombra)
  for (let k = 1; k < 8; k++) {
    const a = Math.PI + (k / 8) * Math.PI
    for (let r = 22; r < 32; r++) p.set(PORTAL.x + Math.cos(a) * r, 134 + Math.sin(a) * r, C.pedraSombra)
  }
  /* Rachaduras e pedras faltando */
  for (const [x, y] of [[210, 160], [211, 161], [211, 162], [270, 178], [269, 179], [270, 180], [271, 181]]) p.set(x, y, C.pedraSombra)
  p.apagar(217, 150)
  p.apagar(217, 151)
  contornoLuz(p, C.pedraLuz, C.pedraSombra)
  t.colar(p)
  /* Runas gravadas nos pilares e na pedra do topo */
  const runa = (x, y) => [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]].forEach(([dx, dy]) => t.set(x + dx, y + dy, C.runa))
  for (const y of [150, 170, 190]) {
    runa(212, y)
    runa(266, y)
  }
  t.ret(PORTAL.x - 2, 103, 5, 5, C.pedraLuz)
  t.set(PORTAL.x, 105, C.magicoBrilho)

  /* Árvores retorcidas dos dois lados, viradas para a luz */
  arvoreRetorcida(t, MEIO, 158, 226, 74, 9, -0.95, 3101, { nivel: 4, inclina: 0.1, raizes: 4, musgo: true, curva: 0.15, quebra: 0.2 })
  arvoreRetorcida(t, MEIO, 326, 228, 80, 9, -Math.PI + 0.95, 3102, { nivel: 4, inclina: -0.12, raizes: 4, musgo: true, curva: 0.15, quebra: 0.2 })
  arvoreRetorcida(t, MEIO, 82, 232, 46, 6, -1.2, 3103, { nivel: 3, inclina: 0.06, raizes: 3 })
  arvoreRetorcida(t, MEIO, 404, 234, 52, 6, -2.0, 3104, { nivel: 3, inclina: -0.08, raizes: 3 })

  /* Pedras antigas e cogumelos que brilham */
  for (const [cx, cy, rx, ry] of [[186, 226, 5, 3], [298, 230, 6, 3.5], [120, 240, 4, 2.5], [362, 244, 5, 3]]) {
    const s = new Tela(W, H)
    s.elipse(cx, cy, rx, ry, C.pedra)
    contornoLuz(s, C.pedraLuz, C.pedraSombra)
    t.colar(s)
  }
  for (const [cx, cy] of [[196, 217], [287, 219], [150, 228], [334, 230], [92, 236]]) {
    for (let k = 0; k < 3; k++) {
      const x = Math.round(cx + (k - 1) * 3 + (rand() - 0.5) * 2)
      const alto = 2 + Math.floor(rand() * 2)
      t.ret(x, cy - alto, 1, alto, C.haste)
      t.ret(x - 1, cy - alto - 1, 3, 1, C.magico)
      t.set(x, cy - alto - 2, C.magicoBrilho)
    }
    t.brilho(cx + 0.5, cy - 3, 6, C.magico, 0.22)
  }
  return t
}

/* ---------- Frente: troncos enormes quase pretos que emolduram a passagem ---------- */
function frente(lado) {
  const t = new Tela(W, H)
  const esquerda = lado === 'esq'
  const arv = esquerda
    ? arvoreRetorcida(t, FRENTE, 18, 272, 230, 34, -0.6, 3201, { nivel: 4, inclina: 0.12, afina: 0.4, ramifica: 0.16, xMax: 170, musgo: true, nos: true, raizes: 5, quebra: 0.2 })
    : arvoreRetorcida(t, FRENTE, 464, 272, 220, 32, -Math.PI + 0.6, 3202, { nivel: 4, inclina: -0.12, afina: 0.4, ramifica: 0.16, xMin: 310, musgo: true, nos: true, raizes: 5, quebra: 0.2 })
  fiosMusgo(t, FRENTE, arv.segs, arv.rand, 22, false, lado)
  /* Mato e espinhos escuros no canto de baixo */
  const rand = aleatorio(esquerda ? 41 : 43)
  const [x0, x1] = esquerda ? [0, 150] : [330, W]
  for (let x = x0; x < x1; x++) {
    const perto = esquerda ? 1 - x / 150 : (x - 330) / 150
    const alto = Math.floor(perto * 14 + rand() * 5)
    for (let y = H - alto; y < H; y++) t.set(x, y, y === H - alto ? FRENTE.luz : FRENTE.escuro)
    if (rand() < 0.3) t.ret(x, H - alto - 1 - Math.floor(rand() * 4), 1, 4, FRENTE.base)
  }
  return t
}

/* ---------- Animações ---------- */
const svg = (estilo, corpo, w = W, h = H) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><style>${estilo}</style>${corpo}</svg>`

const BRUXA = ['.....X......', '....XX......', '...XXX......', '..XXXXX.....', '....XX......', 'XXXXXXXXXXX.', 'XX...X.X....']

function faixa(classe, b64, y, h) {
  const img = (x) => `<image href="data:image/png;base64,${b64}" x="${x}" y="${y}" width="${W}" height="${h}" style="image-rendering:pixelated" preserveAspectRatio="none"/>`
  return `<g class="${classe}">${img(0)}${img(W)}</g>`
}

function anim() {
  let corpo = ''
  /* Névoa em duas alturas, andando em sentidos opostos */
  corpo += faixa('n1', nevoaImagem(C.nevoa, W, 40, 81, 0.5), 178, 40)
  corpo += faixa('n2', nevoaImagem(C.nevoa, W, 44, 82, 0.45), 226, 44)
  /* Pulso de energia no portal */
  corpo += `<ellipse class="pulso" cx="${PORTAL.x}" cy="${PORTAL.y}" rx="22" ry="42" fill="${C.magicoClaro}"/>`
  /* Olhos entre as árvores distantes: aparecem uma vez e somem */
  for (const [i, [x, y]] of [[96, 190], [402, 186]].entries()) {
    corpo += `<g class="olhos" style="animation-delay:${0.5 + i * 0.9}s" fill="${C.magicoClaro}"><rect x="${x}" y="${y}" width="1" height="1"/><rect x="${x + 2}" y="${y}" width="1" height="1"/></g>`
  }
  /* A bruxa cruza o brilho do portal na vassoura */
  corpo += `<g class="bruxa" fill="#07010d">${desenho(BRUXA, 0, 118)}</g>`
  return svg(
    `.n1{animation:deriva 60s steps(${W},end) infinite}
.n2{animation:deriva 44s steps(${W},end) infinite reverse}
.pulso{opacity:.04;animation:pulso 1.8s ease-in-out infinite}
.olhos{opacity:0;animation:olhar 5.5s ease-in-out infinite}
.bruxa{transform:translateX(-20px);animation:voar 5s steps(60,end) infinite;animation-delay:.25s}
@keyframes deriva{to{transform:translateX(-${W}px)}}
@keyframes pulso{50%{opacity:.2}}
@keyframes olhar{0%,100%{opacity:0}12%,30%{opacity:.85}45%{opacity:0}}
@keyframes voar{0%{transform:translate(150px,0)}30%{transform:translate(330px,-10px)}31%,100%{transform:translate(-20px,0)}}`,
    corpo
  )
}

/* Partículas mágicas perto do portal e dos cogumelos (o celular não carrega este arquivo) */
function particulas() {
  const rand = aleatorio(51)
  let corpo = ''
  for (const [x, y] of [[226, 200], [254, 196], [232, 150], [250, 140], [198, 214], [286, 216], [152, 226], [334, 228], [240, 120], [218, 176], [262, 182], [94, 234]]) {
    corpo += `<rect class="p" style="animation-duration:${(2.2 + rand() * 1.8).toFixed(2)}s;animation-delay:-${(rand() * 3).toFixed(2)}s" x="${x}" y="${y}" width="1" height="1" fill="${rand() > 0.4 ? C.magicoBrilho : C.magicoClaro}"/>`
  }
  return svg(
    `.p{opacity:0;animation:subir 3s steps(12,end) infinite}
@keyframes subir{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}60%{opacity:.6;transform:translate(2px,-8px)}100%{opacity:0;transform:translate(-1px,-16px)}}`,
    corpo
  )
}

/*
 * Selo rúnico (indicador de carregamento indeterminado): anel de pedra escura
 * e oito runas que acendem uma depois da outra, girando em volta do centro.
 */
function selo() {
  const L = 56
  const c = L / 2
  let corpo = ''
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c)
    if (d >= 24 && d < 26.5) corpo += `<rect x="${x}" y="${y}" width="1" height="1" fill="#150324"/>`
    else if (d >= 23 && d < 24) corpo += `<rect x="${x}" y="${y}" width="1" height="1" fill="${C.magico}"/>`
    else if (d >= 10 && d < 11) corpo += `<rect x="${x}" y="${y}" width="1" height="1" fill="#320757" fill-opacity=".9"/>`
  }
  const RUNAS = [['X.X', '.X.', 'X.X'], ['XX.', 'X.X', 'XX.'], ['.X.', 'XXX', '.X.'], ['X..', 'XX.', 'X.X'], ['XXX', '.X.', '.X.'], ['X.X', 'XXX', 'X.X'], ['.XX', 'X..', '.XX'], ['X..', 'X..', 'XXX']]
  RUNAS.forEach((r, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const x = Math.round(c + Math.cos(a) * 17 - 1.5)
    const y = Math.round(c + Math.sin(a) * 17 - 1.5)
    corpo += `<g fill="#4a1a7a">${desenho(r, x, y)}</g>`
    corpo += `<g class="r" style="animation-delay:${(i * 0.15).toFixed(2)}s" fill="${C.magicoBrilho}">${desenho(r, x, y)}</g>`
  })
  /* Estrela no centro */
  corpo += `<g class="centro" fill="${C.magicoBrilho}">${desenho(['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'], c - 2.5, c - 2.5)}</g>`
  return svg(
    `.r{opacity:0;animation:runa 1.2s steps(4,end) infinite}
.centro{animation:centro 1.2s steps(3,end) infinite}
@keyframes runa{0%{opacity:1}40%,100%{opacity:0}}
@keyframes centro{50%{opacity:.5}}`,
    corpo,
    L,
    L
  )
}

/* ---------- Saída ---------- */
const pasta = path.join(__dirname, '..', 'public', 'transicao')
fs.mkdirSync(pasta, { recursive: true })
let total = 0
const telas = [['fundo', fundo()], ['meio', meio()], ['frente-esq', frente('esq')], ['frente-dir', frente('dir')]]
for (const [nome, tela] of telas) {
  const png = tela.png()
  fs.writeFileSync(path.join(pasta, `${nome}.png`), png)
  total += png.length
}
for (const [nome, conteudo] of [['anim.svg', anim()], ['particulas.svg', particulas()], ['selo.svg', selo()]]) {
  fs.writeFileSync(path.join(pasta, nome), conteudo)
  total += conteudo.length
}
console.log(`transição gerada em public/transicao (${(total / 1024).toFixed(0)} KB)`)
