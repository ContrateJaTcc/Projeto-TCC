import { Check, X } from 'lucide-react'
import { formatarData } from '../../utils/formatar'
import styles from './historico.module.css'

interface LinhaDoTempoProps {
  status: string
  criadoEm: string
  contratadoEm?: string | null
  entregueEm?: string | null
  finalizadoEm?: string | null
}

interface Passo {
  rotulo: string
  data: string | null | undefined
  feito: boolean
  cancelado?: boolean
}

/* Publicado → Contratado → Entregue → Concluído (ou Cancelado), com a data de cada etapa */
export default function LinhaDoTempo({ status, criadoEm, contratadoEm, entregueEm, finalizadoEm }: LinhaDoTempoProps) {
  const concluido = status === 'finalizado'
  const cancelado = status === 'cancelado'

  const passos: Passo[] = [
    { rotulo: 'Publicado', data: criadoEm, feito: true },
    /* No histórico o projeto sempre já teve alguém contratado (ou foi cancelado antes) */
    { rotulo: 'Contratado', data: contratadoEm, feito: !cancelado || Boolean(contratadoEm) },
    { rotulo: 'Entregue', data: entregueEm, feito: Boolean(entregueEm) || concluido },
    cancelado
      ? { rotulo: 'Cancelado', data: null, feito: true, cancelado: true }
      : { rotulo: 'Concluído', data: finalizadoEm, feito: concluido },
  ]

  /* A etapa "da vez" é a primeira que ainda não aconteceu */
  const atual = passos.findIndex((p) => !p.feito)

  return (
    <ol className={styles.linha} aria-label="Andamento do projeto">
      {passos.map((p, i) => (
        <li
          key={p.rotulo}
          className={[
            styles.passo,
            p.feito ? styles.passoFeito : '',
            i === atual ? styles.passoAtual : '',
            p.cancelado ? styles.passoCancelado : '',
          ].join(' ')}
          aria-current={i === atual ? 'step' : undefined}
        >
          <span className={styles.marca} aria-hidden="true">
            {p.cancelado ? <X size={12} strokeWidth={3} /> : p.feito ? <Check size={12} strokeWidth={3} /> : null}
          </span>
          <span className={styles.rotuloPasso}>{p.rotulo}</span>
          <span className={styles.dataPasso}>
            {p.data ? formatarData(p.data) : i === atual ? 'agora' : p.feito ? '' : '—'}
          </span>
        </li>
      ))}
    </ol>
  )
}
