import { GraduationCap } from 'lucide-react'
import Brasao from './brasao'
import type { GuildaResumo } from '../../utils/aparencia'
import styles from './reino.module.css'

/* Selo da guilda nos cartões e perfis */
export function SeloGuilda({ guilda, className = '' }: { guilda?: GuildaResumo | null; className?: string }) {
  if (!guilda) return null
  return (
    <span className={`${styles.seloGuilda} ${className}`.trim()} title={`Membro da guilda ${guilda.nome}`}>
      <Brasao brasao={guilda.brasao} cor={guilda.cor} tamanho={16} />
      <span>{guilda.nome}</span>
    </span>
  )
}

/* "Testado em Design": quem passou no teste de habilidade da área */
export function SelosTeste({ testes, className = '' }: { testes?: string[] | null; className?: string }) {
  if (!testes?.length) return null
  return (
    <span className={`${styles.testes} ${className}`.trim()}>
      {testes.map((area) => (
        <span key={area} className={styles.seloTeste} title={`Passou no teste de habilidade de ${area}`}>
          <GraduationCap size={13} strokeWidth={2.4} aria-hidden="true" />
          Testado em {area}
        </span>
      ))}
    </span>
  )
}
