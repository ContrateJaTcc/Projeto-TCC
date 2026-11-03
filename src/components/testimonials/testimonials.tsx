import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import Avatar from '../avatar/avatar'
import { api } from '../../services/api'
import { formatarData } from '../../utils/formatar'
import styles from './testimonials.module.css'

/* Avaliações de verdade, deixadas no fim de projetos concluídos (vêm de /publico/depoimentos) */
interface Depoimento {
  id: number
  nota: number
  texto: string
  data: string
  categoria: string
  autor: string
  papel: 'freelancer' | 'contratante'
  /* Nível de quem escreveu (se for freelancer) ou de quem foi avaliado (se quem escreveu for contratante) */
  nivel: number | null
  sobre: string
  sobre_nivel: number | null
}

interface Resposta {
  media: number | null
  total: number
  depoimentos: Depoimento[]
}

const MOSTRAR = 4

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className={styles.estrelas} aria-label={`Nota ${nota} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} strokeWidth={2.2} fill={i < nota ? 'currentColor' : 'none'} className={i < nota ? '' : styles.apagada} />
      ))}
    </span>
  )
}

export default function Testimonials() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let ativo = true
    api<Resposta>('/publico/depoimentos', { silencioso: true })
      .then((d) => ativo && setDados(d))
      .catch(() => ativo && setFalhou(true))
    return () => {
      ativo = false
    }
  }, [])

  /* Sem servidor ou sem nenhuma avaliação com comentário, a seção não aparece */
  if (falhou || (dados && dados.depoimentos.length === 0)) return null

  return (
    <section className={styles.depoimentos}>
      <h2 className="titulo-magico placa">O que dizem por aqui</h2>
      {dados && dados.media !== null && (
        <p className={`${styles.resumo} placa`}>
          Média de <strong>{dados.media.toLocaleString('pt-BR')} ★</strong> em {dados.total} {dados.total === 1 ? 'avaliação' : 'avaliações'} de projetos concluídos
        </p>
      )}
      <div className={styles.grid}>
        {!dados
          ? Array.from({ length: MOSTRAR }, (_, i) => <div key={i} className={`skeleton ${styles.card} ${styles.esqueleto}`} />)
          : dados.depoimentos.slice(0, MOSTRAR).map((d) => (
              <article key={d.id} className={styles.card}>
                <div className={styles.autor}>
                  <Avatar nome={d.autor} size={42} nivel={d.nivel ?? undefined} />
                  <div>
                    <strong>{d.autor}</strong>
                    <span className={styles.area}>
                      {d.papel === 'freelancer' ? `Freelancer nível ${d.nivel}` : 'Contratante'} · {d.categoria}
                    </span>
                  </div>
                </div>
                <Estrelas nota={d.nota} />
                <p>“{d.texto}”</p>
                <span className={styles.sobre}>
                  sobre {d.papel === 'freelancer' ? 'o contratante' : 'o freelancer'} {d.sobre}
                  {d.sobre_nivel ? ` (nível ${d.sobre_nivel})` : ''} · {formatarData(d.data)}
                </span>
              </article>
            ))}
      </div>
    </section>
  )
}
