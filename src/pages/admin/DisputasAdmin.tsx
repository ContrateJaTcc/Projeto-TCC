import { useCallback, useEffect, useState } from 'react'
import { Scale, UserRound, ShieldCheck, CircleCheckBig, XCircle, MessageSquareText } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { formatarData, formatarMoeda } from '../../utils/formatar'
import styles from './Painel.module.css'

interface Disputa {
  dis_id: number
  serv_id: number
  dis_motivo: string
  motivo_texto: string
  dis_detalhe: string
  dis_data: string
  dis_decisao: string | null
  dis_resposta: string | null
  dis_resolvida_em: string | null
  autor_nome: string
  serv_titulo: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_status: string
  serv_entregue_em: string | null
  serv_revisoes: number
  serv_garantia_valor: number | null
  serv_garantia_liberada_em: string | null
  serv_garantia_estornada_em: string | null
  contratante_nome: string
  freelancer_nome: string | null
}

type Decisao = 'freelancer' | 'contratante' | 'acordo'

const DECISOES: { valor: Decisao; rotulo: string; dica: string; icone: typeof Scale; classe: string }[] = [
  { valor: 'freelancer', rotulo: 'A favor do freelancer', dica: 'Finaliza o projeto: XP e pagamento guardado vão para o freelancer.', icone: CircleCheckBig, classe: styles.reativar },
  { valor: 'contratante', rotulo: 'A favor do contratante', dica: 'Cancela o projeto e devolve o pagamento guardado ao contratante.', icone: XCircle, classe: styles.banir },
  { valor: 'acordo', rotulo: 'Encerrar sem mudar o projeto', dica: 'Os dois combinaram entre si: só fecha a disputa com o recado.', icone: MessageSquareText, classe: '' },
]

const ROTULO_DECISAO: Record<string, string> = { freelancer: 'a favor do freelancer', contratante: 'a favor do contratante', acordo: 'encerrada sem mudar o projeto' }

/* Fila de disputas: contratante e freelancer que não se entenderam; o admin lê os dois lados e decide */
export default function DisputasAdmin({ aoAgir }: { aoAgir: () => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<'aberta' | 'resolvida'>('aberta')
  const [lista, setLista] = useState<Disputa[] | null>(null)
  const [erro, setErro] = useState('')
  const [abertaId, setAbertaId] = useState<number | null>(null)
  const [decisao, setDecisao] = useState<Decisao | ''>('')
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await api<{ disputas: Disputa[] }>(`/admin/disputas?status=${status}`)
      setLista(d.disputas)
      setErro('')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar as disputas.')
    }
  }, [status])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function resolver(d: Disputa) {
    if (!decisao) return
    setEnviando(true)
    try {
      const r = await api<{ mensagem: string }>(`/admin/disputas/${d.dis_id}`, { metodo: 'PUT', corpo: { decisao, resposta } })
      toast.mostrar(r.mensagem, 'sucesso')
      setAbertaId(null)
      setDecisao('')
      setResposta('')
      await carregar()
      aoAgir()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível resolver.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <div className={styles.subAbas} role="tablist" aria-label="Situação das disputas">
        {(['aberta', 'resolvida'] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={status === s ? styles.subAbaAtiva : ''} onClick={() => { setLista(null); setStatus(s) }}>
            {s === 'aberta' ? 'Abertas' : 'Resolvidas'}
          </button>
        ))}
      </div>

      {erro ? (
        <EstadoErro mensagem={erro} />
      ) : !lista ? (
        <Carregando variante="lista" />
      ) : lista.length === 0 ? (
        <p className={`${styles.vazio} placa`}>{status === 'aberta' ? 'Nenhuma disputa esperando. Todo mundo se entendendo!' : 'Nada por aqui.'}</p>
      ) : (
        <ul className={`${styles.lista} cascata`}>
          {lista.map((d) => (
            <li key={d.dis_id} className={`${styles.linha} ${styles.linhaDenuncia} ${status === 'aberta' ? styles.linhaSeria : ''}`}>
              <Scale size={20} className={styles.iconeRegistro} />
              <div className={styles.info}>
                <strong>Projeto "{d.serv_titulo}"</strong>
                <span>
                  <UserRound size={12} /> {d.contratante_nome} (contratante) × {d.freelancer_nome ?? '—'} (freelancer)
                </span>
                <small>
                  {d.motivo_texto} · aberta por {d.autor_nome} em {formatarData(d.dis_data)} — "{d.dis_detalhe}"
                </small>
                <small>
                  <ShieldCheck size={12} />{' '}
                  {d.serv_garantia_valor !== null ? `${formatarMoeda(d.serv_garantia_valor)} guardados na garantia` : 'Pagamento não guardado'}
                  {' · '}
                  {d.serv_entregue_em ? `entregue em ${formatarData(d.serv_entregue_em)}` : 'sem entrega marcada'}
                  {d.serv_revisoes ? ` · ${d.serv_revisoes} ${d.serv_revisoes === 1 ? 'pedido' : 'pedidos'} de ajuste` : ''}
                  {` · projeto ${d.serv_status.replace('_', ' ')}`}
                </small>
                {d.dis_resposta && (
                  <small>
                    <b>Decisão ({ROTULO_DECISAO[d.dis_decisao ?? ''] ?? d.dis_decisao}):</b> {d.dis_resposta}
                  </small>
                )}

                {abertaId === d.dis_id && (
                  <form className={styles.formDisputa} onSubmit={(e) => { e.preventDefault(); resolver(d) }}>
                    <fieldset>
                      <legend>Decisão</legend>
                      {DECISOES.map((op) => (
                        <label key={op.valor} className={decisao === op.valor ? styles.opcaoDisputaAtiva : ''}>
                          <input type="radio" name={`decisao-${d.dis_id}`} value={op.valor} checked={decisao === op.valor} onChange={() => setDecisao(op.valor)} />
                          <span><b>{op.rotulo}</b>{op.dica}</span>
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      Recado para os dois
                      <textarea rows={2} maxLength={500} value={resposta} onChange={(e) => setResposta(e.target.value)} required placeholder="Ex.: Pelas mensagens, a entrega foi feita como combinado." />
                    </label>
                    <div className={styles.acoes}>
                      <button type="button" className={styles.acao} onClick={() => setAbertaId(null)}>Cancelar</button>
                      <button type="submit" className={`${styles.acao} ${styles.reativar}`} disabled={!decisao || resposta.trim().length < 5 || enviando}>
                        {enviando ? <span className="spinner" /> : <Scale size={15} />} Resolver disputa
                      </button>
                    </div>
                  </form>
                )}
              </div>
              {status === 'aberta' && abertaId !== d.dis_id && (
                <div className={styles.acoes}>
                  <button type="button" className={`${styles.acao} ${styles.suspender}`} onClick={() => { setAbertaId(d.dis_id); setDecisao(''); setResposta('') }}>
                    <Scale size={15} /> Decidir
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
