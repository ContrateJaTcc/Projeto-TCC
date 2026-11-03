import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Footprints, Check, Gift, ArrowRight } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { comemorar } from '../../utils/preferencias'
import styles from './missoes.module.css'

interface Passo {
  codigo: string
  titulo: string
  descricao: string
  link: string
  xp: number
  feito: boolean
  resgatado: boolean
}

/* Guia de quem acabou de chegar: cada passo feito vale XP; some quando tudo foi resgatado */
export default function PrimeirosPassos() {
  const toast = useToast()
  const [dados, setDados] = useState<{ resgateDisponivel: boolean; passos: Passo[] } | null>(null)
  const [resgatando, setResgatando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setDados(await api('/passos', { silencioso: true }))
    } catch {
      setDados(null)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function resgatar(p: Passo) {
    setResgatando(p.codigo)
    try {
      const r = await api<{ mensagem: string }>(`/passos/${p.codigo}/resgatar`, { metodo: 'POST' })
      toast.mostrar(r.mensagem, 'sucesso')
      comemorar()
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível resgatar.', 'erro')
    } finally {
      setResgatando(null)
    }
  }

  if (!dados || dados.passos.every((p) => p.resgatado)) return null

  const prontos = dados.passos.filter((p) => p.resgatado).length

  return (
    <section className={`${styles.cartao} ${styles.passos}`}>
      <header className={styles.cabeca}>
        <h2><Footprints size={20} strokeWidth={2.4} /> Primeiros passos</h2>
        <small>{prontos} de {dados.passos.length} · cada um vale +{dados.passos[0]?.xp} XP</small>
      </header>
      <ol className={styles.lista}>
        {dados.passos.map((p) => (
          <li key={p.codigo} className={`${styles.missao} ${p.resgatado ? styles.feita : ''}`}>
            <div className={styles.texto}>
              <strong>{p.titulo}</strong>
              <span>{p.descricao}</span>
            </div>
            {p.resgatado ? (
              <span className={styles.selo}><Check size={15} strokeWidth={2.6} /> +{p.xp} XP</span>
            ) : p.feito && dados.resgateDisponivel ? (
              <button type="button" className={styles.resgatar} disabled={resgatando === p.codigo} onClick={() => resgatar(p)}>
                {resgatando === p.codigo ? <span className="spinner" /> : <Gift size={15} strokeWidth={2.4} />} Resgatar +{p.xp} XP
              </button>
            ) : (
              <Link to={p.link} className={styles.irPasso} viewTransition>
                Fazer <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
