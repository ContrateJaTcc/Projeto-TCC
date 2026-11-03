/* API */
import { demoAtivo, limparDemo } from './demoflag'

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://backendtcc-zeta.vercel.app'

/* Documentação da API (Swagger) que o próprio servidor publica */
export const URL_DOCS_API = `${BASE}/docs`

export class ErroApi extends Error {
  status: number

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
  }
}

/* Papéis */
export type Papel = 'freelancer' | 'contratante' | 'administrador'

const PAPEIS: Papel[] = ['freelancer', 'contratante', 'administrador']

export const ehPapel = (valor: unknown): valor is Papel => PAPEIS.includes(valor as Papel)

/* Carregamento global */
let pendentes = 0
let acoes = 0

function avisarCarregamento(delta: number, ehAcao: boolean) {
  pendentes = Math.max(0, pendentes + delta)
  window.dispatchEvent(new CustomEvent('api:carregando', { detail: pendentes }))

  /* Ações: tela da bruxa */
  if (ehAcao) {
    acoes = Math.max(0, acoes + delta)
    window.dispatchEvent(new CustomEvent('api:acao', { detail: acoes }))
  }
}

export function getToken() {
  return localStorage.getItem('token')
}

/* Sessão */
export function salvarSessao(token: string, tipo?: Papel): Papel | null {
  // Tipo
  const tipoReal = ehPapel(tipo) ? tipo : lerTipoDoToken(token)

  if (!tipoReal) return null

  localStorage.setItem('token', token)
  localStorage.setItem('tipo', tipoReal)
  return tipoReal
}

export function limparSessao() {
  localStorage.removeItem('token')
  localStorage.removeItem('tipo')
  localStorage.removeItem(SUPREMO_TOKEN)
  localStorage.removeItem(SUPREMO_COMO)
  limparDemo()
}

/*
 * Supremo "entrando como" outra conta: a sessão dele fica guardada à parte,
 * e o site mostra uma faixa para voltar (components/layout/faixasupremo.tsx).
 */
const SUPREMO_TOKEN = 'supremo:token'
const SUPREMO_COMO = 'supremo:vendo-como'

export function entrarComoOutraConta(token: string, tipo: Papel, nome: string) {
  const meu = getToken()
  if (meu && !localStorage.getItem(SUPREMO_TOKEN)) localStorage.setItem(SUPREMO_TOKEN, meu)
  localStorage.setItem(SUPREMO_COMO, nome)
  return salvarSessao(token, tipo)
}

/* Nome de quem o supremo está vendo agora (null = sessão normal) */
export const vendoComo = () => (localStorage.getItem(SUPREMO_TOKEN) ? localStorage.getItem(SUPREMO_COMO) : null)

/* Volta para a conta do supremo; devolve o papel dela (administrador) */
export function voltarAoSupremo(): Papel | null {
  const token = localStorage.getItem(SUPREMO_TOKEN)
  localStorage.removeItem(SUPREMO_TOKEN)
  localStorage.removeItem(SUPREMO_COMO)
  return token ? salvarSessao(token) : null
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  corpo?: unknown
  /* Público */
  publico?: boolean
  /* Sem barra de carregamento nem tela da bruxa */
  silencioso?: boolean
  sinal?: AbortSignal
}

export async function api<T = unknown>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, publico = false, silencioso = false, sinal } = opcoes
  const token = getToken()

  const ehAcao = metodo !== 'GET'

  /* Modo demonstração: responde com os dados de exemplo, sem servidor (services/demo.ts) */
  if (demoAtivo()) {
    if (!silencioso) avisarCarregamento(1, ehAcao)
    /* Os dados de exemplo só são baixados aqui, na primeira vez */
    const demo = await import('./demo')
    try {
      return (await demo.responderDemo(metodo, caminho, token, corpo, sinal)) as T
    } catch (e) {
      if (e instanceof demo.ErroDemo) throw new ErroApi(e.status, e.message)
      throw e
    } finally {
      if (!silencioso) avisarCarregamento(-1, ehAcao)
    }
  }

  if (!silencioso) avisarCarregamento(1, ehAcao)

  let resposta: Response

  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token && !publico ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: sinal,
    })
  } finally {
    if (!silencioso) avisarCarregamento(-1, ehAcao)
  }

  /* Sessão expirada */
  if (resposta.status === 401 && !publico) {
    limparSessao()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expirou=1'
    }
    throw new ErroApi(401, 'Sua sessão expirou. Entre novamente.')
  }

  if (resposta.status === 204) return undefined as T

  // Resposta
  const tipoConteudo = resposta.headers.get('content-type') ?? ''
  if (!tipoConteudo.includes('application/json')) {
    if (!resposta.ok) {
      throw new ErroApi(resposta.status, `O servidor não respondeu como esperado (${resposta.status}).`)
    }
    return undefined as T
  }

  const dados = await resposta.json()

  if (!resposta.ok) {
    throw new ErroApi(resposta.status, dados?.erro || dados?.mensagem || 'Erro na requisição.')
  }

  return dados as T
}

/* Tipo do token */
export function lerTipoDoToken(token: string): Papel | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      )
    )
    return ehPapel(json.tipo) ? json.tipo : null
  } catch {
    return null
  }
}
