/*
 * Diminui uma foto no navegador antes de enviar (o servidor aceita até ~200 KB por imagem):
 * lado maior até 1280 px e qualidade JPEG baixando até caber.
 */
const LADO_MAXIMO = 1280
const LIMITE = 190_000

function carregar(arquivo: File) {
  return new Promise<HTMLImageElement>((pronto, falha) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      pronto(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      falha(new Error('Não deu para abrir essa imagem.'))
    }
    img.src = url
  })
}

export async function comprimirImagem(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')

  const img = await carregar(arquivo)
  let lado = LADO_MAXIMO

  /* Diminui o tamanho e a qualidade até a imagem caber no limite */
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const escala = Math.min(1, lado / Math.max(img.width, img.height))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(img.width * escala))
    tela.height = Math.max(1, Math.round(img.height * escala))
    const ctx = tela.getContext('2d')
    if (!ctx) break
    /* Fundo branco: PNG transparente não fica preto no JPEG */
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, tela.width, tela.height)
    ctx.drawImage(img, 0, 0, tela.width, tela.height)

    for (const qualidade of [0.82, 0.68, 0.55]) {
      const dados = tela.toDataURL('image/jpeg', qualidade)
      if (dados.length <= LIMITE) return dados
    }
    lado = Math.round(lado * 0.75)
  }

  throw new Error('Essa imagem é grande demais. Tente outra.')
}
