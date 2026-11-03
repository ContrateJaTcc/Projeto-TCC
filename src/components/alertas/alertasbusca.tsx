import { useEffect, useState } from 'react'
import { BellPlus, BellRing, Trash2 } from 'lucide-react'
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

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = await api<{ mensagem: string; buscas: Busca[] }>('/buscas', {
        metodo: 'POST',
        corpo: { termo: termo.trim(), tipo_id: tipoId || null, valor_min: valorMin.replace(',', '.') },
      })
      setBuscas(dados.buscas)
      setTermo('')
      setTipoId('')
      setValorMin('')
      toast.mostrar(dados.mensagem)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível criar o alerta.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function apagar(b: Busca) {
    setApagando(b.bus_id)
    try {
      const dados = await api<{ buscas: Busca[] }>(`/buscas/${b.bus_id}`, { metodo: 'DELETE' })
      setBuscas(dados.buscas)
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
            <li key={b.bus_id}>
              <span>{descrever(b)}</span>
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

      {buscas.length < LIMITE ? (
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
            {salvando ? <span className="spinner" /> : <BellPlus size={16} strokeWidth={2.2} />}
            Criar alerta
          </button>
        </form>
      ) : (
        <p className={styles.limite}>Você já tem {LIMITE} alertas. Apague um para criar outro.</p>
      )}
    </section>
  )
}
