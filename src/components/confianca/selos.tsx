import { BadgeCheck, Check, Circle, Timer } from 'lucide-react'
import { textoTempoResposta } from '../../utils/formatar'
import styles from './selos.module.css'

export interface Verificacao {
  verificado: boolean
  criterios: { codigo: string; rotulo: string; ok: boolean }[]
}

/* Selo "Verificado": conta confirmada, perfil completo e pelo menos um projeto entregue */
export function SeloVerificado({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={`${styles.selo} ${grande ? styles.grande : ''}`}
      title="Verificado: conta confirmada, perfil completo e pelo menos um projeto concluído"
    >
      <BadgeCheck size={grande ? 15 : 13} strokeWidth={2.4} />
      Verificado
    </span>
  )
}

/* "Responde em ~2 h" (some sem dados suficientes) */
export function TempoResposta({ minutos, className = '' }: { minutos: number | null | undefined; className?: string }) {
  if (minutos == null) return null
  return (
    <span className={`${styles.tempo} ${className}`} title="Mediana do tempo até responder mensagens nos últimos 60 dias">
      <Timer size={14} strokeWidth={2.2} />
      Responde em {textoTempoResposta(minutos)}
    </span>
  )
}

/* Meu perfil: o que falta para ganhar o selo */
export function ChecklistVerificado({ verificacao }: { verificacao: Verificacao }) {
  const feitos = verificacao.criterios.filter((c) => c.ok).length
  return (
    <section className={styles.checklist} aria-labelledby="titulo-verificado">
      <div className={styles.checklistTopo}>
        <span className={styles.checklistIcone}><BadgeCheck size={20} strokeWidth={2.2} /></span>
        <div>
          <h2 id="titulo-verificado">{verificacao.verificado ? 'Você é verificado!' : 'Selo de verificado'}</h2>
          <p>
            {verificacao.verificado
              ? 'O selo aparece no seu perfil, no perfil público e na busca dos contratantes.'
              : `Complete ${verificacao.criterios.length - feitos} ${verificacao.criterios.length - feitos === 1 ? 'item' : 'itens'} para ganhar o selo que passa confiança aos contratantes.`}
          </p>
        </div>
      </div>
      <ul>
        {verificacao.criterios.map((c) => (
          <li key={c.codigo} className={c.ok ? styles.ok : ''}>
            {c.ok ? <Check size={15} strokeWidth={3} /> : <Circle size={15} strokeWidth={2.2} />}
            {c.rotulo}
          </li>
        ))}
      </ul>
    </section>
  )
}
