import { CalendarClock, Palmtree, CircleCheck } from 'lucide-react'
import { textoDisponibilidade, type Disponibilidade } from '../../utils/aparencia'
import styles from './aparencia.module.css'

/* Nome com a cor comprada na loja (sem cor, fica como o texto em volta) */
export function NomeColorido({ nome, cor, className = '', children }: { nome?: string; cor?: string | null; className?: string; children?: React.ReactNode }) {
  const classe = cor ? styles[cor] : ''
  return <span className={`${classe ?? ''} ${className}`.trim()}>{children ?? nome}</span>
}

/* Selo de disponibilidade do freelancer */
export function SeloDisponibilidade({ disponibilidade, className = '' }: { disponibilidade?: Disponibilidade | null; className?: string }) {
  const status = disponibilidade?.status ?? 'disponivel'
  const Icone = status === 'ferias' ? Palmtree : status === 'ocupado' ? CalendarClock : CircleCheck
  return (
    <span className={`${styles.disponibilidade} ${styles[status]} ${className}`.trim()}>
      <Icone size={13} strokeWidth={2.4} aria-hidden="true" />
      {textoDisponibilidade(disponibilidade)}
    </span>
  )
}
