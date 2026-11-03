import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { DIAS_SEMANA, textoHorarios, type Horarios } from '../../utils/horarios'
import styles from './horarios.module.css'

const HORAS = Array.from({ length: 25 }, (_, h) => h)

/* Horários de atendimento: o "marcar reunião" do chat só aceita horários dentro deles */
export default function EditorHorarios() {
  const toast = useToast()
  const [horarios, setHorarios] = useState<Horarios | null | undefined>(undefined)
  const [editando, setEditando] = useState<Horarios>({ dias: [1, 2, 3, 4, 5], de: 9, ate: 18 })

  useEffect(() => {
    let vivo = true
    api<{ horarios?: Horarios | null }>('/usuarios/eu', { silencioso: true })
      .then((u) => {
        if (!vivo || u.horarios === undefined) return
        setHorarios(u.horarios)
        if (u.horarios) setEditando(u.horarios)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  /* Servidor sem a migração: o editor nem aparece */
  if (horarios === undefined) return null

  async function salvar(novo: Horarios | null) {
    try {
      const r = await api<{ mensagem: string }>('/usuarios/eu/horarios', { metodo: 'PUT', corpo: { horarios: novo } })
      setHorarios(novo)
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar os horários.', 'erro')
    }
  }

  const alternarDia = (d: number) => setEditando((h) => ({ ...h, dias: h.dias.includes(d) ? h.dias.filter((x) => x !== d) : [...h.dias, d].sort() }))

  return (
    <section className={styles.caixa} aria-labelledby="titulo-horarios">
      <h2 id="titulo-horarios"><Clock size={18} strokeWidth={2.2} aria-hidden="true" /> Horários de atendimento</h2>
      <p className={styles.dica}>
        {horarios ? `Agora: ${textoHorarios(horarios)}. ` : 'Você ainda não definiu. '}
        Aparece no seu portfólio, e as reuniões do chat só podem ser marcadas dentro desses horários (de Brasília).
      </p>
      <div className={styles.dias} role="group" aria-label="Dias da semana">
        {DIAS_SEMANA.map((nome, d) => (
          <button key={d} type="button" aria-pressed={editando.dias.includes(d)} onClick={() => alternarDia(d)}>{nome}</button>
        ))}
      </div>
      <div className={styles.horas}>
        <label>
          Das
          <select value={editando.de} onChange={(e) => setEditando((h) => ({ ...h, de: Number(e.target.value) }))}>
            {HORAS.slice(0, 24).map((h) => <option key={h} value={h}>{h}h</option>)}
          </select>
        </label>
        <label>
          às
          <select value={editando.ate} onChange={(e) => setEditando((h) => ({ ...h, ate: Number(e.target.value) }))}>
            {HORAS.slice(1).map((h) => <option key={h} value={h}>{h}h</option>)}
          </select>
        </label>
        <button type="button" className={styles.salvar} onClick={() => salvar(editando)} disabled={!editando.dias.length || editando.de >= editando.ate}>
          Salvar horários
        </button>
        {horarios && <button type="button" className={styles.limpar} onClick={() => salvar(null)}>Atendo a qualquer hora</button>}
      </div>
    </section>
  )
}
