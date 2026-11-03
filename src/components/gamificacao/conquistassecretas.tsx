import { useEffect, useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { api } from '../../services/api'
import { EVENTO_CONQUISTA } from '../../utils/conquistas'
import { formatarData } from '../../utils/formatar'
import styles from './conquistassecretas.module.css'

interface Conquista {
  codigo: string
  nome: string
  descricao: string
  conquistada: boolean
  data: string | null
}

/* Conquistas secretas no "Meu perfil": as não achadas mostram só uma dica */
export default function ConquistasSecretas() {
  const [lista, setLista] = useState<Conquista[] | null>(null)

  useEffect(() => {
    let vivo = true
    const carregar = () =>
      api<{ conquistas: Conquista[] }>('/conquistas', { silencioso: true })
        .then((d) => vivo && setLista(d.conquistas))
        .catch(() => vivo && setLista(null))
    carregar()
    /* Achou uma com a página aberta: atualiza */
    window.addEventListener(EVENTO_CONQUISTA, carregar)
    return () => {
      vivo = false
      window.removeEventListener(EVENTO_CONQUISTA, carregar)
    }
  }, [])

  if (!lista) return null
  const achadas = lista.filter((c) => c.conquistada).length

  return (
    <section className={styles.secao} aria-labelledby="titulo-secretas">
      <div className={styles.topo}>
        <h2 id="titulo-secretas">
          <Sparkles size={18} strokeWidth={2.2} />
          Conquistas secretas
        </h2>
        <span>{achadas} de {lista.length} encontradas</span>
      </div>
      <ul className={styles.grade}>
        {lista.map((c) => (
          <li key={c.codigo} className={c.conquistada ? styles.achada : styles.escondida}>
            <span className={styles.icone} aria-hidden="true">
              {c.conquistada ? <Sparkles size={20} strokeWidth={2.2} /> : <Lock size={18} strokeWidth={2.2} />}
            </span>
            <strong>{c.nome}</strong>
            <p>{c.descricao}</p>
            {c.conquistada && c.data && <small>Desde {formatarData(c.data)}</small>}
          </li>
        ))}
      </ul>
    </section>
  )
}
