/*
 * Login com Google via Google Identity Services (fluxo "token client").
 *
 * Usamos este fluxo, e nao o botao pronto do Google, para manter o botao
 * "Continuar com Google" com o visual do site. O frontend so obtem o access
 * token; quem decide se ele vale e o backend (rota /auth/google), que confere
 * com o Google se o token foi emitido para este Client ID.
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

interface RespostaToken {
  access_token?: string
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken: () => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resposta: RespostaToken) => void
            error_callback?: (erro: { type: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

let carregandoScript: Promise<void> | null = null

function carregarScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()

  carregandoScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      carregandoScript = null
      reject(new Error('Não foi possível carregar o login do Google. Verifique sua conexão.'))
    }
    document.head.appendChild(script)
  })

  return carregandoScript
}

/* Abre o popup do Google e resolve com o access token. */
export async function pedirTokenGoogle(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error('Login com Google não configurado (falta VITE_GOOGLE_CLIENT_ID).')
  }

  await carregarScript()

  return new Promise((resolve, reject) => {
    const cliente = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile',
      callback: (resposta) => {
        if (resposta.access_token) {
          resolve(resposta.access_token)
        } else {
          reject(new Error(resposta.error_description || 'O Google recusou o login.'))
        }
      },
      error_callback: (erro) => {
        reject(
          new Error(
            erro.type === 'popup_closed'
              ? 'A janela do Google foi fechada antes de concluir.'
              : 'Não foi possível abrir a janela do Google. Libere pop-ups para este site.'
          )
        )
      },
    })

    cliente.requestAccessToken()
  })
}

export interface DadosGoogle {
  token: string
  email: string
  nome: string
  sobrenome: string
}
