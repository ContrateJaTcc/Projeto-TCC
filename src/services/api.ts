/*
 * Ponto unico de acesso ao backend.
 *
 * Antes a URL estava escrita a mao em 6 arquivos, o que impedia testar contra
 * localhost sem editar todos eles.
 *
 * O fallback existe porque o .gitignore do projeto ignora .env*: se o arquivo
 * nao chegar ao build (Vercel, por exemplo), sem ele a aplicacao apontaria
 * para "undefined/auth/login" e quebraria em producao.
 */
const BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://backendtcc-zeta.vercel.app'

export class ErroApi extends Error {
  status: number

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
  }
}

export function getToken() {
  return localStorage.getItem('token')
}

/*
 * Grava a sessao devolvida por /auth/login, /auth/google ou pelo cadastro
 * com Google. Devolve o tipo da conta, ou null se nao der para identificar.
 */
export function salvarSessao(token: string, tipo?: 'freelancer' | 'contratante'): 'freelancer' | 'contratante' | null {
  // tipo so existe depois que o backend novo for publicado;
  // ate la o valor vem de dentro do proprio token.
  const tipoReal = tipo ?? lerTipoDoToken(token)

  if (!tipoReal) return null

  localStorage.setItem('token', token)
  localStorage.setItem('tipo', tipoReal)
  return tipoReal
}

export function limparSessao() {
  localStorage.removeItem('token')
  localStorage.removeItem('tipo')
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  corpo?: unknown
  /* Login e cadastro nao tem token ainda; nao faz sentido deslogar em um 401 deles. */
  publico?: boolean
}

export async function api<T = unknown>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, publico = false } = opcoes
  const token = getToken()

  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !publico ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })

  /*
   * O token expira em 1 hora. Sem este desvio, toda tela passava a mostrar
   * "Erro ao carregar" e a pessoa ficava presa ate limpar o localStorage
   * na mao, sem entender o motivo.
   */
  if (resposta.status === 401 && !publico) {
    limparSessao()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expirou=1'
    }
    throw new ErroApi(401, 'Sua sessão expirou. Entre novamente.')
  }

  if (resposta.status === 204) return undefined as T

  // Erro de proxy ou rota errada devolve HTML; sem isto o .json() estoura
  // com "Unexpected token <" em vez de uma mensagem legivel.
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

/*
 * Le o campo "tipo" de dentro do JWT, sem validar a assinatura.
 *
 * Serve so para escolher a area da interface. A autorizacao de verdade
 * continua no servidor, que valida o token a cada requisicao — um token
 * adulterado aqui nao daria acesso a nada.
 *
 * Existe para o frontend nao depender da ordem do deploy: enquanto o backend
 * publicado nao devolver "tipo" no login, o valor vem daqui.
 */
export function lerTipoDoToken(token: string): 'freelancer' | 'contratante' | null {
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
    return payload && (json.tipo === 'freelancer' || json.tipo === 'contratante') ? json.tipo : null
  } catch {
    return null
  }
}
