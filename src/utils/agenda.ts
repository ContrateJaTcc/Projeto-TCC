/* Arquivo .ics: a reunião marcada no chat vai para o Google Agenda, Outlook ou o calendário do celular */

const DURACAO = 30 * 60_000

/* 2026-10-25T17:00:00.000Z -> 20261025T170000Z */
const dataIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/* Vírgula, ponto e vírgula e quebra de linha precisam de barra no formato do calendário */
const texto = (t: string) => t.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

export function baixarReuniao({ id, titulo, inicio, link, com }: { id: number; titulo: string; inicio: string; link?: string | null; com: string }) {
  const comeco = new Date(inicio)
  const fim = new Date(comeco.getTime() + DURACAO)
  const descricao = `Reunião marcada pelo chat do ContrateJá com ${com}.${link ? ` Link da chamada: ${link}` : ''}`
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ContrateJa//Reunioes//PT-BR',
    'BEGIN:VEVENT',
    `UID:reuniao-${id}@contrateja`,
    `DTSTAMP:${dataIcs(new Date())}`,
    `DTSTART:${dataIcs(comeco)}`,
    `DTEND:${dataIcs(fim)}`,
    `SUMMARY:${texto(`${titulo} (ContrateJá)`)}`,
    `DESCRIPTION:${texto(descricao)}`,
    ...(link ? [`URL:${link}`, `LOCATION:${texto(link)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reunião em 15 minutos',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const arquivo = new Blob([linhas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reuniao-contrateja.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface EventoAgenda {
  tipo: 'prazo' | 'pausa' | 'reuniao' | 'etapa' | 'inscricoes'
  data: string
  titulo: string
  serv_id: number
  link?: string | null
}

/* A agenda inteira num arquivo só (prazos e inscrições viram eventos de dia inteiro) */
export function baixarAgenda(eventos: EventoAgenda[]) {
  const diaIcs = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ContrateJa//Agenda//PT-BR']
  eventos.forEach((ev, i) => {
    const inicio = new Date(ev.data)
    const diaInteiro = ev.tipo !== 'reuniao'
    const amanha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1)
    linhas.push(
      'BEGIN:VEVENT',
      `UID:agenda-${ev.tipo}-${ev.serv_id}-${i}@contrateja`,
      `DTSTAMP:${dataIcs(new Date())}`,
      ...(diaInteiro
        ? [`DTSTART;VALUE=DATE:${diaIcs(inicio)}`, `DTEND;VALUE=DATE:${diaIcs(amanha)}`]
        : [`DTSTART:${dataIcs(inicio)}`, `DTEND:${dataIcs(new Date(inicio.getTime() + DURACAO))}`]),
      `SUMMARY:${texto(`${ev.titulo} (ContrateJá)`)}`,
      ...(ev.link ? [`URL:${ev.link}`] : []),
      'END:VEVENT'
    )
  })
  linhas.push('END:VCALENDAR')
  const arquivo = new Blob([linhas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agenda-contrateja.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
