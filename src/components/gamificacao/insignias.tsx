import { Rocket, TrendingUp, Trophy, Star, Heart, Images, UserCheck, Zap, Award, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Insignia } from './tipos'
import styles from './gamificacao.module.css'

/* O ícone fica no frontend; o backend só conhece o código da insígnia. */
const ICONES: Record<string, LucideIcon> = {
  primeiro_projeto: Rocket,
  em_ascensao: TrendingUp,
  veterano: Trophy,
  nota_maxima: Star,
  favorito: Heart,
  vitrine: Images,
  perfil_completo: UserCheck,
  nivel_5: Zap,
}

interface QuadroInsigniasProps {
  insignias: Insignia[]
  /* Na visão do contratante, só as conquistadas interessam. */
  somenteConquistadas?: boolean
}

export default function QuadroInsignias({ insignias, somenteConquistadas = false }: QuadroInsigniasProps) {
  const visiveis = somenteConquistadas ? insignias.filter((i) => i.conquistada) : insignias
  const total = insignias.filter((i) => i.conquistada).length

  if (visiveis.length === 0) {
    return <p className={styles.vazioTexto}>Nenhuma insígnia conquistada ainda.</p>
  }

  return (
    <>
      {!somenteConquistadas && (
        <p className={styles.contador}>
          {total} de {insignias.length} conquistadas
        </p>
      )}

      <div className={styles.gradeInsignias}>
        {visiveis.map((ins) => {
          const Icone = ICONES[ins.codigo] ?? Award

          return (
            <article
              key={ins.codigo}
              className={`${styles.insignia} ${ins.conquistada ? styles.conquistada : styles.bloqueada}`}
              title={ins.descricao}
            >
              <span className={styles.insigniaIcone}>
                {ins.conquistada ? <Icone size={22} strokeWidth={2.2} /> : <Lock size={18} strokeWidth={2.2} />}
              </span>
              <strong>{ins.nome}</strong>
              <span className={styles.insigniaDesc}>{ins.descricao}</span>

              {ins.conquistada ? (
                ins.data && (
                  <span className={styles.insigniaData}>
                    {new Date(ins.data).toLocaleDateString('pt-BR')}
                  </span>
                )
              ) : (
                <span className={styles.insigniaProgresso}>
                  <span
                    className={styles.miniBarra}
                    style={{ ['--p' as string]: `${(ins.progresso / ins.meta) * 100}%` }}
                  />
                  {ins.progresso}/{ins.meta}
                </span>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
