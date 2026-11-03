import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import seguranca from './seguranca.json' with { type: 'json' }

/*
 * As tags de prévia do link (og:image) precisam do endereço completo do site.
 * Usa SITE_URL se existir; na Vercel, o domínio de produção que ela informa no build.
 * Sem nenhum dos dois (rodando local), fica o caminho relativo.
 */
const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL
const site = (process.env.SITE_URL ?? (producao ? `https://${producao}` : '')).replace(/\/+$/, '')

const enderecoDoSite = (): Plugin => ({
  name: 'endereco-do-site',
  transformIndexHtml: (html) => html.replaceAll('__SITE__', site),
})

// https://vite.dev/config/
/*
 * Cabeçalhos de segurança (Content-Security-Policy e outros): os mesmos do vercel.json.
 * A prévia local (npm run preview, usada nos testes) manda os mesmos, então os testes pegam o que a CSP bloquear.
 * O hash sha256 da CSP é o do script que aplica o tema antes de a página aparecer (index.html): mudou o script, muda o hash.
 */
const cabecalhos = Object.fromEntries(seguranca.map((c: { key: string; value: string }) => [c.key, c.value]))

export default defineConfig({
  plugins: [react(), enderecoDoSite()],
  preview: { headers: cabecalhos },
})
