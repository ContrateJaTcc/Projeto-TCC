import { useEffect, useState } from 'react'
import { BookmarkPlus, Pencil, Trash2, ScrollText } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import styles from '../../pages/Configuracoes.module.css'
import proprio from './cartas.module.css'

interface Modelo {
  mod_id: number
  mod_titulo: string
  mod_texto: string
}

const LIMITE = 500
const MAXIMO = 10

/* Cartas de candidatura salvas: recados prontos para usar ao se candidatar */
export default function PainelCartas() {
  const toast = useToast()
  const [modelos, setModelos] = useState<Modelo[] | null>(null)
  const [editando, setEditando] = useState<number | 'nova' | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')

  useEffect(() => {
    let vivo = true
    api<{ disponivel: boolean; modelos: Modelo[] }>('/usuarios/eu/modelos', { silencioso: true })
      .then((d) => vivo && setModelos(d.disponivel ? d.modelos : null))
      .catch(() => vivo && setModelos(null))
    return () => {
      vivo = false
    }
  }, [])

  function abrir(m?: Modelo) {
    setEditando(m ? m.mod_id : 'nova')
    setTitulo(m?.mod_titulo ?? '')
    setTexto(m?.mod_texto ?? '')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editando === 'nova') {
        const r = await api<{ modelo: Modelo }>('/usuarios/eu/modelos', { metodo: 'POST', corpo: { titulo, texto } })
        setModelos((l) => [...(l ?? []), r.modelo])
      } else if (editando !== null) {
        await api(`/usuarios/eu/modelos/${editando}`, { metodo: 'PUT', corpo: { titulo, texto } })
        setModelos((l) => l?.map((m) => (m.mod_id === editando ? { ...m, mod_titulo: titulo.trim(), mod_texto: texto.trim() } : m)) ?? null)
      }
      setEditando(null)
      toast.mostrar('Carta salva.', 'sucesso')
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível salvar a carta.', 'erro')
    }
  }

  async function apagar(m: Modelo) {
    try {
      await api(`/usuarios/eu/modelos/${m.mod_id}`, { metodo: 'DELETE' })
      setModelos((l) => l?.filter((x) => x.mod_id !== m.mod_id) ?? null)
      toast.mostrar('Carta apagada.', 'sucesso')
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível apagar.', 'erro')
    }
  }

  if (modelos === null) return null

  return (
    <section className={styles.painel} id="cartas">
      <h2><ScrollText size={18} strokeWidth={2.2} /> Cartas de candidatura</h2>
      <p className={styles.texto}>Recados prontos para usar ao se candidatar (até {MAXIMO}). No projeto, escolha uma em "Usar carta salva".</p>

      {modelos.length === 0 && editando === null && <p className={styles.texto}>Nenhuma carta ainda.</p>}

      <ul className={proprio.lista}>
        {modelos.map((m) => (
          <li key={m.mod_id}>
            <div>
              <strong>{m.mod_titulo}</strong>
              <span>{m.mod_texto}</span>
            </div>
            <span className={proprio.botoes}>
              <button type="button" onClick={() => abrir(m)} aria-label={`Editar a carta ${m.mod_titulo}`}><Pencil size={15} strokeWidth={2.2} /></button>
              <button type="button" onClick={() => apagar(m)} aria-label={`Apagar a carta ${m.mod_titulo}`}><Trash2 size={15} strokeWidth={2.2} /></button>
            </span>
          </li>
        ))}
      </ul>

      {editando !== null ? (
        <form className={styles.form} onSubmit={salvar}>
          <label>
            Nome da carta
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={60} required placeholder='Ex.: "Para projetos de design"' />
          </label>
          <label>
            Texto
            <textarea className={proprio.texto} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={LIMITE} rows={5} required />
            <small>{texto.length}/{LIMITE}</small>
          </label>
          <div className={styles.acoes}>
            <button type="button" className={styles.botao} onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className={styles.botaoOuro} disabled={!titulo.trim() || texto.trim().length < 10}>Salvar carta</button>
          </div>
        </form>
      ) : (
        modelos.length < MAXIMO && (
          <button type="button" className={styles.botao} onClick={() => abrir()}>
            <BookmarkPlus size={16} strokeWidth={2.2} /> Nova carta
          </button>
        )
      )}
    </section>
  )
}
