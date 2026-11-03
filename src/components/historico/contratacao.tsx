import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSignature, ShieldCheck, Wallet, Wrench, Scale, Award, BookImage, Repeat, Check, Send, CircleAlert, Gift, ReceiptText } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarMoeda, formatarData } from '../../utils/formatar'
import styles from './contratacao.module.css'

/* O que o histórico manda sobre o depois da contratação (campos novos podem faltar num servidor antigo) */
export interface DadosContratacao {
  serv_id: number
  serv_titulo: string
  serv_desc: string
  serv_status: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_entregue_em: string | null
  outro_usu_id: number | null
  outro_nome: string | null
  serv_acordo_cont_em?: string | null
  serv_acordo_free_em?: string | null
  serv_garantia_valor?: number | string | null
  serv_garantia_em?: string | null
  serv_garantia_liberada_em?: string | null
  serv_garantia_estornada_em?: string | null
  serv_revisoes?: number
  serv_revisao_nota?: string | null
  disputa?: { motivo: string; data: string } | null
  nota_recebida?: number | null
  no_portfolio?: boolean
  /* Bônus no fim (servidor antigo não manda) */
  serv_bonus_valor?: number | string | null
  serv_bonus_em?: string | null
  /* Etapas já pagas saem do que está guardado */
  etapas?: { eta_liberado_valor?: number | null }[]
}

interface Props {
  item: DadosContratacao
  papel: 'freelancer' | 'contratante'
  /* Recarrega o histórico depois de uma ação */
  aoMudar: () => void
}

const LIMITE_REVISOES = 3

const MOTIVOS = [
  ['nao_entregou', 'O trabalho não foi entregue'],
  ['entrega_incompleta', 'A entrega veio incompleta'],
  ['nao_aprova', 'O contratante não aprova a entrega'],
  ['pagamento', 'Problema com o pagamento'],
  ['comunicacao', 'A outra pessoa sumiu'],
  ['outro', 'Outro motivo'],
] as const

type Aberto = 'ajustes' | 'disputa' | 'portfolio' | 'garantia' | 'bonus' | null

const BONUS_MAXIMO = 5000

/*
 * Tudo o que vem depois da contratação, dentro do cartão do histórico:
 * termo de acordo, pagamento guardado na garantia (simulação), ajustes, disputa,
 * e no fim certificado, portfólio e "trabalhar de novo".
 */
export default function PainelContratacao({ item, papel, aoMudar }: Props) {
  const toast = useToast()
  const [aberto, setAberto] = useState<Aberto>(null)
  const [ocupado, setOcupado] = useState(false)
  const [nota, setNota] = useState('')
  const [motivo, setMotivo] = useState('')
  const [detalhe, setDetalhe] = useState('')
  const [valor, setValor] = useState(String(item.serv_valor))
  const [titulo, setTitulo] = useState(item.serv_titulo)
  const [descricao, setDescricao] = useState(item.serv_desc)
  const [bonus, setBonus] = useState('50')
  const [recado, setRecado] = useState('')

  const ehContratante = papel === 'contratante'
  const emAndamento = item.serv_status === 'em_andamento'
  const finalizado = item.serv_status === 'finalizado'
  const temAcordo = item.serv_acordo_cont_em !== undefined
  const garantia = item.serv_garantia_valor === null || item.serv_garantia_valor === undefined ? null : Number(item.serv_garantia_valor)
  const pagoEmEtapas = (item.etapas ?? []).reduce((t, e) => t + (Number(e.eta_liberado_valor) || 0), 0)
  const guardado = garantia === null ? null : Math.max(0, Math.round((garantia - pagoEmEtapas) * 100) / 100)
  const textoEtapas = pagoEmEtapas > 0 ? ` (${formatarMoeda(pagoEmEtapas)} já pagos por etapa)` : ''
  const revisoes = item.serv_revisoes ?? 0
  const temBonus = item.serv_bonus_valor !== undefined
  const bonusDado = item.serv_bonus_valor === null || item.serv_bonus_valor === undefined ? null : Number(item.serv_bonus_valor)
  const outro = item.outro_nome?.split(' ')[0] ?? (ehContratante ? 'o freelancer' : 'o contratante')

  if (!emAndamento && !finalizado) return null
  if (!item.outro_usu_id) return null

  async function chamar(caminho: string, metodo: 'POST' | 'PUT', corpo?: object) {
    setOcupado(true)
    try {
      const dados = await api<{ mensagem: string }>(caminho, { metodo, corpo })
      toast.mostrar(dados.mensagem)
      setAberto(null)
      aoMudar()
      return true
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível concluir agora.', 'erro')
      return false
    } finally {
      setOcupado(false)
    }
  }

  const alternar = (qual: Exclude<Aberto, null>) => setAberto((a) => (a === qual ? null : qual))

  /* ---------- Linhas de situação ---------- */

  const assinouEu = ehContratante ? item.serv_acordo_cont_em : item.serv_acordo_free_em
  const assinouOutro = ehContratante ? item.serv_acordo_free_em : item.serv_acordo_cont_em

  return (
    <section className={styles.painel} aria-label="Acordo e pagamento">
      <ul className={styles.linhas}>
        {temAcordo && (emAndamento || assinouEu || assinouOutro) && (
          <li className={assinouEu && assinouOutro ? styles.ok : styles.pendente}>
            <FileSignature size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>
              <strong>Termo de acordo:</strong>{' '}
              {assinouEu && assinouOutro
                ? `assinado pelos dois em ${formatarData(assinouEu > assinouOutro ? assinouEu : assinouOutro)}`
                : assinouEu
                  ? `você já concordou; falta ${outro}`
                  : assinouOutro
                    ? `${outro} já concordou; falta você`
                    : 'ninguém concordou ainda'}
            </span>
            <Link to={`/${papel}/acordo/${item.serv_id}`} className={styles.link} viewTransition>
              {assinouEu || !emAndamento ? 'Ver acordo' : 'Ler e concordar'}
            </Link>
          </li>
        )}

        {temAcordo && (emAndamento || garantia !== null) && (
          <li className={garantia !== null ? styles.ok : styles.pendente}>
            <ShieldCheck size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>
              <strong>Pagamento:</strong>{' '}
              {item.serv_garantia_liberada_em
                ? `${formatarMoeda(garantia ?? 0)} pagos ao freelancer em ${formatarData(item.serv_garantia_liberada_em)}`
                : item.serv_garantia_estornada_em
                  ? `${formatarMoeda(garantia ?? 0)} devolvidos ao contratante`
                  : garantia !== null && guardado !== null
                    ? ehContratante
                      ? `${formatarMoeda(guardado)} guardados na garantia${textoEtapas}; vão para ${outro} quando você finalizar`
                      : `${formatarMoeda(guardado)} guardados na garantia${textoEtapas}; caem na sua carteira quando o projeto for finalizado`
                    : ehContratante
                      ? 'ainda não guardado na garantia'
                      : `${outro} ainda não guardou o pagamento na garantia`}
              <em className={styles.simulacao}>simulação</em>
            </span>
            <Link to={`/${papel}/carteira`} className={styles.link} viewTransition>
              <Wallet size={13} strokeWidth={2.4} /> Carteira
            </Link>
          </li>
        )}

        {emAndamento && item.serv_revisao_nota && !item.serv_entregue_em && (
          <li className={styles.aviso}>
            <Wrench size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>
              <strong>Ajustes pedidos ({revisoes} de {LIMITE_REVISOES}):</strong> {item.serv_revisao_nota}
            </span>
          </li>
        )}

        {finalizado && bonusDado !== null && (
          <li className={styles.ok}>
            <Gift size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>
              <strong>Bônus:</strong> {ehContratante ? `você mandou ${formatarMoeda(bonusDado)} para ${outro}` : `${outro} mandou ${formatarMoeda(bonusDado)} de bônus`}
              {item.serv_bonus_em ? ` em ${formatarData(item.serv_bonus_em)}` : ''}
              <em className={styles.simulacao}>simulação</em>
            </span>
          </li>
        )}

        {item.disputa && (
          <li className={styles.perigo}>
            <Scale size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>
              <strong>Disputa em análise:</strong> {item.disputa.motivo}. A administração vai responder aos dois.
            </span>
          </li>
        )}
      </ul>

      {/* ---------- Ações ---------- */}
      <div className={styles.acoes}>
        {emAndamento && ehContratante && temAcordo && garantia === null && (
          <button type="button" className={styles.botaoOuro} onClick={() => alternar('garantia')} aria-expanded={aberto === 'garantia'}>
            <ShieldCheck size={14} strokeWidth={2.4} /> Guardar pagamento
          </button>
        )}
        {emAndamento && ehContratante && item.serv_entregue_em && temAcordo && revisoes < LIMITE_REVISOES && (
          <button type="button" className={styles.botao} onClick={() => alternar('ajustes')} aria-expanded={aberto === 'ajustes'}>
            <Wrench size={14} strokeWidth={2.4} /> Pedir ajustes
          </button>
        )}
        {emAndamento && temAcordo && !item.disputa && (
          <button type="button" className={styles.botaoDiscreto} onClick={() => alternar('disputa')} aria-expanded={aberto === 'disputa'}>
            <Scale size={14} strokeWidth={2.4} /> Abrir disputa
          </button>
        )}
        {finalizado && ehContratante && temBonus && bonusDado === null && (
          <button type="button" className={styles.botao} onClick={() => alternar('bonus')} aria-expanded={aberto === 'bonus'}>
            <Gift size={14} strokeWidth={2.4} /> Dar bônus
          </button>
        )}
        {finalizado && (
          <Link to={`/${papel}/recibo/${item.serv_id}`} className={styles.botao} viewTransition>
            <ReceiptText size={14} strokeWidth={2.4} /> Recibo
          </Link>
        )}
        {finalizado && !ehContratante && (
          <Link to={`/certificado/${item.serv_id}`} className={styles.botao} target="_blank" rel="noreferrer">
            <Award size={14} strokeWidth={2.4} /> Certificado
          </Link>
        )}
        {finalizado && !ehContratante && item.no_portfolio !== undefined && (
          item.no_portfolio ? (
            <span className={styles.feito}>
              <Check size={14} strokeWidth={2.6} /> No seu portfólio
            </span>
          ) : (
            <button type="button" className={styles.botao} onClick={() => alternar('portfolio')} aria-expanded={aberto === 'portfolio'}>
              <BookImage size={14} strokeWidth={2.4} /> Mostrar no portfólio
            </button>
          )
        )}
        {finalizado && ehContratante && (
          <Link
            to={`/contratante/criar-projeto?baseado=${item.serv_id}&convidar=${item.outro_usu_id}&nome=${encodeURIComponent(item.outro_nome ?? '')}`}
            className={styles.botaoOuro}
            viewTransition
          >
            <Repeat size={14} strokeWidth={2.4} /> Trabalhar de novo com {outro}
          </Link>
        )}
      </div>

      {/* ---------- Formulários ---------- */}
      {aberto === 'garantia' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            chamar(`/servicos/${item.serv_id}/garantia`, 'POST', { valor: Number(valor) })
          }}
        >
          <p className={styles.explica}>
            <CircleAlert size={15} strokeWidth={2.2} aria-hidden="true" />
            Simulação para o TCC: nenhum dinheiro de verdade é cobrado. O valor sai do seu saldo fictício, fica guardado e só vai
            para {outro} quando você finalizar o projeto.
          </p>
          <label htmlFor={`garantia-${item.serv_id}`}>
            {item.serv_tipo_valor === 'hora' ? 'Total combinado (o projeto é por hora)' : 'Valor a guardar'}
          </label>
          <div className={styles.linhaForm}>
            <input id={`garantia-${item.serv_id}`} type="number" min={1} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
            <button type="submit" className={styles.botaoOuro} disabled={ocupado}>
              {ocupado ? <span className="spinner" /> : <ShieldCheck size={14} strokeWidth={2.4} />} Guardar {Number(valor) > 0 ? formatarMoeda(Number(valor)) : ''}
            </button>
          </div>
        </form>
      )}

      {aberto === 'bonus' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            chamar(`/servicos/${item.serv_id}/bonus`, 'POST', { valor: Number(bonus), recado })
          }}
        >
          <p className={styles.explica}>
            <Gift size={15} strokeWidth={2.2} aria-hidden="true" />
            Gostou do trabalho? Um bônus é um agradecimento a mais para {outro}, além do combinado. Simulação: sai do seu saldo fictício.
          </p>
          <label htmlFor={`bonus-${item.serv_id}`}>Valor do bônus</label>
          <div className={styles.linhaForm}>
            {[20, 50, 100].map((v) => (
              <button key={v} type="button" className={Number(bonus) === v ? styles.botaoOuro : styles.botao} onClick={() => setBonus(String(v))} aria-pressed={Number(bonus) === v}>
                {formatarMoeda(v)}
              </button>
            ))}
            <input id={`bonus-${item.serv_id}`} type="number" min={1} max={BONUS_MAXIMO} step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} required />
          </div>
          <label htmlFor={`recado-bonus-${item.serv_id}`}>Recado (opcional)</label>
          <input id={`recado-bonus-${item.serv_id}`} value={recado} maxLength={200} onChange={(e) => setRecado(e.target.value)} placeholder="Ex.: Entregou antes do prazo, muito obrigado!" />
          <div className={styles.rodapeForm}>
            <button type="button" className={styles.botaoDiscreto} onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className={styles.botaoOuro} disabled={ocupado || !(Number(bonus) >= 1) || Number(bonus) > BONUS_MAXIMO}>
              {ocupado ? <span className="spinner" /> : <Gift size={14} strokeWidth={2.4} />} Mandar {Number(bonus) >= 1 ? formatarMoeda(Number(bonus)) : 'bônus'}
            </button>
          </div>
        </form>
      )}

      {aberto === 'ajustes' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            chamar(`/servicos/${item.serv_id}/ajustes`, 'PUT', { nota }).then((ok) => ok && setNota(''))
          }}
        >
          <label htmlFor={`ajustes-${item.serv_id}`}>
            O que precisa mudar? ({LIMITE_REVISOES - revisoes} {LIMITE_REVISOES - revisoes === 1 ? 'pedido restante' : 'pedidos restantes'})
          </label>
          <textarea id={`ajustes-${item.serv_id}`} rows={3} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: Trocar a cor do botão e aumentar o logo no celular." required />
          <div className={styles.rodapeForm}>
            <span className={styles.contador}>{nota.length}/500</span>
            <button type="button" className={styles.botaoDiscreto} onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className={styles.botaoOuro} disabled={ocupado || nota.trim().length < 5}>
              {ocupado ? <span className="spinner" /> : <Send size={14} strokeWidth={2.4} />} Enviar pedido
            </button>
          </div>
        </form>
      )}

      {aberto === 'disputa' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            chamar(`/servicos/${item.serv_id}/disputa`, 'POST', { motivo, detalhe }).then((ok) => ok && setDetalhe(''))
          }}
        >
          <p className={styles.explica}>
            <Scale size={15} strokeWidth={2.2} aria-hidden="true" />
            Use quando a conversa não resolveu. A administração lê os dois lados e decide: finalizar, cancelar e devolver o
            pagamento, ou só encerrar com um recado.
          </p>
          <label htmlFor={`motivo-${item.serv_id}`}>Motivo</label>
          <select id={`motivo-${item.serv_id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
            <option value="">Escolha...</option>
            {MOTIVOS.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
          <label htmlFor={`detalhe-${item.serv_id}`}>O que aconteceu?</label>
          <textarea id={`detalhe-${item.serv_id}`} rows={3} maxLength={1000} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} required />
          <div className={styles.rodapeForm}>
            <span className={styles.contador}>{detalhe.length}/1000</span>
            <button type="button" className={styles.botaoDiscreto} onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className={styles.botaoPerigo} disabled={ocupado || !motivo || detalhe.trim().length < 10}>
              {ocupado ? <span className="spinner" /> : <Scale size={14} strokeWidth={2.4} />} Abrir disputa
            </button>
          </div>
        </form>
      )}

      {aberto === 'portfolio' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            chamar(`/portfolio/de-projeto/${item.serv_id}`, 'POST', { port_titulo: titulo, port_desc: descricao })
          }}
        >
          <p className={styles.explica}>
            <BookImage size={15} strokeWidth={2.2} aria-hidden="true" />
            {item.nota_recebida
              ? `A avaliação do cliente (${item.nota_recebida} de 5) entra junto, no fim da descrição.`
              : 'Quando o cliente avaliar, a nota não entra sozinha: dá para editar o trabalho depois no seu perfil.'}
          </p>
          <label htmlFor={`port-titulo-${item.serv_id}`}>Título</label>
          <input id={`port-titulo-${item.serv_id}`} value={titulo} maxLength={150} onChange={(e) => setTitulo(e.target.value)} required />
          <label htmlFor={`port-desc-${item.serv_id}`}>Descrição</label>
          <textarea id={`port-desc-${item.serv_id}`} rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          <div className={styles.rodapeForm}>
            <button type="button" className={styles.botaoDiscreto} onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className={styles.botaoOuro} disabled={ocupado || !titulo.trim() || !descricao.trim()}>
              {ocupado ? <span className="spinner" /> : <BookImage size={14} strokeWidth={2.4} />} Adicionar ao portfólio
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
