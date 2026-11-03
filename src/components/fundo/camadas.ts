/* Tamanho do desenho em pixels (gerado por scripts/gerar-fundo.cjs) */
export const LARGURA = 480
export const ALTURA = 300

export type Tema = 'escuro' | 'claro'

/*
 * k: quanto a camada sobe ao rolar (céu, lua e castelo quase juntos, para o castelo não escorregar na lua)
 * ponteiro: quantos pixels do desenho a camada anda com o mouse
 * detalhe: animação que some no celular; deriva: camada que anda sozinha bem devagar; plana: sobe e desce como quem plana
 * substitui: com animação, o SVG traz o desenho inteiro (ex.: o dragão batendo as asas) e a imagem parada sai
 */
export const CAMADAS = [
  { nome: 'ceu', k: 0.04, ponteiro: 0, anim: true, detalhe: true, deriva: false, plana: false, substitui: false },
  { nome: 'nuvens', k: 0.04, ponteiro: 1, anim: false, detalhe: true, deriva: true, plana: false, substitui: false },
  { nome: 'montanhas', k: 0.07, ponteiro: 1, anim: true, detalhe: true, deriva: false, plana: false, substitui: false },
  { nome: 'dragao', k: 0.07, ponteiro: 1, anim: true, detalhe: false, deriva: false, plana: true, substitui: true },
  { nome: 'castelo', k: 0.08, ponteiro: 0, anim: true, detalhe: false, deriva: false, plana: false, substitui: false },
  { nome: 'floresta', k: 0.5, ponteiro: 2, anim: true, detalhe: false, deriva: false, plana: false, substitui: false },
  { nome: 'frente', k: 1, ponteiro: 3, anim: true, detalhe: false, deriva: false, plana: false, substitui: false },
]
