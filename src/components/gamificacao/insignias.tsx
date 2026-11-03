import { Rocket, TrendingUp, Trophy, Star, Heart, Images, UserCheck, Zap, Award, Lock, PackageCheck, Mail, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Insignia } from './tipos'
import styles from './gamificacao.module.css'

/* Ícones */
const ICONES: Record<string, LucideIcon> = {
  primeiro_projeto: Rocket,
  em_ascensao: TrendingUp,
  veterano: Trophy,
  nota_maxima: Star,
  favorito: Heart,
  vitrine: Images,
  perfil_completo: UserCheck,
  nivel_5: Zap,
  primeira_entrega: PackageCheck,
  requisitado: Mail,
  pontual: Clock,
}

/* Raridade */
type Raridade = 'bronze' | 'prata' | 'ouro'

const RARIDADE: Record<string, Raridade> = {
  primeiro_projeto: 'bronze',
  perfil_completo: 'bronze',
  primeira_entrega: 'bronze',
  vitrine: 'bronze',
  em_ascensao: 'prata',
  nota_maxima: 'prata',
  requisitado: 'prata',
  pontual: 'prata',
  veterano: 'ouro',
  favorito: 'ouro',
  nivel_5: 'ouro',
}

const ROTULO_RARIDADE: Record<Raridade, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
}

const NOMES: Record<string, string> = {
  primeiro_projeto: 'Primeiro Projeto',
  em_ascensao: 'Em Ascensão',
  veterano: 'Veterano',
  nota_maxima: 'Nota Máxima',
  favorito: 'Favorito dos Clientes',
  vitrine: 'Vitrine Completa',
  perfil_completo: 'Perfil Completo',
  nivel_5: 'Nível 5',
  primeira_entrega: 'Mão na Massa',
  requisitado: 'Requisitado',
  pontual: 'Pontual',
}

const ORDEM: Record<Raridade, number> = { ouro: 0, prata: 1, bronze: 2 }

const raridadeDe = (codigo: string): Raridade => RARIDADE[codigo] ?? 'bronze'

interface QuadroInsigniasProps {
  insignias: Insignia[]
  /* Só conquistadas */
  somenteConquistadas?: boolean
  /* Álbum: quantos por cento dos freelancers já têm cada uma */
  porcentagens?: Record<string, number>
}

export default function QuadroInsignias({ insignias, somenteConquistadas = false, porcentagens }: QuadroInsigniasProps) {
  const visiveis = somenteConquistadas ? insignias.filter((i) => i.conquistada) : insignias
  const total = insignias.filter((i) => i.conquistada).length

  if (visiveis.length === 0) {
    return <p className={styles.vazioTexto}>Nenhuma insígnia conquistada ainda.</p>
  }

  return (
    <>
      {!somenteConquistadas && (
        <div className={styles.contadorInsignias}>
          <span>{total} de {insignias.length} conquistadas</span>
          <span
            className={styles.miniBarra}
            style={{ ['--p' as string]: `${(total / insignias.length) * 100}%` }}
          />
        </div>
      )}

      <div className={`${styles.gradeInsignias} cascata`}>
        {visiveis.map((ins) => {
          const Icone = ICONES[ins.codigo] ?? Award
          const raridade = raridadeDe(ins.codigo)

          return (
            <article
              key={ins.codigo}
              className={`${styles.insignia} ${ins.conquistada ? styles.conquistada : styles.bloqueada} ${styles[raridade]}`}
              title={ins.descricao}
            >
              <span className={styles.insigniaRaridade}>{ROTULO_RARIDADE[raridade]}</span>
              <span className={styles.insigniaIcone}>
                {ins.conquistada ? <Icone size={22} strokeWidth={2.2} /> : <Lock size={18} strokeWidth={2.2} />}
              </span>
              <strong>{ins.nome}</strong>
              <span className={styles.insigniaDesc}>{ins.descricao}</span>
              {porcentagens && porcentagens[ins.codigo] !== undefined && (
                <span className={styles.insigniaRara}>
                  {porcentagens[ins.codigo] === 0 ? 'Ninguém tem ainda' : `${porcentagens[ins.codigo].toLocaleString('pt-BR')}% dos freelancers têm`}
                </span>
              )}

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

/* Selos compactos */
export function MiniInsignias({ codigos, maximo = 5 }: { codigos: string[]; maximo?: number }) {
  if (codigos.length === 0) return null

  const ordenados = [...codigos].sort((a, b) => ORDEM[raridadeDe(a)] - ORDEM[raridadeDe(b)])
  const visiveis = ordenados.slice(0, maximo)
  const resto = ordenados.length - visiveis.length

  return (
    <div className={styles.miniInsignias} aria-label={`${codigos.length} insígnias conquistadas`}>
      {visiveis.map((codigo) => {
        const Icone = ICONES[codigo] ?? Award

        return (
          <span key={codigo} className={`${styles.mini} ${styles[raridadeDe(codigo)]}`} title={NOMES[codigo] ?? codigo}>
            <Icone size={13} strokeWidth={2.4} />
          </span>
        )
      })}
      {resto > 0 && <span className={styles.miniResto}>+{resto}</span>}
    </div>
  )
}
