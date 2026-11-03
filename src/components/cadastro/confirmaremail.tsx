import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import type { Papel } from '../../services/api'
import styles from './confirmaremail.module.css'

export interface PedidoConfirmacao {
  confirmarEmail: true
  email: string
  desafio: string
}

interface Props {
  pedido: PedidoConfirmacao
  /* Código certo: o servidor já devolve a sessão */
  aoConfirmar: (sessao: { token: string; tipo?: Papel; mensagem?: string }) => void
  aoVoltar?: () => void
}

/* "Confirme seu e-mail": o código de 6 números que chegou na caixa de entrada */
export default function ConfirmarEmail({ pedido, aoConfirmar, aoVoltar }: Props) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      aoConfirmar(await api<{ token: string; tipo?: Papel; mensagem?: string }>('/auth/confirmar-email', { metodo: 'POST', publico: true, corpo: { desafio: pedido.desafio, codigo } }))
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível conferir o código.')
    } finally {
      setEnviando(false)
    }
  }

  async function reenviar() {
    setErro('')
    try {
      const r = await api<{ mensagem: string }>('/auth/confirmar-email/reenviar', { metodo: 'POST', publico: true, corpo: { desafio: pedido.desafio } })
      setAviso(r.mensagem)
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível mandar outro código.')
    }
  }

  return (
    <form className={styles.caixa} onSubmit={confirmar}>
      <MailCheck size={36} strokeWidth={2} className={styles.icone} aria-hidden="true" />
      <h2>Confirme seu e-mail</h2>
      <p>
        Mandamos um código de 6 números para <strong>{pedido.email}</strong>. Ele vale por 10 minutos. Olhe também a pasta de spam.
      </p>
      <label htmlFor="codigo-email">Código</label>
      <input
        id="codigo-email"
        required
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="000000"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
        className={styles.codigo}
      />
      {aviso && !erro && <p className="msg-ok">{aviso}</p>}
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
      <button type="submit" className={styles.confirmar} disabled={enviando || codigo.length !== 6}>
        {enviando ? 'Conferindo...' : 'Confirmar e entrar'}
      </button>
      <div className={styles.links}>
        <button type="button" onClick={reenviar}>Mandar outro código</button>
        {aoVoltar && <button type="button" onClick={aoVoltar}>Voltar</button>}
      </div>
    </form>
  )
}
