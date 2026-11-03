import { useState } from 'react'
import { Save } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { SeloDisponibilidade } from '../aparencia/aparencia'
import { ROTULO_DISPONIBILIDADE, type Disponibilidade, type StatusDisponibilidade } from '../../utils/aparencia'
import styles from './perfil.module.css'

const hoje = () => new Date().toISOString().slice(0, 10)

/* Disponibilidade do freelancer: aparece na busca de freelancers, no portfólio e no perfil público */
export default function EditarDisponibilidade({ atual, aoMudar }: { atual?: Disponibilidade; aoMudar: (d: Disponibilidade) => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<StatusDisponibilidade>(atual?.status ?? 'disponivel')
  const [ate, setAte] = useState(atual?.ate ?? '')
  const [salvando, setSalvando] = useState(false)
  const mudou = status !== (atual?.status ?? 'disponivel') || (status !== 'disponivel' && ate !== (atual?.ate ?? ''))

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const r = await api<{ mensagem: string; disponibilidade: Disponibilidade }>('/usuarios/eu/disponibilidade', {
        metodo: 'PUT',
        corpo: { status, ate: status === 'disponivel' ? null : ate || null },
      })
      aoMudar(r.disponibilidade)
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível salvar a disponibilidade.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className={styles.disponibilidade} onSubmit={salvar} aria-label="Disponibilidade">
      <div className={styles.dispTopo}>
        <strong>Disponibilidade</strong>
        <SeloDisponibilidade disponibilidade={atual} />
      </div>
      <div className={styles.dispOpcoes} role="radiogroup" aria-label="Como você está agora">
        {(Object.keys(ROTULO_DISPONIBILIDADE) as StatusDisponibilidade[]).map((s) => (
          <label key={s} className={`${styles.dispOpcao} ${status === s ? styles.dispAtiva : ''}`}>
            <input type="radio" name="disponibilidade" value={s} checked={status === s} onChange={() => setStatus(s)} />
            {ROTULO_DISPONIBILIDADE[s]}
          </label>
        ))}
      </div>
      {status !== 'disponivel' && (
        <label className={styles.dispData}>
          Volta quando? (opcional)
          <input type="date" min={hoje()} value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
      )}
      <button type="submit" className={styles.dispSalvar} disabled={!mudou || salvando}>
        {salvando ? <span className="spinner" /> : <Save size={14} strokeWidth={2.4} />} Salvar
      </button>
    </form>
  )
}
