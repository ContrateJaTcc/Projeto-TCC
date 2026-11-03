import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkPlus } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import styles from './recado.module.css'

interface ModeloRecado {
  mod_id: number
  mod_titulo: string
  mod_texto: string
}

interface Props {
  valor: string
  aoMudar: (texto: string) => void
}

const LIMITE_RECADO = 500

/* Recado da candidatura com as cartas salvas: escolher uma preenche o texto; dá para guardar o que foi escrito */
export default function RecadoCandidatura({ valor, aoMudar }: Props) {
  const { mostrar } = useToast()
  const [modelos, setModelos] = useState<ModeloRecado[]>([])
  const [guardando, setGuardando] = useState(false)
  const [nome, setNome] = useState('')

  useEffect(() => {
    let vivo = true
    api<{ modelos: ModeloRecado[] }>('/usuarios/eu/modelos', { silencioso: true })
      .then((d) => vivo && setModelos(d.modelos))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  async function guardar() {
    try {
      const r = await api<{ modelo: ModeloRecado; mensagem: string }>('/usuarios/eu/modelos', { metodo: 'POST', corpo: { titulo: nome, texto: valor } })
      setModelos((m) => [...m, r.modelo])
      setGuardando(false)
      setNome('')
      mostrar('Carta guardada. Da próxima vez é só escolher.', 'sucesso')
    } catch (e) {
      mostrar(e instanceof ErroApi ? e.message : 'Não foi possível guardar a carta.', 'erro')
    }
  }

  return (
    <div className={styles.recado}>
      <div className={styles.linha}>
        <label htmlFor="recado-candidatura">Recado para o contratante (opcional)</label>
        {modelos.length > 0 && (
          <select
            aria-label="Usar uma carta salva"
            value=""
            onChange={(e) => {
              const m = modelos.find((x) => x.mod_id === Number(e.target.value))
              if (m) aoMudar(m.mod_texto.slice(0, LIMITE_RECADO))
            }}
          >
            <option value="">Usar carta salva...</option>
            {modelos.map((m) => <option key={m.mod_id} value={m.mod_id}>{m.mod_titulo}</option>)}
          </select>
        )}
      </div>
      <textarea
        id="recado-candidatura"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        maxLength={LIMITE_RECADO}
        rows={4}
        placeholder="Conte por que você é a pessoa certa: experiência parecida, como vai fazer, quando consegue começar..."
      />
      <div className={styles.linha}>
        <small>{valor.length}/{LIMITE_RECADO}</small>
        {guardando ? (
          <span className={styles.guardar}>
            <input aria-label="Nome da carta" placeholder='Nome, ex.: "Apresentação curta"' value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
            <button type="button" onClick={guardar} disabled={!nome.trim() || valor.trim().length < 10}>Guardar</button>
            <button type="button" onClick={() => setGuardando(false)}>Cancelar</button>
          </span>
        ) : (
          <button type="button" className={styles.link} onClick={() => setGuardando(true)} disabled={valor.trim().length < 10}>
            <BookmarkPlus size={14} strokeWidth={2.4} aria-hidden="true" /> Guardar como carta
          </button>
        )}
      </div>
      {modelos.length > 0 && (
        <small>
          Suas cartas ficam nas <Link to="/freelancer/configuracoes#cartas">Configurações</Link>.
        </small>
      )}
    </div>
  )
}
