/*
 * Calendário de eventos do castelo (o servidor tem o mesmo em services/eventos.js).
 * Durante cada evento o cenário ganha enfeites e aparecem itens escondidos pelas páginas;
 * quem achar todos ganha a insígnia do evento daquele ano.
 */

export type CodigoEvento = 'halloween' | 'natal' | 'ano_novo' | 'carnaval' | 'festa_junina'

export interface InfoEvento {
  nome: string
  item: string
  itens: string
  insignia: string
  meta: number
  xp: number
  /* "a" abóbora, "o" presente */
  artigo: 'a' | 'o'
}

export const EVENTOS: Record<CodigoEvento, InfoEvento> = {
  halloween: { nome: 'Halloween', item: 'abóbora', itens: 'abóboras', insignia: 'Caçador de abóboras', meta: 5, xp: 40, artigo: 'a' },
  natal: { nome: 'Natal', item: 'presente', itens: 'presentes', insignia: 'Ajudante do Noel', meta: 5, xp: 40, artigo: 'o' },
  ano_novo: { nome: 'Ano Novo', item: 'estrela', itens: 'estrelas', insignia: 'Brilho de Ano Novo', meta: 5, xp: 40, artigo: 'a' },
  carnaval: { nome: 'Carnaval', item: 'confete', itens: 'confetes', insignia: 'Folião do castelo', meta: 5, xp: 40, artigo: 'o' },
  festa_junina: { nome: 'Festa Junina', item: 'balão', itens: 'balões', insignia: 'Arraiá do castelo', meta: 5, xp: 40, artigo: 'o' },
}

export interface EventoAtual extends InfoEvento {
  codigo: CodigoEvento
  /* Ano em que o evento começou (o Ano Novo atravessa a virada) */
  ano: number
  de: string
  ate: string
}

const DIA = 86_400_000
const FUSO_BRASIL = -3 * 60 * 60_000

/* Domingo de Páscoa (algoritmo de Meeus), em UTC */
function pascoa(ano: number) {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return Date.UTC(ano, mes - 1, dia)
}

const texto = (ms: number) => new Date(ms).toISOString().slice(0, 10)

function janelas(ano: number): { codigo: CodigoEvento; ano: number; de: string; ate: string }[] {
  const p = pascoa(ano)
  return [
    { codigo: 'ano_novo', ano: ano - 1, de: `${ano}-01-01`, ate: `${ano}-01-06` },
    { codigo: 'carnaval', ano, de: texto(p - 51 * DIA), ate: texto(p - 46 * DIA) },
    { codigo: 'festa_junina', ano, de: `${ano}-06-01`, ate: `${ano}-06-30` },
    { codigo: 'halloween', ano, de: `${ano}-10-20`, ate: `${ano}-10-31` },
    { codigo: 'natal', ano, de: `${ano}-12-01`, ate: `${ano}-12-25` },
    { codigo: 'ano_novo', ano, de: `${ano}-12-26`, ate: `${ano}-12-31` },
  ]
}

/* Evento de agora (horário de Brasília) ou null */
export function eventoAtual(agora = new Date()): EventoAtual | null {
  const hoje = new Date(agora.getTime() + FUSO_BRASIL).toISOString().slice(0, 10)
  const j = janelas(Number(hoje.slice(0, 4))).find((x) => hoje >= x.de && hoje <= x.ate)
  return j ? { ...j, ...EVENTOS[j.codigo] } : null
}

/* "até 31/10" */
export const fimDoEvento = (ev: EventoAtual) => ev.ate.split('-').reverse().slice(0, 2).join('/')
