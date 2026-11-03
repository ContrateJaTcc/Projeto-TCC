/*
 * Imagem de prévia do link (WhatsApp, Discord, redes): 1200x630 com o castelo, o logo e o slogan.
 * Monta a arte numa página e fotografa com o Chromium do Playwright.
 * Saída: public/og-imagem.png
 * Uso: node scripts/gerar-og.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

const raiz = path.join(__dirname, '..')
const comoDado = (arq) => `data:image/png;base64,${fs.readFileSync(path.join(raiz, arq)).toString('base64')}`

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;800&family=Jersey+10&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: Inter, sans-serif; }
  .cena { position: absolute; inset: 0; background: url(${comoDado('public/fundo/ceu-claro.png')}) center / cover; image-rendering: pixelated; }
  .castelo { position: absolute; inset: 0; background: url(${comoDado('public/fundo/castelo-claro.png')}) center bottom / cover; image-rendering: pixelated; }
  .veu { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20, 11, 32, 0.92) 0%, rgba(20, 11, 32, 0.78) 45%, rgba(20, 11, 32, 0) 75%); }
  .texto { position: absolute; left: 80px; top: 50%; transform: translateY(-50%); width: 640px; color: #fff; }
  .marca { display: flex; align-items: center; gap: 22px; }
  .marca img { width: 120px; image-rendering: pixelated; }
  .marca span { font-family: 'Jersey 10', monospace; font-size: 112px; line-height: 1; text-shadow: 6px 6px 0 #1c0d33; }
  h2 { margin-top: 26px; font-size: 40px; line-height: 1.2; font-weight: 800; text-shadow: 3px 3px 0 #1c0d33; }
  p { margin-top: 18px; font-size: 26px; font-weight: 600; color: #c8e9f0; }
  .selos { display: flex; gap: 14px; margin-top: 30px; }
  .selos b { padding: 8px 18px; border: 3px solid #140b20; background: #5ec4d6; color: #140b20; font-size: 22px; box-shadow: 4px 4px 0 #140b20; }
</style></head>
<body>
  <div class="cena"></div><div class="castelo"></div><div class="veu"></div>
  <div class="texto">
    <div class="marca"><img src="${comoDado('src/components/imgs/logo.png')}" alt=""><span>ContrateJá</span></div>
    <h2>Freelancers e contratantes numa jornada de conquistas</h2>
    <p>Projetos de verdade, níveis, XP e insígnias.</p>
    <div class="selos"><b>Níveis</b><b>Insígnias</b><b>Ranking</b></div>
  </div>
</body></html>`

;(async () => {
  /* Usa o Chrome instalado, como os testes (playwright.config) */
  const navegador = await chromium.launch({ channel: 'chrome' })
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } })
  await pagina.setContent(html, { waitUntil: 'networkidle' })
  await pagina.screenshot({ path: path.join(raiz, 'public/og-imagem.png') })
  await navegador.close()
  console.log('public/og-imagem.png')
})()
