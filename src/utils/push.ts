import { api } from '../services/api'
import { demoAtivo } from '../services/demoflag'

/*
 * Avisos no celular/computador (Web Push): o navegador se inscreve com a chave do servidor
 * e o service worker (public/sw.js) mostra o aviso, mesmo com o site fechado.
 */

export type EstadoPush = 'ligado' | 'desligado' | 'bloqueado' | 'indisponivel'

/* Precisa do service worker: só existe no site publicado, não no npm run dev nem no modo demonstração */
export const pushSuportado = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && import.meta.env.PROD && !demoAtivo()

/* A chave vem em base64 de URL; o navegador quer os bytes */
function bytesDaChave(chave: string) {
  const base64 = (chave + '='.repeat((4 - (chave.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function inscricaoAtual() {
  const registro = await navigator.serviceWorker.ready
  return registro.pushManager.getSubscription()
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!pushSuportado()) return 'indisponivel'
  if (Notification.permission === 'denied') return 'bloqueado'
  return (await inscricaoAtual()) ? 'ligado' : 'desligado'
}

export async function ligarPush() {
  const { chave } = await api<{ chave: string | null }>('/push/chave', { publico: true, silencioso: true })
  if (!chave) throw new Error('O servidor ainda não está configurado para mandar avisos.')

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('Você não deixou o site mandar avisos. Dá para liberar no cadeado da barra de endereço.')

  const registro = await navigator.serviceWorker.ready
  const inscricao = (await registro.pushManager.getSubscription()) ?? (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chave) }))
  await api('/push/inscricao', { metodo: 'POST', corpo: inscricao.toJSON() })
}

export async function desligarPush() {
  const inscricao = await inscricaoAtual()
  if (!inscricao) return
  await api('/push/inscricao', { metodo: 'DELETE', corpo: { endpoint: inscricao.endpoint } }).catch(() => {})
  await inscricao.unsubscribe()
}
