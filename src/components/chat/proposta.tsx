import { useState } from 'react'
import { HandCoins, Check, X, Send } from 'lucide-react'
import { formatarMoeda } from '../../utils/formatar'
import styles from './chat.module.css'

export interface DadosProposta {
  msg_id: number
  msg_texto: string
  msg_proposta_valor?: number | string | null
  msg_proposta_prazo?: number | null
  msg_proposta_status?: 'pendente' | 'aceita' | 'recusada' | null
}

const ROTULO = { pendente: 'Esperando resposta', aceita: 'Aceita', recusada: 'Recusada' }

/* Cartão da proposta de valor/prazo dentro da bolha; quem recebeu aceita ou recusa ali mesmo */
export function CartaoProposta({ m, minha, aoResponder, respondendo }: { m: DadosProposta; minha: boolean; aoResponder: (acao: 'aceitar' | 'recusar') => void; respondendo: boolean }) {
  const status = m.msg_proposta_status ?? 'pendente'
  const valor = m.msg_proposta_valor === null || m.msg_proposta_valor === undefined ? null : Number(m.msg_proposta_valor)
  const recado = m.msg_texto && !m.msg_texto.startsWith('Proposta:') ? m.msg_texto : null

  return (
    <div className={`${styles.proposta} ${styles[status]}`}>
      <span className={styles.propostaTitulo}>
        <HandCoins size={15} strokeWidth={2.4} /> {minha ? 'Sua proposta' : 'Proposta'}
      </span>
      <dl className={styles.propostaValores}>
        {valor !== null && (
          <div>
            <dt>Valor</dt>
            <dd>{formatarMoeda(valor)}</dd>
          </div>
        )}
        {m.msg_proposta_prazo != null && (
          <div>
            <dt>Prazo</dt>
            <dd>{m.msg_proposta_prazo} {m.msg_proposta_prazo === 1 ? 'dia' : 'dias'}</dd>
          </div>
        )}
      </dl>
      {recado && <p className={styles.propostaRecado}>{recado}</p>}
      {status === 'pendente' && !minha ? (
        <div className={styles.propostaAcoes}>
          <button type="button" className={styles.aceitar} onClick={() => aoResponder('aceitar')} disabled={respondendo}>
            <Check size={14} strokeWidth={2.8} /> Aceitar
          </button>
          <button type="button" className={styles.recusar} onClick={() => aoResponder('recusar')} disabled={respondendo}>
            <X size={14} strokeWidth={2.8} /> Recusar
          </button>
        </div>
      ) : (
        <span className={styles.propostaStatus}>{ROTULO[status]}</span>
      )}
    </div>
  )
}

/* Formulário que abre em cima do campo de mensagem */
export function FormProposta({ aoEnviar, aoFechar }: { aoEnviar: (p: { valor: string; prazo: string; texto: string }) => Promise<boolean>; aoFechar: () => void }) {
  const [valor, setValor] = useState('')
  const [prazo, setPrazo] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const ok = await aoEnviar({ valor, prazo, texto })
    setEnviando(false)
    if (ok) aoFechar()
  }

  return (
    <form className={styles.formProposta} onSubmit={enviar} aria-label="Propor valor e prazo">
      <div className={styles.formPropostaTopo}>
        <strong><HandCoins size={15} strokeWidth={2.4} /> Propor valor e prazo</strong>
        <button type="button" onClick={aoFechar} aria-label="Fechar proposta"><X size={16} strokeWidth={2.4} /></button>
      </div>
      <div className={styles.formPropostaCampos}>
        <label>
          Valor (R$)
          <input type="number" min={1} step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 1200" />
        </label>
        <label>
          Prazo (dias)
          <input type="number" min={1} max={365} inputMode="numeric" value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="Ex.: 10" />
        </label>
      </div>
      <label>
        Recado (opcional)
        <input value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="Por que esse valor ou prazo?" />
      </label>
      <button type="submit" className={styles.enviarProposta} disabled={enviando || (!valor && !prazo)}>
        {enviando ? <span className="spinner" /> : <Send size={14} strokeWidth={2.4} />} Enviar proposta
      </button>
    </form>
  )
}
