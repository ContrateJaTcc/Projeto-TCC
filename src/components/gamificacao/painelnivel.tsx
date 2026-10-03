import { Zap, Star, BriefcaseBusiness } from 'lucide-react'
import type { ResumoFreelancer } from './tipos'
import styles from './gamificacao.module.css'

/* Nível, barra de XP até o próximo nível, nota média e projetos concluídos. */
export default function PainelNivel({ resumo }: { resumo: ResumoFreelancer }) {
  const faixa = resumo.xpProximoNivel - resumo.xpNivelAtual
  const avancado = resumo.xp - resumo.xpNivelAtual
  const percentual = faixa > 0 ? Math.min(100, (avancado / faixa) * 100) : 100

  return (
    <section className={styles.painelNivel}>
      <div className={styles.selo}>
        <span className={styles.seloRotulo}>Nível</span>
        <strong className={styles.seloNumero}>{resumo.nivel}</strong>
      </div>

      <div className={styles.progressoNivel}>
        <div className={styles.progressoTopo}>
          <span><Zap size={14} strokeWidth={2.4} /> {resumo.xp} XP</span>
          <span className={styles.suave}>
            faltam {resumo.xpProximoNivel - resumo.xp} XP para o nível {resumo.nivel + 1}
          </span>
        </div>
        <div
          className={styles.barra}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentual)}
        >
          <div className={styles.barraPreenchida} style={{ width: `${percentual}%` }} />
        </div>
        <p className={styles.dica}>
          Conclua projetos (+100 XP) e receba boas avaliações (+20 XP por estrela) para subir de nível.
        </p>
      </div>

      <div className={styles.numeros}>
        <div>
          <Star size={16} strokeWidth={2.2} />
          <strong>{resumo.totalAvaliacoes > 0 ? resumo.media.toLocaleString('pt-BR') : '—'}</strong>
          <span>{resumo.totalAvaliacoes} {resumo.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}</span>
        </div>
        <div>
          <BriefcaseBusiness size={16} strokeWidth={2.2} />
          <strong>{resumo.concluidos}</strong>
          <span>{resumo.concluidos === 1 ? 'projeto concluído' : 'projetos concluídos'}</span>
        </div>
      </div>
    </section>
  )
}
