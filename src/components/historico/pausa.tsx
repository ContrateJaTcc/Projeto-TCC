import { useState } from 'react'
import { Pause, Play, X, Check } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarData } from '../../utils/formatar'
import styles from './pausa.module.css'

export interface DadosPausa {
  serv_id: number
  serv_status: string
  serv_entregue_em: string | null
  outro_usu_id: number | null
  outro_nome: string | null
  serv_contratado_em?: string | null
  serv_qtd_dias?: number | null
  /* Servidor antigo não manda: aí o painel some */
  serv_pausa_pedida_por?: number | null
  serv_pausa_motivo?: string | null
  serv_pausado_em?: string | null
  serv_pausa_dias?: number | null
}

/* Dias parados até agora (conta o dia de hoje, como o servidor ao retomar) */
const diasDesde = (iso?: string | null) => (iso ? Math.max(1, Math.ceil((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0)

/*
 * Pausar o prazo: uma parte pede com o motivo, a outra aceita. Parado, o prazo não corre nem gera lembrete;
 * ao retomar, os dias parados entram no prazo.
 */
export default function PausaPrazo({ item, aoMudar }: { item: DadosPausa; aoMudar: () => void }) {
  const toast = useToast()
  const [pedindo, setPedindo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)

  if (item.serv_pausado_em === undefined || item.serv_status !== 'em_andamento' || item.serv_entregue_em || !item.outro_usu_id) return null

  const outro = item.outro_nome?.split(' ')[0] ?? 'a outra pessoa'
  const pedido = item.serv_pausa_pedida_por ?? null
  const eleQuePediu = pedido !== null && pedido === item.outro_usu_id
  const prazo = item.serv_contratado_em && item.serv_qtd_dias ? new Date(new Date(item.serv_contratado_em).getTime() + item.serv_qtd_dias * 86_400_000) : null
  const diasParado = diasDesde(item.serv_pausado_em)

  async function enviar(caminho: 'pedir' | 'aceitar' | 'recusar' | 'cancelar' | 'retomar') {
    setOcupado(true)
    try {
      const r = caminho === 'pedir'
        ? await api<{ mensagem: string }>(`/servicos/${item.serv_id}/pausa`, { metodo: 'POST', corpo: { motivo } })
        : await api<{ mensagem: string }>(`/servicos/${item.serv_id}/pausa`, { metodo: 'PUT', corpo: { acao: caminho } })
      toast.mostrar(r.mensagem, 'sucesso')
      setPedindo(false)
      setMotivo('')
      aoMudar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível mudar a pausa.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  if (item.serv_pausado_em) {
    return (
      <div className={`${styles.pausa} ${styles.parado}`} role="status">
        <Pause size={18} strokeWidth={2.4} aria-hidden="true" />
        <div>
          <strong>Prazo pausado desde {formatarData(item.serv_pausado_em)}</strong>
          <span>
            {item.serv_pausa_motivo ? `Motivo: ${item.serv_pausa_motivo}. ` : ''}
            Ao retomar hoje, {diasParado === 1 ? '1 dia entra' : `${diasParado} dias entram`} no prazo.
          </span>
        </div>
        <button type="button" onClick={() => enviar('retomar')} disabled={ocupado}>
          <Play size={15} strokeWidth={2.4} /> Retomar o prazo
        </button>
      </div>
    )
  }

  if (pedido !== null) {
    return (
      <div className={styles.pausa} role="status">
        <Pause size={18} strokeWidth={2.4} aria-hidden="true" />
        <div>
          <strong>{eleQuePediu ? `${outro} pediu para pausar o prazo` : `Você pediu para pausar o prazo; falta ${outro} aceitar`}</strong>
          {item.serv_pausa_motivo && <span>Motivo: {item.serv_pausa_motivo}</span>}
        </div>
        {eleQuePediu ? (
          <span className={styles.botoes}>
            <button type="button" onClick={() => enviar('aceitar')} disabled={ocupado}><Check size={15} strokeWidth={2.6} /> Aceitar</button>
            <button type="button" onClick={() => enviar('recusar')} disabled={ocupado}><X size={15} strokeWidth={2.6} /> Recusar</button>
          </span>
        ) : (
          <button type="button" onClick={() => enviar('cancelar')} disabled={ocupado}>Desistir do pedido</button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.pedir}>
      {!pedindo ? (
        <button type="button" className={styles.link} onClick={() => setPedindo(true)}>
          <Pause size={14} strokeWidth={2.4} aria-hidden="true" /> Pausar o prazo
          {prazo && <span> (entrega em {formatarData(prazo.toISOString())})</span>}
        </button>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            enviar('pedir')
          }}
        >
          <label>
            Por que pausar? {outro} precisa aceitar.
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ex.: esperando o material do cliente" autoFocus />
          </label>
          <span className={styles.botoes}>
            <button type="submit" disabled={ocupado || motivo.trim().length < 5}>Pedir a pausa</button>
            <button type="button" onClick={() => setPedindo(false)}>Cancelar</button>
          </span>
        </form>
      )}
    </div>
  )
}
