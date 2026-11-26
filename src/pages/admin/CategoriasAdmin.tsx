import { useCallback, useEffect, useState } from 'react'
import { Tags, Plus, Pencil, Trash2, EyeOff, Eye, Check, X } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import styles from './Painel.module.css'
import proprios from './CategoriasAdmin.module.css'

interface Categoria {
  tipo_id: number
  tipo_nome: string
  tipo_desc: string | null
  ativo: boolean
  projetos: number
  freelancers: number
}

const VAZIO = { nome: '', descricao: '' }

/*
 * Categorias de projeto: criar, renomear, desativar e excluir.
 * Com projetos, o servidor não deixa excluir: a saída é desativar (some dos formulários, fica nos projetos antigos).
 */
export default function CategoriasAdmin() {
  const toast = useToast()
  const [lista, setLista] = useState<Categoria[] | null>(null)
  const [erro, setErro] = useState('')
  const [nova, setNova] = useState(VAZIO)
  const [editando, setEditando] = useState<number | null>(null)
  const [edicao, setEdicao] = useState(VAZIO)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setLista((await api<{ categorias: Categoria[] }>('/admin/categorias')).categorias)
      setErro('')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar as categorias.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  /* Toda ação: avisa, recarrega e devolve se deu certo */
  async function agir(fazer: () => Promise<{ mensagem: string }>) {
    setOcupado(true)
    try {
      const r = await fazer()
      toast.mostrar(r.mensagem, 'sucesso')
      await carregar()
      return true
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível concluir.', 'erro')
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (await agir(() => api('/admin/categorias', { metodo: 'POST', corpo: nova }))) setNova(VAZIO)
  }

  async function salvar(c: Categoria) {
    if (await agir(() => api(`/admin/categorias/${c.tipo_id}`, { metodo: 'PUT', corpo: edicao }))) setEditando(null)
  }

  const alternarAtivo = (c: Categoria) =>
    agir(() => api(`/admin/categorias/${c.tipo_id}`, { metodo: 'PUT', corpo: { nome: c.tipo_nome, descricao: c.tipo_desc ?? '', ativo: !c.ativo } }))

  async function excluir(c: Categoria) {
    /* Segundo clique confirma */
    if (confirmando !== c.tipo_id) {
      setConfirmando(c.tipo_id)
      return
    }
    setConfirmando(null)
    await agir(() => api(`/admin/categorias/${c.tipo_id}`, { metodo: 'DELETE' }))
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={carregar} />
  if (!lista) return <Carregando variante="lista" />

  return (
    <div className={proprios.pagina}>
      <form className={proprios.nova} onSubmit={criar}>
        <h3>Nova categoria</h3>
        <label>
          Nome
          <input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} maxLength={100} placeholder="Ex.: Fotografia" required minLength={2} />
        </label>
        <label>
          Descrição (opcional)
          <input value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} maxLength={300} placeholder="Ex.: Ensaios, eventos e fotos de produto" />
        </label>
        <button type="submit" className={`${styles.acao} ${styles.reativar}`} disabled={ocupado || nova.nome.trim().length < 2}>
          <Plus size={15} /> Criar categoria
        </button>
      </form>

      <p className={proprios.dica}>
        Categoria com projetos não pode ser excluída: desative. Ela some dos formulários e os projetos antigos continuam iguais.
      </p>

      <ul className={`${styles.lista} cascata`} aria-label="Categorias">
        {lista.map((c) => (
          <li key={c.tipo_id} className={`${styles.linha} ${c.ativo ? '' : proprios.desativada}`}>
            <Tags size={20} className={styles.iconeRegistro} aria-hidden="true" />

            {editando === c.tipo_id ? (
              <div className={`${styles.info} ${proprios.edicao}`}>
                <label>
                  Nome
                  <input value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} maxLength={100} autoFocus />
                </label>
                <label>
                  Descrição
                  <input value={edicao.descricao} onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })} maxLength={300} />
                </label>
              </div>
            ) : (
              <div className={styles.info}>
                <strong>{c.tipo_nome}</strong>
                {c.tipo_desc && <span>{c.tipo_desc}</span>}
                <small>
                  {c.projetos} {c.projetos === 1 ? 'projeto' : 'projetos'} · {c.freelancers} {c.freelancers === 1 ? 'freelancer' : 'freelancers'}
                </small>
              </div>
            )}

            {!c.ativo && editando !== c.tipo_id && <span className={`${styles.etiqueta} ${styles.suspensa}`}>Desativada</span>}

            <div className={styles.acoes}>
              {editando === c.tipo_id ? (
                <>
                  <button type="button" className={`${styles.acao} ${styles.reativar}`} disabled={ocupado || edicao.nome.trim().length < 2} onClick={() => salvar(c)}>
                    <Check size={15} /> Salvar
                  </button>
                  <button type="button" className={styles.acao} onClick={() => setEditando(null)}>
                    <X size={15} /> Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.acao}
                    disabled={ocupado}
                    aria-label={`Editar ${c.tipo_nome}`}
                    onClick={() => {
                      setEditando(c.tipo_id)
                      setEdicao({ nome: c.tipo_nome, descricao: c.tipo_desc ?? '' })
                      setConfirmando(null)
                    }}
                  >
                    <Pencil size={15} /> Editar
                  </button>
                  <button type="button" className={`${styles.acao} ${c.ativo ? styles.suspender : styles.reativar}`} disabled={ocupado} onClick={() => alternarAtivo(c)}>
                    {c.ativo ? <EyeOff size={15} /> : <Eye size={15} />} {c.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                  {c.projetos === 0 && (
                    <button
                      type="button"
                      className={`${styles.acao} ${styles.banir} ${confirmando === c.tipo_id ? styles.confirmar : ''}`}
                      disabled={ocupado}
                      onClick={() => excluir(c)}
                      onBlur={() => setConfirmando((atual) => (atual === c.tipo_id ? null : atual))}
                    >
                      <Trash2 size={15} /> {confirmando === c.tipo_id ? 'Clique de novo para excluir' : 'Excluir'}
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
