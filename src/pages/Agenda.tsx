import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Flag, Pause, Video, CheckCircle2, Inbox } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { baixarAgenda, type EventoAgenda } from '../utils/agenda'
import comum from './comum.module.css'
import styles from './Agenda.module.css'

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/* Ícone e nome de cada tipo: a cor nunca é a única pista */
const TIPOS: Record<EventoAgenda['tipo'], { rotulo: string; icone: typeof Flag }> = {
  prazo: { rotulo: 'Entrega', icone: Flag },
  pausa: { rotulo: 'Prazo pausado', icone: Pause },
  reuniao: { rotulo: 'Reunião', icone: Video },
  etapa: { rotulo: 'Etapa entregue', icone: CheckCircle2 },
  inscricoes: { rotulo: 'Inscrições encerram', icone: Inbox },
}

/* Do dia de ontem em diante (o que ficou para trás não é "próximo") */
const aPartirDeOntem = (lista: EventoAgenda[]) => lista.filter((ev) => new Date(ev.data).getTime() >= Date.now() - 86_400_000)

const chaveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/* Agenda do mês: prazos dos projetos, reuniões marcadas no chat e etapas entregues */
export default function Agenda() {
  const { role } = useRole()
  const [eventos, setEventos] = useState<EventoAgenda[] | null>(null)
  const [erro, setErro] = useState('')
  const [mes, setMes] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })

  useEffect(() => {
    let vivo = true
    api<{ eventos: EventoAgenda[] }>('/usuarios/eu/agenda')
      .then((d) => vivo && setEventos(d.eventos))
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível abrir a agenda.'))
    return () => {
      vivo = false
    }
  }, [])

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoAgenda[]>()
    for (const ev of eventos ?? []) {
      const k = chaveDia(new Date(ev.data))
      mapa.set(k, [...(mapa.get(k) ?? []), ev])
    }
    return mapa
  }, [eventos])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!eventos) return <Carregando variante="lista" />

  /* Dias da grade: do domingo antes do dia 1 ao sábado depois do último dia */
  const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0)
  const dias: Date[] = []
  for (let d = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1 - primeiro.getDay()); d <= ultimo || d.getDay() !== 0; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    dias.push(d)
  }
  const hoje = chaveDia(new Date())
  const doMes = eventos.filter((ev) => {
    const d = new Date(ev.data)
    return d.getMonth() === mes.getMonth() && d.getFullYear() === mes.getFullYear()
  })
  const proximos = aPartirDeOntem(eventos).slice(0, 5)

  const destino = (ev: EventoAgenda) =>
    ev.tipo === 'reuniao' ? `/${role}/mensagens` : role === 'freelancer' ? (ev.tipo === 'etapa' ? '/freelancer/historico' : '/freelancer/entregues') : ev.tipo === 'inscricoes' ? '/contratante/candidatos' : '/contratante/historico'

  /* "outubro de 2026" -> "Outubro de 2026" */
  const nomeMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())
  const mudarMes = (n: number) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Agenda</h1>
      <p className={`${comum.subtitulo} placa`}>
        Prazos de entrega dos seus projetos, reuniões marcadas no chat e etapas entregues, tudo num calendário só.
      </p>

      <section className={comum.painel}>
        <div className={styles.topo}>
          <div className={styles.navMes}>
            <button type="button" className={comum.botao} onClick={() => mudarMes(-1)} aria-label="Mês anterior">
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
            <h2 aria-live="polite"><CalendarDays size={20} strokeWidth={2.2} /> {nomeMes}</h2>
            <button type="button" className={comum.botao} onClick={() => mudarMes(1)} aria-label="Próximo mês">
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>
          </div>
          <button type="button" className={comum.botao} onClick={() => baixarAgenda(eventos)} disabled={!eventos.length}>
            <Download size={16} strokeWidth={2.2} /> Levar para o meu calendário (.ics)
          </button>
        </div>

        <ul className={styles.legenda} aria-label="Legenda">
          {Object.entries(TIPOS).map(([tipo, { rotulo, icone: Icone }]) => (
            <li key={tipo} className={styles[tipo]}><Icone size={14} strokeWidth={2.4} aria-hidden="true" /> {rotulo}</li>
          ))}
        </ul>

        <div className={styles.semana} aria-hidden="true">
          {SEMANA.map((d) => <span key={d}>{d}</span>)}
        </div>
        <ol className={styles.grade} aria-label={`Dias de ${nomeMes}`}>
          {dias.map((d) => {
            const k = chaveDia(d)
            const doDia = porDia.get(k) ?? []
            const fora = d.getMonth() !== mes.getMonth()
            return (
              <li
                key={k}
                className={`${styles.dia} ${fora ? styles.fora : ''} ${doDia.length ? '' : styles.semEvento} ${k === hoje ? styles.hoje : ''}`}
                aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${doDia.length ? `, ${doDia.length} ${doDia.length === 1 ? 'evento' : 'eventos'}` : ''}`}
              >
                <span className={styles.numero}>
                  <span className={styles.diaSemana}>{SEMANA[d.getDay()]} </span>
                  {d.getDate()}
                  {k === hoje && <span className={styles.seloHoje}>hoje</span>}
                </span>
                {doDia.map((ev, i) => {
                  const { rotulo, icone: Icone } = TIPOS[ev.tipo]
                  return (
                    <Link key={i} to={destino(ev)} className={`${styles.evento} ${styles[ev.tipo]}`} viewTransition>
                      <Icone size={13} strokeWidth={2.4} aria-hidden="true" />
                      <span>
                        <span className="sr-only">{rotulo}: </span>
                        {ev.tipo === 'reuniao' && `${new Date(ev.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} `}
                        {ev.titulo}
                      </span>
                    </Link>
                  )
                })}
              </li>
            )
          })}
        </ol>
        {doMes.length === 0 && <p className={comum.nota}>Nada marcado neste mês.</p>}
      </section>

      <section className={`${comum.painel} ${styles.proximos}`}>
        <h2>Próximos</h2>
        {proximos.length === 0 ? (
          <p className={comum.nota}>Sem prazos nem reuniões pela frente. Que tal procurar um projeto novo?</p>
        ) : (
          <ul>
            {proximos.map((ev, i) => {
              const { rotulo, icone: Icone } = TIPOS[ev.tipo]
              return (
                <li key={i} className={styles[ev.tipo]}>
                  <Icone size={16} strokeWidth={2.4} aria-hidden="true" />
                  <div>
                    <strong>{ev.titulo}</strong>
                    <span className={comum.nota}>
                      {rotulo} · {new Date(ev.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {ev.tipo === 'reuniao' && ` às ${new Date(ev.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </div>
                  {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" className={comum.botao}>Entrar na chamada</a>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
