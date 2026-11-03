import { useEffect, useState } from 'react'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import styles from './FunilAdmin.module.css'

interface Passo {
  passo: string
  total: number
  do_anterior: number | null
}

interface Funil {
  freelancer: Passo[]
  contratante: Passo[]
}

const PERIODOS = [
  { dias: 0, rotulo: 'Desde o começo' },
  { dias: 90, rotulo: 'Últimos 90 dias' },
  { dias: 30, rotulo: 'Últimos 30 dias' },
]

/* Um funil: barras que encolhem a cada passo, com quantos passaram do passo anterior */
function Degraus({ titulo, passos }: { titulo: string; passos: Passo[] }) {
  const maior = Math.max(1, ...passos.map((p) => p.total))
  const pior = passos.slice(1).reduce<Passo | null>((m, p) => (p.do_anterior !== null && (!m || (m.do_anterior ?? 101) > p.do_anterior) ? p : m), null)
  return (
    <section className={styles.funil} aria-labelledby={`funil-${titulo}`}>
      <h3 id={`funil-${titulo}`}>{titulo}</h3>
      <ol>
        {passos.map((p) => (
          <li key={p.passo}>
            <span className={styles.rotulo}>{p.passo}</span>
            <span className={styles.trilho}>
              <span className={styles.barra} style={{ width: `${Math.max(2, (p.total / maior) * 100)}%` }} />
            </span>
            <strong>{p.total}</strong>
            <span className={styles.taxa}>{p.do_anterior === null ? '' : `${p.do_anterior}%`}</span>
          </li>
        ))}
      </ol>
      {pior && <p className={styles.alerta}>Onde mais gente desiste: <strong>{pior.passo.toLowerCase()}</strong> (só {pior.do_anterior}% chegam lá).</p>}
    </section>
  )
}

/* Funil: de quantos se cadastram, quantos chegam a cada passo (mostra onde as pessoas desistem) */
export default function FunilAdmin() {
  const [dias, setDias] = useState(0)
  const [dados, setDados] = useState<Funil | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    api<Funil>(`/admin/funil${dias ? `?dias=${dias}` : ''}`)
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível montar o funil.'))
    return () => {
      vivo = false
    }
  }, [dias])

  if (erro) return <EstadoErro mensagem={erro} />

  return (
    <div className={styles.caixa}>
      <div className={styles.periodos} role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button key={p.dias} type="button" aria-pressed={dias === p.dias} onClick={() => { setDados(null); setDias(p.dias) }}>{p.rotulo}</button>
        ))}
      </div>
      {!dados ? (
        <Carregando variante="lista" />
      ) : (
        <div className={styles.grade}>
          <Degraus titulo="Freelancers" passos={dados.freelancer} />
          <Degraus titulo="Contratantes" passos={dados.contratante} />
        </div>
      )}
    </div>
  )
}
