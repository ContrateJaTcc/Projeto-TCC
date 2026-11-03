import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Map as IconeMapa, PawPrint } from 'lucide-react'
import { api } from '../../services/api'
import Mascote from '../reino/mascote'
import { faseDoNivel, regiaoDoNivel, ROTULO_FASE } from '../../utils/reino'
import cartao from '../gamificacao/missoes.module.css'
import styles from './cartaomascote.module.css'

interface Eu {
  mascote?: { especie: string; nome: string } | null
  cor_nome?: string | null
}

/* Cartão do painel: o mascote do castelo e em que região do mapa do reino a pessoa está */
export default function CartaoMascote() {
  const [eu, setEu] = useState<Eu | null>(null)
  const [nivel, setNivel] = useState<number | null>(null)

  useEffect(() => {
    let vivo = true
    Promise.all([api<Eu>('/usuarios/eu', { silencioso: true }), api<{ resumo: { nivel: number } }>('/perfil/freelancer/eu', { silencioso: true })])
      .then(([u, p]) => {
        if (!vivo) return
        setEu(u)
        setNivel(p.resumo.nivel)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  /* Servidor antigo (sem o campo do mascote): o cartão não aparece */
  if (!eu || nivel === null || eu.mascote === undefined) return null

  const { atual, proxima } = regiaoDoNivel(nivel)

  return (
    <section className={cartao.cartao} aria-labelledby="titulo-mascote">
      <header className={cartao.cabeca}>
        <h2 id="titulo-mascote"><PawPrint size={20} strokeWidth={2.4} /> Seu castelo</h2>
        <small>nível {nivel}</small>
      </header>

      <div className={styles.corpo}>
        <div className={styles.palco}>
          {eu.mascote ? (
            <Mascote especie={eu.mascote.especie} nivel={nivel} cor={eu.cor_nome} tamanho={88} nome={eu.mascote.nome} />
          ) : (
            <span className={styles.ovo} aria-hidden="true">?</span>
          )}
        </div>
        <div className={styles.texto}>
          {eu.mascote ? (
            <>
              <strong>{eu.mascote.nome}</strong>
              <span>{ROTULO_FASE[faseDoNivel(nivel)]} · mora em {atual.nome}</span>
            </>
          ) : (
            <>
              <strong>Um mascote espera por você</strong>
              <span>Escolha um bichinho: ele cresce junto com o seu nível.</span>
            </>
          )}
          {proxima && <small>Próxima região: {proxima.nome} (nível {proxima.nivel})</small>}
        </div>
      </div>

      <Link to="/freelancer/reino" className={styles.link} viewTransition>
        <IconeMapa size={15} strokeWidth={2.4} /> {eu.mascote ? 'Ver o mapa do reino' : 'Adotar um mascote'}
      </Link>
    </section>
  )
}
