import { api } from '../services/api'

/*
 * Monitor de erros do site: o que quebrar no navegador das pessoas vai para a aba Erros do painel admin
 * (o servidor agrupa e conta). Cada erro é mandado uma vez por visita, e no máximo 10 por visita.
 */
const enviados = new Set<string>()
const MAXIMO = 10

export function relatarErro(erro: unknown, onde = location.pathname) {
  if (!import.meta.env.PROD) return
  const mensagem = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro ?? 'Erro sem mensagem')
  /* Extensão do navegador e script de fora não são problema do site */
  if (/extension:\/\/|ResizeObserver loop|Script error\.?$/i.test(mensagem + (erro instanceof Error ? erro.stack ?? '' : ''))) return
  /* Troca de versão do site com a aba aberta: o pacote antigo some do servidor; recarregar resolve */
  if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(mensagem)) return
  const chave = `${mensagem}|${onde}`
  if (enviados.has(chave) || enviados.size >= MAXIMO) return
  enviados.add(chave)
  api('/publico/erros', { metodo: 'POST', publico: true, silencioso: true, corpo: { mensagem: mensagem.slice(0, 500), local: onde.slice(0, 300) } }).catch(() => {})
}

export function instalarMonitor() {
  window.addEventListener('error', (e) => relatarErro(e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => relatarErro(e.reason))
}
