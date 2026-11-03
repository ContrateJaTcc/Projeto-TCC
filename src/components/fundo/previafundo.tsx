import { useEffect, useRef, useState } from 'react'
import type { Clima } from '../../utils/preferencias'
import { LARGURA, type Tema } from './camadas'
import { Camadas, CamadasClima } from './cena'
import styles from './fundopixel.module.css'

/* Miniatura do cenário (Configurações): muda na hora com o tema e o clima escolhidos */
export default function PreviaFundo({ tema, clima, animar }: { tema: Tema; clima: Clima; animar: boolean }) {
  const caixa = useRef<HTMLDivElement>(null)
  /* Tamanho de um pixel do desenho dentro da miniatura (a chuva e a neve usam essa medida) */
  const [escala, setEscala] = useState(0.6)

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = new ResizeObserver(() => setEscala(el.clientWidth / LARGURA))
    medir.observe(el)
    return () => medir.disconnect()
  }, [])

  return (
    <div ref={caixa} className={styles.previa} aria-label={`Prévia do cenário: ${tema === 'claro' ? 'pôr do sol' : 'noite'}, clima ${clima}`} role="img">
      <div className={styles.previaPalco}>
        <Camadas tema={tema} animar={animar} />
        {clima === 'neblina' && animar && <img className={styles.neblina} src={`/fundo/neblina-${tema}.svg`} alt="" draggable={false} />}
      </div>
      <CamadasClima clima={clima} tema={tema} animar={animar} escala={escala} />
    </div>
  )
}
