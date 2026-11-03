import { useCallback, useEffect, useState } from 'react'
import { Flag, FolderOpen, UserRound, XCircle, PauseCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { formatarData } from '../../utils/formatar'
import styles from './Painel.module.css'

interface Denuncia {
  den_id: number
  den_alvo_tipo: 'servico' | 'usuario' | 'mensagem'
  den_alvo_id: number
  den_motivo: string
  den_detalhe: string | null
  den_data: string
  autor_nome: string
  serv_titulo: string | null
  serv_status: string | null
  alvo_usu_id: number | null
  alvo_nome: string | null
  alvo_status: string | null
  alvo_tipo_usuario: string | null
  /* Denúncia de mensagem do chat: o texto denunciado */
  msg_texto?: string | null
}

type Status = 'aberta' | 'resolvida' | 'descartada'

const MOTIVOS: Record<string, string> = {
  golpe: 'Golpe ou fraude',
  spam: 'Spam ou propaganda',
  ofensivo: 'Conteúdo ofensivo',
  falso: 'Informações falsas',
  outro: 'Outro motivo',
}

/* Várias pessoas denunciando a mesma coisa viram um item só */
function agrupar(lista: Denuncia[]) {
  const grupos = new Map<string, Denuncia[]>()
  for (const d of lista) {
    const chave = `${d.den_alvo_tipo}:${d.den_alvo_id}`
    grupos.set(chave, [...(grupos.get(chave) ?? []), d])
  }
  return [...grupos.values()]
}

/* Fila de denúncias dos admins: ver o que foi denunciado e agir (cancelar, suspender) ou descartar */
export default function DenunciasAdmin({ aoAgir }: { aoAgir: () => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<Status>('aberta')
  const [lista, setLista] = useState<Denuncia[] | null>(null)
  const [erro, setErro] = useState('')
  const [emAcao, setEmAcao] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const d = await api<{ denuncias: Denuncia[] }>(`/admin/denuncias?status=${status}`)
      setLista(d.denuncias)
      setErro('')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar as denúncias.')
    }
  }, [status])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  /* Age no alvo (opcional) e fecha todas as denúncias dele */
  async function agir(d: Denuncia, tipo: 'cancelar' | 'suspender' | 'resolver' | 'descartar') {
    setEmAcao(`${tipo}:${d.den_id}`)
    try {
      if (tipo === 'cancelar') await api(`/admin/servicos/${d.den_alvo_id}/cancelar`, { metodo: 'PUT' })
      if (tipo === 'suspender' && d.alvo_usu_id) await api(`/admin/usuarios/${d.alvo_usu_id}/status`, { metodo: 'PUT', corpo: { status: 'suspensa' } })
      const r = await api<{ mensagem: string }>(`/admin/denuncias/${d.den_id}`, { metodo: 'PUT', corpo: { acao: tipo === 'descartar' ? 'descartar' : 'resolver' } })
      toast.mostrar(tipo === 'cancelar' ? 'Projeto cancelado e denúncia resolvida.' : tipo === 'suspender' ? 'Conta suspensa e denúncia resolvida.' : r.mensagem, 'sucesso')
      await carregar()
      aoAgir()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível concluir a ação.', 'erro')
    } finally {
      setEmAcao(null)
    }
  }

  const botao = (d: Denuncia, tipo: Parameters<typeof agir>[1], rotulo: string, icone: React.ReactNode, classe = '') => (
    <button type="button" className={`${styles.acao} ${classe}`} disabled={emAcao !== null} onClick={() => agir(d, tipo)}>
      {emAcao === `${tipo}:${d.den_id}` ? <span className="spinner" /> : icone} {rotulo}
    </button>
  )

  return (
    <div>
      <div className={styles.subAbas} role="tablist" aria-label="Situação das denúncias">
        {(['aberta', 'resolvida', 'descartada'] as Status[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={status === s ? styles.subAbaAtiva : ''} onClick={() => { setLista(null); setStatus(s) }}>
            {s === 'aberta' ? 'Abertas' : s === 'resolvida' ? 'Resolvidas' : 'Descartadas'}
          </button>
        ))}
      </div>

      {erro ? (
        <EstadoErro mensagem={erro} />
      ) : !lista ? (
        <Carregando variante="lista" />
      ) : lista.length === 0 ? (
        <p className={`${styles.vazio} placa`}>{status === 'aberta' ? 'Nenhuma denúncia esperando. Tudo em ordem!' : 'Nada por aqui.'}</p>
      ) : (
        <ul className={`${styles.lista} cascata`}>
          {agrupar(lista).map((grupo) => {
            const d = grupo[0]
            const projeto = d.den_alvo_tipo === 'servico'
            return (
              <li key={`${d.den_alvo_tipo}:${d.den_alvo_id}`} className={`${styles.linha} ${styles.linhaDenuncia} ${status === 'aberta' ? styles.linhaSeria : ''}`}>
                {projeto ? <FolderOpen size={20} className={styles.iconeRegistro} /> : <UserRound size={20} className={styles.iconeRegistro} />}
                <div className={styles.info}>
                  <strong>
                    {projeto ? `Projeto "${d.serv_titulo ?? 'removido'}"` : d.den_alvo_tipo === 'mensagem' ? `Mensagem de ${d.alvo_nome ?? 'conta removida'}` : `Perfil de ${d.alvo_nome ?? 'conta removida'}`}
                    {grupo.length > 1 && <span className={styles.contagemDenuncia}><Flag size={12} /> {grupo.length} denúncias</span>}
                  </strong>
                  {projeto && d.alvo_nome && <span>de {d.alvo_nome}{d.serv_status ? ` · ${d.serv_status}` : ''}</span>}
                  {d.den_alvo_tipo === 'mensagem' && d.msg_texto && <span className={styles.mensagemDenunciada}>“{d.msg_texto}”</span>}
                  {grupo.map((g) => (
                    <small key={g.den_id}>
                      {MOTIVOS[g.den_motivo] ?? g.den_motivo} · por {g.autor_nome} em {formatarData(g.den_data)}
                      {g.den_detalhe ? ` — "${g.den_detalhe}"` : ''}
                    </small>
                  ))}
                </div>
                {status === 'aberta' && (
                  <div className={styles.acoes}>
                    {projeto && d.serv_status !== 'cancelado' && d.serv_status !== 'finalizado' && botao(d, 'cancelar', 'Cancelar projeto', <XCircle size={15} />, styles.banir)}
                    {d.alvo_usu_id && d.alvo_status === 'ativa' && d.alvo_tipo_usuario !== 'administrador' &&
                      botao(d, 'suspender', projeto ? 'Suspender autor' : 'Suspender conta', <PauseCircle size={15} />, styles.suspender)}
                    {botao(d, 'resolver', 'Resolvida', <CheckCircle2 size={15} />, styles.reativar)}
                    {botao(d, 'descartar', 'Descartar', <Trash2 size={15} />)}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
