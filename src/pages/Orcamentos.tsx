import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ReceiptText, Send, X, Pencil, Trash2 } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import Avatar from '../components/avatar/avatar'
import { formatarData, formatarMoeda } from '../utils/formatar'
import { lerComparacao } from '../utils/comparacao'
import comum from './comum.module.css'
import styles from './Orcamentos.module.css'

interface Resposta {
  usu_id: number
  nome: string
  foto: string | null
  status: 'aguardando' | 'respondido' | 'recusado'
  valor: number | null
  prazo: number | null
  texto: string | null
  data: string | null
}

interface Pedido {
  orc_id: number
  pergunta: string
  fechado: boolean
  data: string
  contratante?: string
  respostas: Resposta[]
}

interface Freelancer {
  usu_id: number
  usu_nome: string
}

/*
 * Pedido de orçamento rápido. Contratante: manda a mesma pergunta para até 3 freelancers e vê as respostas lado a lado.
 * Freelancer: responde com valor, prazo e um recado (ou recusa).
 */
export default function Orcamentos() {
  const { role } = useRole()
  const toast = useToast()
  const [params] = useSearchParams()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [escolhidos, setEscolhidos] = useState<number[]>(() => {
    const para = Number(params.get('para'))
    return para ? [para] : lerComparacao().slice(0, 3)
  })
  const [pergunta, setPergunta] = useState('')
  const [respondendo, setRespondendo] = useState<Record<number, { valor: string; prazo: string; texto: string }>>({})
  const contratante = role === 'contratante'
  /* Contratante: corrigir a pergunta ou apagar o pedido enquanto ninguém respondeu */
  const [editandoPedido, setEditandoPedido] = useState<number | null>(null)
  const [perguntaEd, setPerguntaEd] = useState('')
  const [apagandoPedido, setApagandoPedido] = useState<number | null>(null)

  const carregar = useCallback(() => {
    api<{ pedidos: Pedido[] }>('/orcamentos').then((d) => setPedidos(d.pedidos)).catch(() => setPedidos([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    if (contratante) api<Freelancer[]>('/usuarios/freelancers', { silencioso: true }).then(setFreelancers).catch(() => {})
    return () => clearTimeout(t)
  }, [carregar, contratante])

  async function enviar(caminho: string, metodo: 'POST' | 'PUT' | 'DELETE', corpo?: object) {
    try {
      const r = await api<{ mensagem: string }>(caminho, { metodo, corpo })
      toast.mostrar(r.mensagem, 'sucesso')
      carregar()
      return true
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não deu certo. Tente de novo.', 'erro')
      return false
    }
  }

  async function apagarPedido(p: Pedido) {
    /* Segundo clique confirma */
    if (apagandoPedido !== p.orc_id) {
      setApagandoPedido(p.orc_id)
      return
    }
    setApagandoPedido(null)
    await enviar(`/orcamentos/${p.orc_id}`, 'DELETE')
  }

  const alternar = (id: number) => setEscolhidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= 3 ? l : [...l, id]))

  if (!pedidos) return <Carregando variante="lista" />

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Orçamentos</h1>
      <p className={`${comum.subtitulo} placa`}>
        {contratante
          ? 'Pergunte quanto custa antes de criar o projeto: a mesma pergunta vai para até 3 freelancers, e as respostas aparecem lado a lado.'
          : 'Contratantes perguntando quanto você cobra. Responda com valor e prazo, ou recuse.'}
      </p>

      {contratante && (
        <form
          className={comum.painel}
          onSubmit={async (e) => {
            e.preventDefault()
            if (await enviar('/orcamentos', 'POST', { pergunta, freelancers: escolhidos })) setPergunta('')
          }}
        >
          <h2><ReceiptText size={20} strokeWidth={2.2} /> Pedir orçamento</h2>
          <label className={styles.campo}>
            O que você precisa?
            <textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} rows={3} maxLength={600} placeholder="Ex.: Quanto você cobra por um site de 5 páginas, com catálogo e formulário de contato?" required />
          </label>
          <fieldset className={styles.escolha}>
            <legend>Para quem (até 3)</legend>
            {freelancers.map((f) => (
              <label key={f.usu_id} className={escolhidos.includes(f.usu_id) ? styles.marcado : ''}>
                <input type="checkbox" checked={escolhidos.includes(f.usu_id)} onChange={() => alternar(f.usu_id)} disabled={!escolhidos.includes(f.usu_id) && escolhidos.length >= 3} />
                {f.usu_nome}
              </label>
            ))}
          </fieldset>
          <button type="submit" className={comum.botaoOuro} disabled={pergunta.trim().length < 15 || !escolhidos.length}>
            <Send size={15} strokeWidth={2.2} /> Mandar para {escolhidos.length || 'ninguém'} {escolhidos.length === 1 ? 'freelancer' : 'freelancers'}
          </button>
        </form>
      )}

      <h2 className={`${styles.titulo} placa`}>{contratante ? 'Seus pedidos' : 'Pedidos recebidos'}</h2>
      {pedidos.length === 0 && <p className={`${comum.painel} ${comum.nota}`}>Nenhum pedido ainda.</p>}

      <div className={styles.lista}>
        {pedidos.map((p) => (
          <section key={p.orc_id} className={comum.painel} aria-label={`Pedido de ${formatarData(p.data)}`}>
            {editandoPedido === p.orc_id ? (
              <form
                className={styles.campo}
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (await enviar(`/orcamentos/${p.orc_id}`, 'PUT', { pergunta: perguntaEd })) setEditandoPedido(null)
                }}
              >
                <label className={styles.campo}>
                  Corrigir a pergunta
                  <textarea value={perguntaEd} onChange={(e) => setPerguntaEd(e.target.value)} rows={3} maxLength={600} autoFocus />
                </label>
                <div className={styles.acoes}>
                  <button type="submit" className={comum.botaoOuro} disabled={perguntaEd.trim().length < 15}>Salvar pergunta</button>
                  <button type="button" className={comum.botao} onClick={() => setEditandoPedido(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <p className={styles.pergunta}>“{p.pergunta}”</p>
            )}
            <p className={comum.nota}>
              {p.contratante ? `${p.contratante} · ` : ''}{formatarData(p.data)}{p.fechado ? ' · encerrado' : ''}
            </p>

            {contratante ? (
              <>
                <div className={styles.respostas} role="list">
                  {p.respostas.map((r) => (
                    <article key={r.usu_id} className={`${styles.resposta} ${styles[r.status]}`} role="listitem">
                      <header>
                        <Avatar nome={r.nome} foto={r.foto} size={32} />
                        <Link to={`/contratante/freelancer/${r.usu_id}`}>{r.nome}</Link>
                      </header>
                      {r.status === 'respondido' ? (
                        <>
                          <strong className={styles.valor}>{r.valor !== null ? formatarMoeda(r.valor) : 'A combinar'}</strong>
                          {r.prazo !== null && <span>{r.prazo} {r.prazo === 1 ? 'dia' : 'dias'}</span>}
                          {r.texto && <p>{r.texto}</p>}
                        </>
                      ) : (
                        <span className={comum.nota}>{r.status === 'recusado' ? 'Não pode pegar agora' : 'Esperando resposta'}</span>
                      )}
                    </article>
                  ))}
                </div>
                {(() => {
                  /* Sem nenhuma resposta ainda: dá para corrigir a pergunta e apagar o pedido */
                  const semResposta = !p.respostas.some((r) => r.status === 'respondido')
                  if (p.fechado && !semResposta) return null
                  return (
                    <div className={styles.acoes}>
                      {!p.fechado && <Link to="/contratante/criar-projeto" className={comum.botaoOuro}>Criar o projeto</Link>}
                      {!p.fechado && <button type="button" className={comum.botao} onClick={() => enviar(`/orcamentos/${p.orc_id}/fechar`, 'PUT')}>Encerrar pedido</button>}
                      {semResposta && !p.fechado && editandoPedido !== p.orc_id && (
                        <button
                          type="button"
                          className={comum.botao}
                          onClick={() => {
                            setEditandoPedido(p.orc_id)
                            setPerguntaEd(p.pergunta)
                            setApagandoPedido(null)
                          }}
                        >
                          <Pencil size={14} strokeWidth={2.4} aria-hidden="true" /> Corrigir pergunta
                        </button>
                      )}
                      {semResposta && (
                        <button
                          type="button"
                          className={`${comum.botao} ${styles.apagar} ${apagandoPedido === p.orc_id ? styles.apagarConfirmar : ''}`}
                          onClick={() => apagarPedido(p)}
                          onBlur={() => setApagandoPedido((atual) => (atual === p.orc_id ? null : atual))}
                        >
                          <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" /> {apagandoPedido === p.orc_id ? 'Clique de novo para apagar' : 'Apagar pedido'}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </>
            ) : (
              p.respostas.map((r) =>
                r.status !== 'aguardando' || p.fechado ? (
                  <p key={r.usu_id} className={comum.nota}>
                    {r.status === 'respondido' ? `Você respondeu: ${r.valor !== null ? formatarMoeda(r.valor) : 'valor a combinar'}${r.prazo ? `, ${r.prazo} dias` : ''}.` : r.status === 'recusado' ? 'Você recusou.' : 'O contratante encerrou o pedido.'}
                  </p>
                ) : (
                  <form
                    key={r.usu_id}
                    className={styles.formResposta}
                    onSubmit={(e) => {
                      e.preventDefault()
                      const d = respondendo[p.orc_id] ?? { valor: '', prazo: '', texto: '' }
                      enviar(`/orcamentos/${p.orc_id}/resposta`, 'PUT', { valor: d.valor.replace(',', '.'), prazo: d.prazo, texto: d.texto })
                    }}
                  >
                    {(['valor', 'prazo'] as const).map((campo) => (
                      <label key={campo}>
                        {campo === 'valor' ? 'Valor (R$)' : 'Prazo (dias)'}
                        <input
                          inputMode={campo === 'valor' ? 'decimal' : 'numeric'}
                          value={respondendo[p.orc_id]?.[campo] ?? ''}
                          onChange={(e) => setRespondendo((t) => ({ ...t, [p.orc_id]: { ...(t[p.orc_id] ?? { valor: '', prazo: '', texto: '' }), [campo]: e.target.value } }))}
                        />
                      </label>
                    ))}
                    <label className={styles.cresce}>
                      Recado
                      <input value={respondendo[p.orc_id]?.texto ?? ''} maxLength={500} onChange={(e) => setRespondendo((t) => ({ ...t, [p.orc_id]: { ...(t[p.orc_id] ?? { valor: '', prazo: '', texto: '' }), texto: e.target.value } }))} />
                    </label>
                    <div className={styles.acoes}>
                      <button type="submit" className={comum.botaoOuro}><Send size={15} strokeWidth={2.2} /> Responder</button>
                      <button type="button" className={comum.botao} onClick={() => enviar(`/orcamentos/${p.orc_id}/resposta`, 'PUT', { recusar: true })}><X size={15} strokeWidth={2.2} /> Recusar</button>
                    </div>
                  </form>
                )
              )
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
