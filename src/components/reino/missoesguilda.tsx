import { useEffect, useState } from 'react'
import { Target, Flag, Crown, Sprout, Sparkles } from 'lucide-react'
import { api } from '../../services/api'
import styles from './missoesguilda.module.css'

interface Missao {
  codigo: string
  titulo: string
  progresso: number
  meta: number
  feita: boolean
  enfeite: 'estandarte' | 'coroa' | 'louros' | 'estrelas'
}

const ENFEITES = { estandarte: Flag, coroa: Crown, louros: Sprout, estrelas: Sparkles }
const NOME_ENFEITE = { estandarte: 'estandarte', coroa: 'coroa', louros: 'louros', estrelas: 'estrelas' }

/* Metas do mês para o time inteiro; cada uma cumprida enfeita o brasão */
export default function MissoesGuilda({ guiId }: { guiId: number }) {
  const [missoes, setMissoes] = useState<Missao[] | null>(null)

  useEffect(() => {
    let vivo = true
    api<{ missoes: Missao[] }>(`/comunidade/guildas/${guiId}/missoes`, { silencioso: true })
      .then((d) => vivo && setMissoes(d.missoes))
      .catch(() => vivo && setMissoes([]))
    return () => {
      vivo = false
    }
  }, [guiId])

  if (!missoes?.length) return null
  const feitas = missoes.filter((m) => m.feita)

  return (
    <section className={styles.caixa} aria-labelledby={`missoes-guilda-${guiId}`}>
      <h3 id={`missoes-guilda-${guiId}`}><Target size={16} strokeWidth={2.4} aria-hidden="true" /> Missões da guilda neste mês</h3>
      <p className={styles.enfeites}>
        {feitas.length
          ? <>Enfeites do brasão: {feitas.map((m) => { const Icone = ENFEITES[m.enfeite]; return <span key={m.codigo} className={styles.enfeite}><Icone size={14} strokeWidth={2.4} aria-hidden="true" /> {NOME_ENFEITE[m.enfeite]}</span> })}</>
          : 'Cumpram as missões juntos para enfeitar o brasão.'}
      </p>
      <ul className={styles.lista}>
        {missoes.map((m) => (
          <li key={m.codigo} className={m.feita ? styles.feita : ''}>
            <span className={styles.titulo}>{m.titulo}</span>
            <span className={styles.barra} role="progressbar" aria-valuemin={0} aria-valuemax={m.meta} aria-valuenow={m.progresso} aria-label={m.titulo}>
              <span style={{ width: `${(m.progresso / m.meta) * 100}%` }} />
            </span>
            <span className={styles.numero}>{m.progresso}/{m.meta}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
