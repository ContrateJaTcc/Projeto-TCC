import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BarraXp from '../gamificacao/barraxp'
import { api } from '../../services/api'
import type { PerfilFreelancer } from '../gamificacao/tipos'
import styles from './privateheader.module.css'

/* Intervalo mínimo */
const INTERVALO = 60_000

/* XP do freelancer no cabeçalho */
export default function XpCabecalho() {
  const { pathname } = useLocation()
  const [xp, setXp] = useState<number | null>(null)
  const ultima = useRef(0)

  useEffect(() => {
    if (Date.now() - ultima.current < INTERVALO) return

    api<PerfilFreelancer>('/perfil/freelancer/eu')
      .then((d) => {
        /* Marca só quando deu certo */
        ultima.current = Date.now()
        setXp(d.resumo.xp)
      })
      .catch(() => {})
  }, [pathname])

  if (xp === null) return null

  return (
    <Link to="/freelancer/perfil" className={styles.xp} data-tour="xp" title="Ver meu nível e insígnias" viewTransition>
      <BarraXp xp={xp} compacta />
    </Link>
  )
}
