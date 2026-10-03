import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Star } from 'lucide-react'
import Avatar from '../avatar/avatar'
import { api } from '../../services/api'
import type { PerfilFreelancer } from '../gamificacao/tipos'
import type { PerfilContratante } from '../gamificacao/painelcontratante'
import styles from './profilecard.module.css'

interface Resumo {
  nome: string
  foto: string | null
  linha: string
  /* 0 a 100; só o freelancer tem barra (XP até o próximo nível). */
  progresso: number | null
  rotuloProgresso?: string
}

/*
 * Cartão do canto do painel. Antes mostrava "Você" / "Usuário" e uma barra
 * de progresso com número fixo no código. Agora carrega o nome, a foto e,
 * para o freelancer, o progresso real até o próximo nível.
 */
export default function ProfileCard({ papel }: { papel: 'freelancer' | 'contratante' }) {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const eu = await api<{ usu_nome: string; usu_foto: string | null }>('/usuarios/eu')

        if (papel === 'freelancer') {
          const { resumo: r } = await api<PerfilFreelancer>('/perfil/freelancer/eu')
          const faixa = r.xpProximoNivel - r.xpNivelAtual

          if (ativo) {
            setResumo({
              nome: eu.usu_nome,
              foto: eu.usu_foto,
              linha: `Nível ${r.nivel} · ${r.xp} XP`,
              progresso: faixa > 0 ? ((r.xp - r.xpNivelAtual) / faixa) * 100 : 100,
              rotuloProgresso: `${r.xpProximoNivel - r.xp} XP para o nível ${r.nivel + 1}`,
            })
          }
        } else {
          const p = await api<PerfilContratante>('/perfil/contratante/eu')

          if (ativo) {
            setResumo({
              nome: eu.usu_nome,
              foto: eu.usu_foto,
              linha:
                p.reputacao.total > 0
                  ? `${p.reputacao.media.toLocaleString('pt-BR')} ★ · ${p.estatisticas.concluidos} concluídos`
                  : `${p.estatisticas.abertos} abertos · ${p.estatisticas.concluidos} concluídos`,
              progresso: null,
            })
          }
        }
      } catch {
        /* Antes, se esta carga falhasse, o esqueleto ficava piscando para
           sempre. Agora o cartão some e o painel segue sem ele. */
        if (ativo) setFalhou(true)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [papel])

  if (falhou) return null

  if (!resumo) {
    return (
      <div className={styles.card} aria-busy="true">
        <div className={`skeleton ${styles.avatarEsqueleto}`} />
        <div className={styles.texto}>
          <div className="skeleton" style={{ height: 14, width: '70%' }} />
          <div className="skeleton" style={{ height: 11, width: '50%' }} />
        </div>
      </div>
    )
  }

  return (
    <Link to={`/${papel}/perfil`} className={`${styles.card} ${styles.carregado} elevavel`}>
      <Avatar nome={resumo.nome} size={55} foto={resumo.foto} />
      <div className={styles.texto}>
        <strong>{resumo.nome}</strong>
        <span>
          {papel === 'contratante' && <Star size={12} strokeWidth={2.4} className={styles.estrela} />}
          {resumo.linha}
        </span>
        {resumo.progresso !== null && (
          <>
            <div className={styles.barra} title={resumo.rotuloProgresso}>
              <div className={styles.progresso} style={{ width: `${resumo.progresso}%` }} />
            </div>
            <span className={styles.rotulo}>{resumo.rotuloProgresso}</span>
          </>
        )}
      </div>
      <ChevronRight size={18} strokeWidth={2.2} className={styles.seta} />
    </Link>
  )
}
