import { useState } from 'react'
import { CalendarClock, CalendarPlus, Check, X, Send, Video, Ban } from 'lucide-react'
import { baixarReuniao } from '../../utils/agenda'
import styles from './chat.module.css'

export interface DadosReuniao {
  msg_id: number
  msg_texto: string
  msg_reuniao_em?: string | null
  msg_reuniao_link?: string | null
  msg_reuniao_status?: 'pendente' | 'aceita' | 'recusada' | 'cancelada' | null
}

type Acao = 'aceitar' | 'recusar' | 'cancelar'

const ROTULO = { pendente: 'Esperando resposta', aceita: 'Confirmada', recusada: 'Recusada', cancelada: 'Cancelada' }

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/* "daqui a 25 min", "amanhã", "já passou" */
function falta(iso: string) {
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  if (min < -30) return 'já aconteceu'
  if (min <= 0) return 'agora'
  if (min < 60) return `daqui a ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `daqui a ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? 'amanhã' : `daqui a ${dias} dias`
}

/* Passou de meia hora do horário: o convite não vale mais */
const jaPassou = (iso: string) => !iso || new Date(iso).getTime() < Date.now() - 30 * 60_000

/* Cartão da reunião dentro da bolha: quem recebeu aceita ou recusa, quem marcou pode cancelar */
export function CartaoReuniao({ m, minha, com, titulo, aoResponder, respondendo }: { m: DadosReuniao; minha: boolean; com: string; titulo: string; aoResponder: (acao: Acao) => void; respondendo: boolean }) {
  const status = m.msg_reuniao_status ?? 'pendente'
  const inicio = m.msg_reuniao_em ?? ''
  const passou = jaPassou(inicio)
  const recado = m.msg_texto && !m.msg_texto.startsWith('Reunião proposta') ? m.msg_texto : null
  const ativa = status === 'pendente' || status === 'aceita'

  return (
    <div className={`${styles.proposta} ${styles.reuniao} ${styles[status]}`}>
      <span className={styles.propostaTitulo}>
        <CalendarClock size={15} strokeWidth={2.4} /> {minha ? 'Você chamou para uma reunião' : 'Convite para reunião'}
      </span>
      <strong className={styles.reuniaoQuando}>{inicio ? quando(inicio) : 'Sem data'}</strong>
      {ativa && !passou && <span className={styles.reuniaoFalta}>{falta(inicio)}</span>}
      {recado && <p className={styles.propostaRecado}>{recado}</p>}
      {m.msg_reuniao_link && ativa && (
        <a className={styles.reuniaoLink} href={m.msg_reuniao_link} target="_blank" rel="noreferrer noopener">
          <Video size={14} strokeWidth={2.4} /> Entrar na chamada
        </a>
      )}

      {status === 'pendente' && !minha && !passou ? (
        <div className={styles.propostaAcoes}>
          <button type="button" className={styles.aceitar} onClick={() => aoResponder('aceitar')} disabled={respondendo}>
            <Check size={14} strokeWidth={2.8} /> Aceitar
          </button>
          <button type="button" className={styles.recusar} onClick={() => aoResponder('recusar')} disabled={respondendo}>
            <X size={14} strokeWidth={2.8} /> Recusar
          </button>
        </div>
      ) : (
        <span className={styles.propostaStatus}>{passou && status === 'pendente' ? 'Ninguém respondeu a tempo' : ROTULO[status]}</span>
      )}

      {ativa && !passou && (
        <div className={styles.propostaAcoes}>
          {status === 'aceita' && (
            <button type="button" className={styles.recusar} onClick={() => baixarReuniao({ id: m.msg_id, titulo, inicio, link: m.msg_reuniao_link, com })}>
              <CalendarPlus size={14} strokeWidth={2.4} /> Pôr na agenda
            </button>
          )}
          {minha && (
            <button type="button" className={styles.recusar} onClick={() => aoResponder('cancelar')} disabled={respondendo}>
              <Ban size={14} strokeWidth={2.4} /> Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* Data e hora local no formato do campo datetime-local, arredondada para a próxima meia hora (+1 h) */
function sugestao() {
  const d = new Date(Date.now() + 60 * 60_000)
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0)
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}

/* Formulário que abre em cima do campo de mensagem */
export function FormReuniao({ aoEnviar, aoFechar }: { aoEnviar: (r: { quando: string; link: string; texto: string }) => Promise<boolean>; aoFechar: () => void }) {
  const [dataHora, setDataHora] = useState(sugestao)
  const [link, setLink] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    /* O campo vem na hora do aparelho: vira data completa (com fuso) antes de ir ao servidor */
    const ok = await aoEnviar({ quando: new Date(dataHora).toISOString(), link: link.trim(), texto })
    setEnviando(false)
    if (ok) aoFechar()
  }

  return (
    <form className={styles.formProposta} onSubmit={enviar} aria-label="Marcar reunião">
      <div className={styles.formPropostaTopo}>
        <strong><CalendarClock size={15} strokeWidth={2.4} /> Marcar uma reunião</strong>
        <button type="button" onClick={aoFechar} aria-label="Fechar reunião"><X size={16} strokeWidth={2.4} /></button>
      </div>
      <div className={styles.formPropostaCampos}>
        <label>
          Dia e hora
          <input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} required />
        </label>
        <label>
          Link da chamada (opcional)
          <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..." pattern="https://.*" />
        </label>
      </div>
      <label>
        Assunto (opcional)
        <input value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Alinhar as cores do site" />
      </label>
      <button type="submit" className={styles.enviarProposta} disabled={enviando || !dataHora}>
        {enviando ? <span className="spinner" /> : <Send size={14} strokeWidth={2.4} />} Enviar convite
      </button>
    </form>
  )
}
