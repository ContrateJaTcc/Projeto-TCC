/* Ferramentas para desenhar pixel art em grade e exportar como SVG */

class Grade {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.px = Array.from({ length: h }, () => Array(w).fill(null))
    /* Origem do desenho (permite coordenadas negativas) */
    this.dx = 0
    this.dy = 0
  }

  origem(dx, dy) {
    this.dx = dx
    this.dy = dy
    return this
  }

  pintar(x, y, cor) {
    x += this.dx
    y += this.dy
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y][x] = cor
  }

  ler(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y][x] : null
  }

  /* Pinta todo pixel cujo centro passa no teste */
  preencher(teste, cor, caixa = [0, 0, this.w, this.h]) {
    const [x0, y0, x1, y1] = [caixa[0] + this.dx, caixa[1] + this.dy, caixa[2] + this.dx, caixa[3] + this.dy].map(Math.round)
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) {
        const c = teste(x + 0.5 - this.dx, y + 0.5 - this.dy)
        if (c) this.px[y][x] = typeof c === 'string' ? c : cor
      }
    }
  }

  circulo(cx, cy, r, cor) {
    this.preencher((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, cor, [cx - r - 1, cy - r - 1, cx + r + 2, cy + r + 2])
  }

  elipse(cx, cy, rx, ry, cor) {
    this.preencher((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, cor, [cx - rx - 1, cy - ry - 1, cx + rx + 2, cy + ry + 2])
  }

  /* Traço grosso entre dois pontos */
  linha(ax, ay, bx, by, grossura, cor) {
    const dx = bx - ax
    const dy = by - ay
    const tam = dx * dx + dy * dy || 1
    const r = grossura / 2
    this.preencher(
      (x, y) => {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / tam))
        return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r
      },
      cor,
      [Math.min(ax, bx) - r - 1, Math.min(ay, by) - r - 1, Math.max(ax, bx) + r + 2, Math.max(ay, by) + r + 2]
    )
  }

  /* Sequência de traços, com grossura que pode afinar */
  traco(pontos, grossuras, cor) {
    for (let i = 1; i < pontos.length; i++) {
      const g = Array.isArray(grossuras) ? grossuras[i - 1] : grossuras
      this.linha(...pontos[i - 1], ...pontos[i], g, cor)
    }
  }

  poligono(pontos, cor) {
    const xs = pontos.map((p) => p[0])
    const ys = pontos.map((p) => p[1])
    this.preencher(
      (x, y) => {
        let dentro = false
        for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
          const [xi, yi] = pontos[i]
          const [xj, yj] = pontos[j]
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
        }
        return dentro
      },
      cor,
      [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 2, Math.max(...ys) + 2]
    )
  }

  /* Contorno de 1 pixel em volta do desenho */
  contornar(cor) {
    const marcar = []
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.px[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.ler(x + dx, y + dy))) marcar.push([x, y])
      }
    }
    for (const [x, y] of marcar) this.px[y][x] = cor
    return this
  }

  /* Copia outra grade por cima, deslocada */
  colar(outra, ox, oy) {
    for (let y = 0; y < outra.h; y++) {
      for (let x = 0; x < outra.w; x++) {
        const [px, py] = [x + ox, y + oy]
        if (outra.px[y][x] && px >= 0 && py >= 0 && px < this.w && py < this.h) this.px[py][px] = outra.px[y][x]
      }
    }
  }

  /* Exporta em retângulos por linha (menos elementos) */
  rects(ox = 0, oy = 0) {
    let r = ''
    for (let y = 0; y < this.h; y++) {
      let x = 0
      while (x < this.w) {
        const cor = this.px[y][x]
        let fim = x + 1
        while (fim < this.w && this.px[y][fim] === cor) fim++
        if (cor) {
          const [fill, extra] = cor.split('|')
          r += `<rect x="${x + ox}" y="${y + oy}" width="${fim - x}" height="1" fill="${fill}"${extra ? ` ${extra}` : ''}/>`
        }
        x = fim
      }
    }
    return r
  }
}

/* Aleatório com semente: o desenho sai sempre igual */
function aleatorio(semente) {
  return () => {
    semente = (semente * 16807) % 2147483647
    return (semente - 1) / 2147483646
  }
}

/* Ruído suave para manchas da lua e nuvens */
function ruido(semente) {
  const rand = aleatorio(semente)
  const tabela = Array.from({ length: 256 }, rand)
  const v = (x, y) => tabela[(((x * 73856093) ^ (y * 19349663)) >>> 0) % 256]
  const suave = (t) => t * t * (3 - 2 * t)
  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = suave(x - xi)
    const fy = suave(y - yi)
    const a = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * fx
    const b = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * fx
    return a + (b - a) * fy
  }
}

/* Fantasminha */
function fantasma() {
  const g = new Grade(11, 12).origem(1, 1)
  g.circulo(4.5, 4, 3.8, '#f2eeff')
  g.preencher(() => '#f2eeff', null, [0.7, 4, 8.3, 8])
  for (const x of [1, 4, 7]) g.pintar(x, 8, '#f2eeff')
  g.pintar(3, 4, '#1c0d33')
  g.pintar(6, 4, '#1c0d33')
  g.pintar(4, 6, '#c9b8ff')
  return g.contornar('#1c0d33')
}

module.exports = { Grade, aleatorio, ruido, fantasma }
