/*
 * Confere o contraste das cores do site nos dois temas (regra WCAG: 4,5:1 para texto comum, 3:1 para títulos grandes).
 * Lê as variáveis de src/index.css: o bloco :root (noite) e o bloco do modo claro, que só troca algumas.
 * Uso: npm run contraste  (sai com erro se algum par não passar)
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.css'), 'utf8')

function variaveis(bloco) {
  const v = {}
  for (const [, nome, valor] of bloco.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) v[nome] = valor
  return v
}

const blocos = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
const noite = variaveis(blocos.find(([, sel]) => sel.trim() === ':root')[2])
const claro = { ...noite, ...variaveis(blocos.find(([, sel]) => sel.includes("data-theme='light'"))[2]) }

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/* [texto, fundo, mínimo] */
const PARES = [
  ['color-text', 'color-bg', 4.5],
  ['color-text', 'color-surface', 4.5],
  ['color-text-soft', 'color-surface', 4.5],
  ['color-text-muted', 'color-surface', 4.5],
  ['color-text-muted', 'color-bg', 4.5],
  ['color-titulo', 'color-surface', 3],
  ['color-titulo', 'color-bg-alt', 3],
  ['color-tinta', 'color-accent', 4.5],
  ['color-tinta', 'color-accent-hover', 4.5],
  ['color-feitico', 'color-surface', 3],
  ['color-ouro-texto', 'color-surface', 4.5],
  ['color-danger', 'color-surface', 4.5],
  ['color-sucesso', 'color-surface', 4.5],
  ['color-text', 'color-campo', 4.5],
]

let falhas = 0
for (const [tema, v] of [['noite', noite], ['claro', claro]]) {
  console.log(`\n${tema}`)
  for (const [texto, fundo, minimo] of PARES) {
    if (!v[texto] || !v[fundo]) continue
    const r = contraste(v[texto], v[fundo])
    const ok = r >= minimo
    if (!ok) falhas++
    console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${r.toFixed(2).padStart(5)}:1  ${texto} ${v[texto]} sobre ${fundo} ${v[fundo]} (mín. ${minimo})`)
  }
}
console.log(falhas ? `\n${falhas} par(es) abaixo do mínimo` : '\ntudo legível')
process.exit(falhas ? 1 : 0)
