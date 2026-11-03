/* Link do perfil público: /p/12-ana-freelancer (o número manda; o nome só deixa o link legível) */
export function linkPerfilPublico(usuId: number, nome: string) {
  const slug = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${window.location.origin}/p/${usuId}${slug ? `-${slug}` : ''}`
}

/* Compartilha pelo menu do aparelho (celular) ou copia o link */
export async function compartilharPerfil(usuId: number, nome: string): Promise<'compartilhado' | 'copiado' | 'cancelado' | 'erro'> {
  const url = linkPerfilPublico(usuId, nome)
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: `${nome} no Contrate Já`, text: `Veja o portfólio e as avaliações de ${nome}.`, url })
      return 'compartilhado'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copiado'
  } catch {
    return 'erro'
  }
}
