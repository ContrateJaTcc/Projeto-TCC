import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { formatarData, formatarValorServico } from '../../utils/formatar'
import styles from './Painel.module.css'

interface EmRevisao {
  serv_id: number
  serv_titulo: string
  serv_desc: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_moderacao_motivo: string | null
  serv_data_criacao: string
  tipo_nome: string
  usu_nome: string
}

/* Fila do filtro automático de spam: aprovar publica; recusar avisa o contratante com o motivo */
export default function ModeracaoAdmin({ aoAgir }: { aoAgir: () => void }) {
  const toast = useToast()
  const [lista, setLista] = useState<EmRevisao[] | null>(null)
  const [erro, setErro] = useState('')
  const [recusando, setRecusando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [emAcao, setEmAcao] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    try {
      setLista((await api<{ projetos: EmRevisao[] }>('/admin/moderacao')).projetos)
      setErro('')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar a fila de revisão.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function decidir(p: EmRevisao, acao: 'aprovar' | 'recusar') {
    setEmAcao(p.serv_id)
    try {
      const r = await api<{ mensagem: string }>(`/admin/moderacao/${p.serv_id}`, { metodo: 'PUT', corpo: { acao, motivo } })
      toast.mostrar(r.mensagem, 'sucesso')
      setRecusando(null)
      setMotivo('')
      await carregar()
      aoAgir()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível decidir.', 'erro')
    } finally {
      setEmAcao(null)
    }
  }

  if (erro) return <EstadoErro mensagem={erro} />
  if (!lista) return <Carregando variante="lista" />
  if (!lista.length) return <p className={`${styles.vazio} placa`}>Nenhum projeto esperando revisão. O filtro não pegou nada suspeito.</p>

  return (
    <ul className={`${styles.lista} cascata`}>
      {lista.map((p) => (
        <li key={p.serv_id} className={`${styles.linha} ${styles.linhaDenuncia} ${styles.linhaSeria}`}>
          <ShieldAlert size={20} className={styles.iconeRegistro} />
          <div className={styles.info}>
            <strong>"{p.serv_titulo}"</strong>
            <span>de {p.usu_nome} · {p.tipo_nome} · {formatarValorServico(p.serv_valor, p.serv_tipo_valor)} · {formatarData(p.serv_data_criacao)}</span>
            <small>{p.serv_desc}</small>
            {p.serv_moderacao_motivo && <small><strong>Por que caiu no filtro:</strong> {p.serv_moderacao_motivo}</small>}
            {recusando === p.serv_id && (
              <label className={styles.motivoRecusa}>
                Motivo para o contratante
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ex.: promessa de ganho fácil não é permitida" autoFocus />
              </label>
            )}
          </div>
          <div className={styles.acoes}>
            {recusando === p.serv_id ? (
              <>
                <button type="button" className={`${styles.acao} ${styles.banir}`} disabled={emAcao !== null || motivo.trim().length < 5} onClick={() => decidir(p, 'recusar')}>
                  <XCircle size={15} /> Confirmar recusa
                </button>
                <button type="button" className={styles.acao} onClick={() => { setRecusando(null); setMotivo('') }}>Cancelar</button>
              </>
            ) : (
              <>
                <button type="button" className={`${styles.acao} ${styles.reativar}`} disabled={emAcao !== null} onClick={() => decidir(p, 'aprovar')}>
                  <CheckCircle2 size={15} /> Aprovar e publicar
                </button>
                <button type="button" className={`${styles.acao} ${styles.banir}`} disabled={emAcao !== null} onClick={() => setRecusando(p.serv_id)}>
                  <XCircle size={15} /> Recusar
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
