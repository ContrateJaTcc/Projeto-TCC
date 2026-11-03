/*
 * Só a "chave" do modo demonstração. Os dados de exemplo (services/demo.ts) são grandes
 * e só são baixados quando alguém entra na demonstração.
 */
export const CHAVE_DEMO = 'demo'
export const CHAVE_ESTADO_DEMO = 'demo:estado'

export function demoAtivo() {
  try {
    return localStorage.getItem(CHAVE_DEMO) === '1'
  } catch {
    return false
  }
}

export function limparDemo() {
  try {
    localStorage.removeItem(CHAVE_DEMO)
    sessionStorage.removeItem(CHAVE_ESTADO_DEMO)
  } catch {
    /* Sem armazenamento */
  }
}
