import { useEffect, useState } from 'react'
import { Castle, GraduationCap, Award, CircleCheckBig, Footprints } from 'lucide-react'
import { api } from '../../services/api'
import { haQuanto } from '../../utils/formatar'
import Brasao from './brasao'
import styles from './mural.module.css'

interface ItemMural {
  tipo: 'guilda' | 'teste' | 'insignia' | 'projeto' | 'chegada'
  data: string
  texto: string
  brasao?: string
  cor?: string
}

const ICONES = { teste: GraduationCap, insignia: Award, projeto: CircleCheckBig, chegada: Footprints, guilda: Castle }

/* Mural do reino: o que acontece no castelo, sem dados pessoais (nome curto, nunca valores nem títulos) */
export default function MuralReino({ limite = 8, titulo = 'Mural do reino', naHome = false }: { limite?: number; titulo?: string; naHome?: boolean }) {
  const [itens, setItens] = useState<ItemMural[] | null>(null)

  useEffect(() => {
    let vivo = true
    api<{ itens: ItemMural[] }>('/publico/mural', { publico: true, silencioso: true })
      .then((d) => vivo && setItens(d.itens))
      .catch(() => vivo && setItens([]))
    return () => {
      vivo = false
    }
  }, [])

  /* Sem novidade (ou sem servidor), o mural nem aparece */
  if (!itens?.length) return null

  return (
    <section className={`${styles.mural} ${naHome ? styles.naHome : ''}`} aria-labelledby="mural-titulo">
      <h2 id="mural-titulo">{titulo}</h2>
      <ol className={styles.lista}>
        {itens.slice(0, limite).map((i, n) => {
          const Icone = ICONES[i.tipo] ?? Castle
          return (
            <li key={n}>
              <span className={styles.icone} aria-hidden="true">
                {i.tipo === 'guilda' && i.brasao ? <Brasao brasao={i.brasao} cor={i.cor ?? 'ouro'} tamanho={22} /> : <Icone size={18} strokeWidth={2.4} />}
              </span>
              <span className={styles.texto}>{i.texto}</span>
              <time className={styles.quando} dateTime={i.data}>{haQuanto(i.data)}</time>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
