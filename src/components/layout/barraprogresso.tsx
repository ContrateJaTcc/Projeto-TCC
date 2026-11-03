import { useEffect, useState } from 'react'
import styles from './privatelayout.module.css'

/* Barra de carregamento */
export default function BarraProgresso() {
  const [ativa, setAtiva] = useState(false)

  useEffect(() => {
    let atraso: ReturnType<typeof setTimeout> | undefined

    const aoMudar = (e: Event) => {
      const pendentes = (e as CustomEvent<number>).detail
      clearTimeout(atraso)

      /* Só aparece se demorar */
      if (pendentes > 0) atraso = setTimeout(() => setAtiva(true), 120)
      else setAtiva(false)
    }

    window.addEventListener('api:carregando', aoMudar)
    return () => {
      clearTimeout(atraso)
      window.removeEventListener('api:carregando', aoMudar)
    }
  }, [])

  return (
    <div
      className={`${styles.barra} ${ativa ? styles.barraAtiva : ''}`}
      role="progressbar"
      aria-hidden={!ativa}
      aria-label="Carregando"
    />
  )
}
