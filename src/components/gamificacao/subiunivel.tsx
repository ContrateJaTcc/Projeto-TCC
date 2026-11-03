import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import styles from './subiunivel.module.css'

/* Quanto a tela fica aberta sozinha antes de sumir */
const TEMPO = 6500

/* Tela rápida de "subiu de nível" por cima da área logada; quem chama é anunciarNivel (utils/xp.ts) */
export default function SubiuNivel() {
  const [nivel, setNivel] = useState<number | null>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoSubir = (e: Event) => setNivel((e as CustomEvent<number>).detail)
    window.addEventListener('subiu-nivel', aoSubir)
    return () => window.removeEventListener('subiu-nivel', aoSubir)
  }, [])

  useEffect(() => {
    if (nivel === null) return
    botao.current?.focus()
    const fechar = () => setNivel(null)
    const id = window.setTimeout(fechar, TEMPO)
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', aoTeclar)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [nivel])

  if (nivel === null) return null

  return (
    <div className={styles.veu} onClick={() => setNivel(null)}>
      <div className={styles.cartao} role="alertdialog" aria-labelledby="titulo-nivel" aria-describedby="texto-nivel" onClick={(e) => e.stopPropagation()}>
        {/* Brilhos piscando em volta do selo */}
        <span className={`${styles.brilho} ${styles.b1}`} aria-hidden="true">✦</span>
        <span className={`${styles.brilho} ${styles.b2}`} aria-hidden="true">✦</span>
        <span className={`${styles.brilho} ${styles.b3}`} aria-hidden="true">✦</span>
        <div className={styles.selo} aria-hidden="true">
          <small>NV</small>
          <strong>{nivel}</strong>
        </div>
        <h2 id="titulo-nivel">Subiu de nível!</h2>
        <p id="texto-nivel">
          Agora você é nível {nivel}. Continue concluindo projetos e missões para ganhar mais XP e insígnias.
        </p>
        <button ref={botao} type="button" className={styles.continuar} onClick={() => setNivel(null)}>
          <Sparkles size={16} strokeWidth={2.4} /> Continuar
        </button>
      </div>
    </div>
  )
}
