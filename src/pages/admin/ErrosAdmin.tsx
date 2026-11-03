import { useCallback, useEffect, useState } from 'react'
import { Bug, Globe, Server, CheckCircle2, Trash2 } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { haQuanto } from '../../utils/formatar'
import styles from './Painel.module.css'

interface Registro {
  err_id: number
  err_origem: 'site' | 'servidor'
  err_mensagem: string
  err_local: string | null
  err_total: number
  err_primeira: string
  err_ultima: string
}

/* Monitor de erros: o que quebrou no site (no navegador das pessoas) e no servidor, agrupado e contado */
export default function ErrosAdmin() {
  const toast = useToast()
  const [lista, setLista] = useState<Registro[] | null>(null)
  const [erro, setErro] = useState('')
  const [origem, setOrigem] = useState<'todos' | 'site' | 'servidor'>('todos')

  const carregar = useCallback(async () => {
    try {
      setLista((await api<{ erros: Registro[] }>('/admin/erros')).erros)
      setErro('')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os erros.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function limpar(id?: number) {
    try {
      const r = await api<{ mensagem: string }>(id ? `/admin/erros/${id}` : '/admin/erros', { metodo: 'DELETE' })
      toast.mostrar(r.mensagem, 'sucesso')
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível limpar.', 'erro')
    }
  }

  if (erro) return <EstadoErro mensagem={erro} />
  if (!lista) return <Carregando variante="lista" />

  const visiveis = lista.filter((e) => origem === 'todos' || e.err_origem === origem)
  const total = visiveis.reduce((s, e) => s + e.err_total, 0)

  return (
    <div>
      <div className={styles.subAbas} role="tablist" aria-label="Onde aconteceu">
        {(['todos', 'site', 'servidor'] as const).map((o) => (
          <button key={o} type="button" role="tab" aria-selected={origem === o} className={origem === o ? styles.subAbaAtiva : ''} onClick={() => setOrigem(o)}>
            {o === 'todos' ? 'Todos' : o === 'site' ? 'Site' : 'Servidor'}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className={`${styles.vazio} placa`}>Nenhum erro registrado. Tudo funcionando!</p>
      ) : (
        <>
          <p className={`${styles.vazio} placa`}>
            {visiveis.length} {visiveis.length === 1 ? 'tipo de erro' : 'tipos de erro'}, {total} {total === 1 ? 'vez' : 'vezes'} no total.{' '}
            <button type="button" className={styles.acao} onClick={() => limpar()}><Trash2 size={14} /> Limpar a lista</button>
          </p>
          <ul className={`${styles.lista} cascata`}>
            {visiveis.map((e) => (
              <li key={e.err_id} className={`${styles.linha} ${styles.linhaDenuncia} ${e.err_total >= 10 ? styles.linhaSeria : ''}`}>
                <Bug size={20} className={styles.iconeRegistro} />
                <div className={styles.info}>
                  <strong className={styles.mensagemErro}>{e.err_mensagem}</strong>
                  <span>
                    {e.err_origem === 'site' ? <Globe size={13} aria-hidden="true" /> : <Server size={13} aria-hidden="true" />}{' '}
                    {e.err_origem === 'site' ? 'Site' : 'Servidor'}
                    {e.err_local ? ` · ${e.err_local}` : ''}
                  </span>
                  <small>
                    {e.err_total} {e.err_total === 1 ? 'vez' : 'vezes'} · última {haQuanto(e.err_ultima)} · primeira {haQuanto(e.err_primeira)}
                  </small>
                </div>
                <div className={styles.acoes}>
                  <button type="button" className={`${styles.acao} ${styles.reativar}`} onClick={() => limpar(e.err_id)}>
                    <CheckCircle2 size={15} /> Resolvido
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
