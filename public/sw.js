/*
 * Service worker do ContrateJá: deixa o site ser instalado como app e abrir sem internet.
 * - Páginas: tenta a rede; sem rede, abre a última versão guardada do site.
 * - Arquivos do próprio site (código, arte do fundo, fontes): guarda depois do primeiro uso.
 * - O servidor (API) nunca é guardado: dados sempre frescos. Sem internet, o modo demonstração funciona.
 */
const VERSAO = 'contrateja-v2'
const ESSENCIAIS = ['/', '/index.html', '/favicon.png', '/icone-192.png', '/icone-512.png', '/manifest.webmanifest']
const FONTES = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting()))
})

/* Versão nova: apaga as guardadas das versões antigas */
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

async function guardar(pedido, resposta) {
  if (resposta && (resposta.ok || resposta.type === 'opaque')) {
    const cache = await caches.open(VERSAO)
    await cache.put(pedido, resposta.clone())
  }
  return resposta
}

/* Aviso do servidor (nova mensagem, contratação...): aparece mesmo com o site fechado */
self.addEventListener('push', (evento) => {
  let dados = { titulo: 'ContrateJá', texto: 'Você tem novidades.', url: '/' }
  try {
    dados = { ...dados, ...evento.data.json() }
  } catch {
    /* Aviso sem conteúdo: usa o padrão */
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.texto,
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      data: { url: dados.url },
      tag: dados.titulo,
    })
  )
})

/* Tocar no aviso: volta para uma aba do site aberta, ou abre uma nova, na página do aviso */
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = new URL(evento.notification.data?.url ?? '/', self.location.origin).href
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      const aba = abas.find((a) => a.url.startsWith(self.location.origin))
      if (aba) return aba.navigate(url).then((a) => (a ?? aba).focus())
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return

  const url = new URL(pedido.url)
  const doSite = url.origin === self.location.origin
  const fonte = FONTES.some((f) => pedido.url.startsWith(f))
  if (!doSite && !fonte) return

  /* Navegação (abrir uma página): rede primeiro, senão o site guardado (o app é uma página só) */
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((r) => guardar('/index.html', r))
        .catch(async () => (await caches.match('/index.html')) ?? (await caches.match('/')))
    )
    return
  }

  /* Resto: o guardado na hora, e atualiza em segundo plano */
  evento.respondWith(
    caches.match(pedido).then((guardado) => {
      const daRede = fetch(pedido)
        .then((r) => guardar(pedido, r))
        .catch(() => guardado)
      return guardado ?? daRede
    })
  )
})
