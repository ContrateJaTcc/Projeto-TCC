/*
 * Avatar em pixel art (16x16) montado no editor do perfil. Vira PNG pequeno para guardar como foto
 * (o servidor aceita JPG, PNG e WEBP).
 */
export interface OpcoesAvatar {
  pele: string
  cabelo: 'curto' | 'longo' | 'coque' | 'moicano' | 'careca'
  corCabelo: string
  roupa: string
  fundo: string
  acessorio: 'nenhum' | 'oculos' | 'bone' | 'chapeu'
}

export const PELES = ['#f6d7b8', '#e0a77a', '#c68a5e', '#8d5a3b', '#5c3a26']
export const CORES_CABELO = ['#1b1b30', '#3b2418', '#8b5a2b', '#e0b35a', '#c69fa5', '#8b6d9c']
export const ROUPAS = ['#494d7e', '#8b6d9c', '#d8433a', '#2f7a46', '#5ec4d6', '#f2d3ab']
export const FUNDOS = ['#5ec4d6', '#f2d3ab', '#c69fa5', '#8b6d9c', '#272744', '#5fe0a0']

export const PADRAO_AVATAR: OpcoesAvatar = { pele: PELES[1], cabelo: 'curto', corCabelo: CORES_CABELO[1], roupa: ROUPAS[0], fundo: FUNDOS[0], acessorio: 'nenhum' }

type Pixel = [x: number, y: number, cor: string]

const ret = (x0: number, y0: number, x1: number, y1: number, cor: string): Pixel[] => {
  const p: Pixel[] = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.push([x, y, cor])
  return p
}

/* Lista de pixels, em ordem de pintura (o que vem depois fica por cima) */
export function pixelsDoAvatar(o: OpcoesAvatar): Pixel[] {
  const escura = '#1b1b30'
  const p: Pixel[] = [...ret(0, 0, 15, 15, o.fundo)]
  /* Cabelo comprido fica atrás do rosto */
  if (o.cabelo === 'longo') p.push(...ret(3, 3, 12, 12, o.corCabelo))
  p.push(...ret(3, 12, 12, 15, o.roupa), ...ret(6, 12, 9, 12, o.pele), ...ret(7, 11, 8, 11, o.pele))
  p.push(...ret(4, 3, 11, 10, o.pele), [3, 6, o.pele], [12, 6, o.pele], [3, 7, o.pele], [12, 7, o.pele])
  p.push([6, 7, escura], [9, 7, escura], [7, 9, '#a8281a'], [8, 9, '#a8281a'])
  if (o.cabelo === 'curto' || o.cabelo === 'coque' || o.cabelo === 'longo') {
    p.push(...ret(4, 2, 11, 3, o.corCabelo), ...ret(3, 3, 3, 5, o.corCabelo), ...ret(12, 3, 12, 5, o.corCabelo), [4, 4, o.corCabelo], [11, 4, o.corCabelo])
  }
  if (o.cabelo === 'coque') p.push(...ret(6, 0, 9, 1, o.corCabelo))
  if (o.cabelo === 'moicano') p.push(...ret(7, 0, 8, 3, o.corCabelo))
  if (o.acessorio === 'oculos') p.push(...ret(5, 6, 7, 6, escura), ...ret(8, 6, 10, 6, escura), [5, 7, escura], [7, 7, escura], [8, 7, escura], [10, 7, escura], [6, 7, '#8bd8e6'], [9, 7, '#8bd8e6'])
  if (o.acessorio === 'bone') p.push(...ret(4, 1, 11, 3, '#d8433a'), ...ret(10, 3, 14, 3, '#a8281a'), [7, 1, '#fbf5ef'])
  if (o.acessorio === 'chapeu') p.push([8, 0, '#272744'], ...ret(7, 1, 9, 1, '#272744'), ...ret(6, 2, 10, 2, '#272744'), ...ret(2, 3, 13, 3, '#272744'), ...ret(6, 2, 10, 2, '#272744'), ...ret(7, 2, 9, 2, '#f2d3ab'))
  return p
}

/* Pinta num canvas, cada pixel do desenho virando um quadrado de "escala" pixels */
export function pintarAvatar(ctx: CanvasRenderingContext2D, o: OpcoesAvatar, escala: number) {
  for (const [x, y, cor] of pixelsDoAvatar(o)) {
    ctx.fillStyle = cor
    ctx.fillRect(x * escala, y * escala, escala, escala)
  }
}

export function avatarComoPng(o: OpcoesAvatar, lado = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não deu para desenhar o avatar.')
  pintarAvatar(ctx, o, lado / 16)
  return canvas.toDataURL('image/png')
}
