import { useEffect, useState } from 'react'
import { BellPlus, BellRing, Trash2, Pencil, Check } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarMoeda } from '../../utils/formatar'
import styles from './alertasbusca.module.css'

interface Busca {
  bus_id: number
  bus_termo: string | null
  tipo_id: number | null
  categoria: string | null
  bus_valor_min: number | string | null
}

interface Tipo {
  tipo_id: number
  tipo_nome: string
}

const LIMITE = 5

/* Alertas de busca: avisa o freelancer quando sai um projeto parecido com o que ele procura */
export default function AlertasBusca() {
  const toast = useToast()
  const [buscas, setBuscas] = useState<Busca[] | null>(null)
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [termo, setTermo] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [apagando, setApagando] = useState<number | null>(null)
  /* Editando um alerta: o mesmo formulário, preenchido, salva a mudança */
  const [editando, setEditando] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    api<{ buscas: Busca[] }>('/buscas', { silencioso: true })
      .then((d) => ativo && setBuscas(d.buscas))
      /* Servidor sem a migração nova: a seção some */
      .catch(() => ativo && setBuscas(null))
    api<{ tipos: Tipo[] }>('/tipos-servico', { silencioso: true })
      .then((d) => ativo && setTipos(d.tipos))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

  if (buscas === null) return null

  function limparForm() {
    setTermo('')
    setTipoId('')
    setValorMin('')
    setEditando(null)
  }

  function editar(b: Busca) {
    setEditando(b.bus_id)
    setTermo(b.bus_termo ?? '')
    setTipoId(b.tipo_id ? String(b.tipo_id) : '')
    setValorMin(b.bus_valor_min != null && Number(b.bus_valor_min) > 0 ? String(Number(b.bus_valor_min)).replace('.', ',') : '')
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = await api<{ mensagem: string; buscas: Busca[] }>(editando ? `/buscas/${editando}` : '/buscas', {
        metodo: editando ? 'PUT' : 'POST',
        corpo: { termo: termo.trim(), tipo_id: tipoId || null, valor_min: valorMin.replace(',', '.') },
      })
      setBuscas(dados.buscas)
      limparForm()
      toast.mostrar(dados.mensagem)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : editando ? 'Não foi possível salvar o alerta.' : 'Não foi possível criar o alerta.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function apagar(b: Busca) {
    setApagando(b.bus_id)
    try {
      const dados = await api<{ buscas: Busca[] }>(`/buscas/${b.bus_id}`, { metodo: 'DELETE' })
      setBuscas(dados.buscas)
      if (editando === b.bus_id) limparForm()
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível apagar o alerta.', 'erro')
    } finally {
      setApagando(null)
    }
  }

  const descrever = (b: Busca) =>
    [
      b.bus_termo ? `“${b.bus_termo}”` : null,
      b.categoria,
      b.bus_valor_min != null && Number(b.bus_valor_min) > 0 ? `a partir de ${formatarMoeda(b.bus_valor_min)}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

  const podeSalvar = (termo.trim() || tipoId) && !salvando

  return (
    <section className={styles.alertas} aria-labelledby="titulo-alertas">
      <div className={styles.topo}>
        <span className={styles.icone}><BellRing size={18} strokeWidth={2.2} /></span>
        <div>
          <h2 id="titulo-alertas">Alertas de projetos</h2>
          <p>Salve o que você procura e receba uma notificação quando um projeto assim for publicado.</p>
        </div>
      </div>

      {buscas.length > 0 && (
        <ul className={styles.lista}>
          {buscas.map((b) => (
            <li key={b.bus_id} className={editando === b.bus_id ? styles.emEdicao : ''}>
              <span>{descrever(b)}</span>
              <button type="button" onClick={() => editar(b)} aria-label={`Editar o alerta ${descrever(b)}`} aria-pressed={editando === b.bus_id}>
                <Pencil size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => apagar(b)}
                disabled={apagando === b.bus_id}
                aria-label={`Apagar o alerta ${descrever(b)}`}
              >
                <Trash2 size={14} strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {buscas.length < LIMITE || editando ? (
        <form className={styles.form} onSubmit={criar}>
          <label>
            Palavra
            <input value={termo} onChange={(e) => setTermo(e.target.value)} maxLength={80} placeholder="Ex.: site, logo, cafeteria" />
          </label>
          <label>
            Categoria
            <select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
              <option value="">Qualquer uma</option>
              {tipos.map((t) => (
                <option key={t.tipo_id} value={t.tipo_id}>{t.tipo_nome}</option>
              ))}
            </select>
          </label>
          <label>
            Pagando a partir de (R$)
            <input inputMode="decimal" value={valorMin} onChange={(e) => setValorMin(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="Opcional" />
          </label>
          <button type="submit" disabled={!podeSalvar}>
            {salvando ? <span className="spinner" /> : editando ? <Check size={16} strokeWidth={2.2} /> : <BellPlus size={16} strokeWidth={2.2} />}
            {editando ? 'Salvar alerta' : 'Criar alerta'}
          </button>
          {editando && (
            <button type="button" className={styles.cancelar} onClick={limparForm}>
              Cancelar
            </button>
          )}
        </form>
      ) : (
        <p className={styles.limite}>Você já tem {LIMITE} alertas. Apague um para criar outro.</p>
      )}
    </section>
  )
}
