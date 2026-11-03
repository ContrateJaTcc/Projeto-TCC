import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, CircleCheckBig, Star, MessageCircle, Send, ArrowRight, CalendarDays, UserRound, Search, AlarmClock } from 'lucide-react'
import { CategoryIcon } from '../data/categoryIcons'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { formatarValorServico, formatarData } from '../utils/formatar'
import { comemorar } from '../utils/preferencias'
import { avisarAvaliacoesMudaram } from '../utils/avaliacoespendentes'
import type { AvaliacaoPendente } from '../components/gamificacao/tipos'
import Ilustracao from '../components/ilustracao/ilustracao'
import LinhaDoTempo from '../components/historico/linhadotempo'
import Etapas, { type Etapa } from '../components/historico/etapas'
import PainelContratacao, { type DadosContratacao } from '../components/historico/contratacao'
import PausaPrazo, { type DadosPausa } from '../components/historico/pausa'
import { CriteriosAceite, HorasTrabalhadas, RepetirProjeto, VersoesEntrega } from '../components/historico/trabalho'
import styles from './Historico.module.css'

interface ItemHistorico extends DadosContratacao, DadosPausa {
  serv_id: number
  serv_titulo: string
  serv_desc: string
  categoria: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_status: string
  serv_data_criacao: string
  /* Outra ponta */
  outro_usu_id: number | null
  outro_nome: string | null
  /* Entrega */
  serv_entregue_em: string | null
  serv_entrega_nota: string | null
  /* Linha do tempo e etapas */
  serv_contratado_em?: string | null
  serv_finalizado_em?: string | null
  serv_qtd_dias?: number | null
  etapas?: Etapa[]
  /* Projeto recorrente (servidor antigo não manda) */
  serv_repetir?: boolean
  serv_repetir_em?: string | null
  serv_amostra_de?: number | null
}

/* Abas do histórico */
const FILTROS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'finalizado', rotulo: 'Concluídos' },
  { valor: 'cancelado', rotulo: 'Cancelados' },
] as const

type Filtro = (typeof FILTROS)[number]['valor']

/* Prazo do trabalho em andamento: contratação + dias combinados */
function prazoDoTrabalho(item: ItemHistorico) {
  if (item.serv_status !== 'em_andamento' || item.serv_entregue_em || !item.serv_contratado_em || !item.serv_qtd_dias) return null
  const fim = new Date(item.serv_contratado_em)
  fim.setDate(fim.getDate() + item.serv_qtd_dias)
  const dias = Math.ceil((fim.getTime() - Date.now()) / 86_400_000)
  const data = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (dias < 0) return { texto: `Prazo vencido em ${data}`, nivel: 'atrasado' as const }
  const falta = dias === 0 ? 'vence hoje' : dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`
  return { texto: `Prazo: ${data} · ${falta}`, nivel: dias <= 2 ? ('perto' as const) : ('ok' as const) }
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const LIMITE_NOTA = 280

interface HistoricoProps {
  apenasEntregues?: boolean
}

/* Cor do selo de status */
const CLASSE_STATUS: Record<string, string> = {
  em_andamento: styles.andamento,
  finalizado: styles.concluido,
  cancelado: styles.cancelado,
}

const ROTULO_STATUS: Record<string, string> = {
  em_andamento: 'Em andamento',
  finalizado: 'Concluído',
  cancelado: 'Cancelado',
}

export default function Historico({ apenasEntregues = false }: HistoricoProps) {
  const { role } = useRole()
  const ehContratante = role === 'contratante'

  const [itens, setItens] = useState<ItemHistorico[]>([])
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const toast = useToast()

  /* Confirmação */
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [finalizando, setFinalizando] = useState<number | null>(null)

  /* Entrega */
  const [entregaAberta, setEntregaAberta] = useState<number | null>(null)
  const [notaEntrega, setNotaEntrega] = useState('')
  const [linkEntrega, setLinkEntrega] = useState('')
  const [entregando, setEntregando] = useState(false)

  /* Filtro e busca */
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    try {
      const [dadosHistorico, dadosPendentes] = await Promise.all([
        api<{ itens: ItemHistorico[] }>('/historico'),
        api<{ pendentes: AvaliacaoPendente[] }>('/avaliacoes/pendentes'),
      ])
      setItens(dadosHistorico.itens)
      setPendentes(dadosPendentes.pendentes)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function finalizar(serv_id: number) {
    if (confirmando !== serv_id) {
      setConfirmando(serv_id)
      return
    }

    setFinalizando(serv_id)

    try {
      const dados = await api<{ mensagem: string }>(`/servicos/${serv_id}/finalizar`, { metodo: 'PUT' })
      toast.mostrar(dados.mensagem)
      comemorar()
      await carregar()
      avisarAvaliacoesMudaram()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível finalizar o projeto.', 'erro')
    } finally {
      setFinalizando(null)
      setConfirmando(null)
    }
  }

  async function entregar(e: React.FormEvent, serv_id: number) {
    e.preventDefault()
    setEntregando(true)

    try {
      const dados = await api<{ mensagem: string }>(`/servicos/${serv_id}/entregar`, {
        metodo: 'PUT',
        corpo: { nota: notaEntrega, link: linkEntrega.trim() || undefined },
      })
      toast.mostrar(dados.mensagem)
      setEntregaAberta(null)
      setNotaEntrega('')
      setLinkEntrega('')
      await carregar()
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível registrar a entrega.', 'erro')
    } finally {
      setEntregando(false)
    }
  }

  function tentarDeNovo() {
    setErro('')
    setCarregando(true)
    carregar()
  }

  /* Quantos em cada aba */
  const contagem = useMemo(() => {
    const c: Record<Filtro, number> = { todos: itens.length, em_andamento: 0, finalizado: 0, cancelado: 0 }
    for (const i of itens) if (i.serv_status in c) c[i.serv_status as Filtro] += 1
    return c
  }, [itens])

  /* "Em andamento" mostra só os em andamento; o histórico segue a aba e a busca */
  const termo = semAcento(busca.trim())
  const visiveis = itens.filter((i) => {
    if (apenasEntregues) return i.serv_status === 'em_andamento'
    if (filtro !== 'todos' && i.serv_status !== filtro) return false
    if (!termo) return true
    return semAcento(`${i.serv_titulo} ${i.serv_desc} ${i.categoria} ${i.outro_nome ?? ''}`).includes(termo)
  })
  const filtrando = !apenasEntregues && (filtro !== 'todos' || termo !== '')

  if (carregando) {
    return <Carregando variante="lista" />
  }

  if (erro) {
    return <EstadoErro mensagem={erro} onTentarDeNovo={tentarDeNovo} />
  }

  return (
    <div className={styles.pagina}>
      <h1 className="placa">{apenasEntregues ? 'Trabalhos em andamento' : 'Histórico'}</h1>
      {apenasEntregues && (
        <p className={`${styles.subtitulo} placa`}>
          Terminou? Marque o trabalho como entregue. Quando o contratante finalizar, você ganha XP.
        </p>
      )}

      {!apenasEntregues && pendentes.length > 0 && (
        <div className={styles.faixaPendentes}>
          <p>
            <Star size={16} strokeWidth={2.2} />
            Você tem {pendentes.length} {pendentes.length === 1 ? 'avaliação pendente' : 'avaliações pendentes'}.
            {ehContratante
              ? ' Sua nota dá XP ao freelancer e ajuda outros contratantes.'
              : ' Avaliar o contratante ajuda outros freelancers a escolherem bem.'}
          </p>
          <Link to={`/${role}/avaliacoes`} className={styles.btnAvaliarAgora}>
            Avaliar agora
            <ArrowRight size={14} strokeWidth={2.4} />
          </Link>
        </div>
      )}


      {!apenasEntregues && itens.length > 0 && (
        <div className={styles.filtros}>
          <div className={styles.abas} role="tablist" aria-label="Filtrar por situação">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                role="tab"
                aria-selected={filtro === f.valor}
                className={filtro === f.valor ? styles.abaAtiva : ''}
                onClick={() => setFiltro(f.valor)}
              >
                {f.rotulo}
                <span className={styles.abaConta}>{contagem[f.valor]}</span>
              </button>
            ))}
          </div>
          <label className={styles.buscaHistorico}>
            <Search size={15} strokeWidth={2.2} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou pessoa"
              aria-label="Buscar no histórico"
            />
          </label>
        </div>
      )}

      {visiveis.length === 0 && filtrando ? (
        <div className={`${styles.vazio} entrada`}>
          <Ilustracao tipo="coruja" />
          <strong>Nada encontrado</strong>
          <p>Nenhum projeto combina com esse filtro. Tente outra aba ou outra palavra.</p>
          <button type="button" className={styles.btnLimpar} onClick={() => { setFiltro('todos'); setBusca('') }}>
            Limpar filtros
          </button>
        </div>
      ) : visiveis.length === 0 ? (
        <div className={`${styles.vazio} entrada`}>
          <Ilustracao tipo="morcego" />
          <strong>
            {apenasEntregues ? 'Nenhum trabalho em andamento' : 'Nenhum projeto no histórico'}
          </strong>
          <p>
            {apenasEntregues
              ? 'Assim que uma candidatura sua for aceita, o projeto aparece aqui.'
              : 'Projetos em andamento, finalizados e cancelados aparecem aqui.'}
          </p>
        </div>
      ) : (
        <div className={`${styles.lista} cascata`}>
          {visiveis.map((item) => {
            const podeFinalizar = ehContratante && item.serv_status === 'em_andamento'
            const podeEntregar = !ehContratante && item.serv_status === 'em_andamento' && !item.serv_entregue_em

            return (
              <article key={item.serv_id} className={styles.card}>
                <div className={styles.topo}>
                  <span className={styles.icone}>
                    <CategoryIcon categoria={item.categoria} size={17} strokeWidth={2.2} />
                  </span>
                  <span className={styles.categoria}>{item.categoria}</span>
                  <span className={`${styles.status} ${CLASSE_STATUS[item.serv_status] ?? ''}`}>
                    {ROTULO_STATUS[item.serv_status] ?? item.serv_status}
                  </span>
                </div>

                <div className={styles.corpo}>
                  <div className={styles.info}>
                    <h3>{item.serv_titulo}</h3>
                    <p>{item.serv_desc}</p>
                  </div>
                  <span className={styles.valor}>
                    {formatarValorServico(item.serv_valor, item.serv_tipo_valor)}
                  </span>
                </div>

                <div className={styles.chips}>
                  <span>
                    <CalendarDays size={13} strokeWidth={2.2} />
                    {formatarData(item.serv_data_criacao)}
                  </span>
                  {item.outro_nome && (
                    <span>
                      <UserRound size={13} strokeWidth={2.2} />
                      {ehContratante ? 'Freelancer' : 'Contratante'}: {item.outro_nome}
                    </span>
                  )}
                  {(() => {
                    const prazo = prazoDoTrabalho(item)
                    return prazo ? (
                      <span className={prazo.nivel === 'atrasado' ? styles.prazoAtrasado : prazo.nivel === 'perto' ? styles.prazoPerto : ''}>
                        <AlarmClock size={13} strokeWidth={2.2} />
                        {prazo.texto}
                      </span>
                    ) : null
                  })()}
                  {item.serv_entregue_em && item.serv_status === 'em_andamento' && (
                    <span className={styles.entregue}>
                      <PackageCheck size={13} strokeWidth={2.2} />
                      Entregue em {formatarData(item.serv_entregue_em)}
                    </span>
                  )}
                </div>

                <LinhaDoTempo
                  status={item.serv_status}
                  criadoEm={item.serv_data_criacao}
                  contratadoEm={item.serv_contratado_em}
                  entregueEm={item.serv_entregue_em}
                  finalizadoEm={item.serv_finalizado_em}
                />

                <Etapas
                  key={`${item.serv_id}:${(item.etapas ?? []).map((e) => `${e.eta_id}${e.eta_concluida_em ? '+' : ''}`).join(',')}`}
                  servId={item.serv_id}
                  etapas={item.etapas ?? []}
                  podeEditar={ehContratante && item.serv_status === 'em_andamento'}
                  podeMarcar={!ehContratante && item.serv_status === 'em_andamento'}
                  garantia={item.serv_garantia_em && !item.serv_garantia_estornada_em ? Number(item.serv_garantia_valor) : null}
                  podePagar={ehContratante && item.serv_status === 'em_andamento' && Boolean(item.serv_garantia_em) && !item.serv_garantia_liberada_em && !item.serv_garantia_estornada_em}
                  aoPagar={carregar}
                />

                {item.serv_entrega_nota && (
                  <p className={styles.notaEntrega}>
                    <strong>Nota da entrega:</strong> {item.serv_entrega_nota}
                  </p>
                )}

                <PainelContratacao item={item} papel={ehContratante ? 'contratante' : 'freelancer'} aoMudar={carregar} />

                <PausaPrazo item={item} aoMudar={carregar} />

                {item.serv_tipo_valor === 'hora' && ['em_andamento', 'finalizado'].includes(item.serv_status) && (
                  <HorasTrabalhadas servId={item.serv_id} papel={ehContratante ? 'contratante' : 'freelancer'} emAndamento={item.serv_status === 'em_andamento'} />
                )}
                {['em_andamento', 'finalizado'].includes(item.serv_status) && (
                  <CriteriosAceite servId={item.serv_id} papel={ehContratante ? 'contratante' : 'freelancer'} emAndamento={item.serv_status === 'em_andamento'} />
                )}
                {(item.serv_entregue_em || item.serv_status === 'finalizado') && <VersoesEntrega servId={item.serv_id} />}
                {ehContratante && item.serv_status === 'finalizado' && (
                  <RepetirProjeto servId={item.serv_id} repetir={item.serv_repetir} repetirEm={item.serv_repetir_em} aoMudar={carregar} />
                )}

                {(item.outro_usu_id || podeEntregar || podeFinalizar) && (
                  <div className={styles.acoes}>
                    {item.outro_usu_id && (
                      <Link
                        className={styles.btnMensagem}
                        to={`/${role}/mensagens?serv=${item.serv_id}&com=${item.outro_usu_id}&nome=${encodeURIComponent(item.outro_nome ?? '')}&titulo=${encodeURIComponent(item.serv_titulo)}`}
                      >
                        <MessageCircle size={14} strokeWidth={2.2} />
                        Mensagem{item.outro_nome ? ` para ${item.outro_nome.split(' ')[0]}` : ''}
                      </Link>
                    )}

                    {podeEntregar && entregaAberta !== item.serv_id && (
                      <button
                        type="button"
                        className={styles.btnFinalizar}
                        onClick={() => { setEntregaAberta(item.serv_id); setNotaEntrega('') }}
                      >
                        <PackageCheck size={15} strokeWidth={2.2} />
                        Marcar como entregue
                      </button>
                    )}

                    {podeFinalizar && (
                      <button
                        type="button"
                        className={`${styles.btnFinalizar} ${confirmando === item.serv_id ? styles.confirmar : ''}`}
                        onClick={() => finalizar(item.serv_id)}
                        onBlur={() => setConfirmando((c) => (c === item.serv_id ? null : c))}
                        disabled={finalizando === item.serv_id}
                      >
                        <CircleCheckBig size={15} strokeWidth={2.2} />
                        {finalizando === item.serv_id
                          ? 'Finalizando...'
                          : confirmando === item.serv_id
                            ? 'Confirmar: trabalho entregue?'
                            : item.serv_entregue_em
                              ? 'Conferi, finalizar projeto'
                              : 'Finalizar projeto'}
                      </button>
                    )}
                  </div>
                )}

                {entregaAberta === item.serv_id && (
                  <form className={styles.formEntrega} onSubmit={(e) => entregar(e, item.serv_id)}>
                    <label htmlFor={`nota-${item.serv_id}`}>
                      Quer deixar um recado para {item.outro_nome?.split(' ')[0] ?? 'o contratante'}? (opcional)
                    </label>
                    <textarea
                      id={`nota-${item.serv_id}`}
                      value={notaEntrega}
                      onChange={(e) => setNotaEntrega(e.target.value)}
                      maxLength={LIMITE_NOTA}
                      rows={2}
                      placeholder="Ex.: Arquivos enviados por e-mail."
                    />
                    <label htmlFor={`link-${item.serv_id}`}>Link da entrega (opcional: Drive, Figma, GitHub...)</label>
                    <input
                      id={`link-${item.serv_id}`}
                      type="url"
                      value={linkEntrega}
                      onChange={(e) => setLinkEntrega(e.target.value)}
                      maxLength={300}
                      placeholder="https://"
                      className={styles.linkEntrega}
                    />
                    <div className={styles.formEntregaRodape}>
                      <span className={styles.contador}>{notaEntrega.length}/{LIMITE_NOTA}</span>
                      <button type="button" className={styles.btnCancelar} onClick={() => setEntregaAberta(null)}>
                        Cancelar
                      </button>
                      <button type="submit" className={styles.btnFinalizar} disabled={entregando}>
                        {entregando ? <span className="spinner" /> : <Send size={15} strokeWidth={2.2} />}
                        Confirmar entrega
                      </button>
                    </div>
                  </form>
                )}

              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
