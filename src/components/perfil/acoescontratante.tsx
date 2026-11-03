import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, BellRing, FlaskConical, NotebookPen, ReceiptText } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import styles from './acoescontratante.module.css'

/*
 * O que o contratante faz no portfólio de um freelancer, além de convidar:
 * anotação privada, "me avise quando estiver livre", trabalho de amostra, pedido de orçamento e bloquear.
 */

export function AnotacaoPrivada({ usuId }: { usuId: number }) {
  const toast = useToast()
  const [texto, setTexto] = useState<string | null>(null)
  const [salvo, setSalvo] = useState('')

  useEffect(() => {
    let vivo = true
    api<{ disponivel: boolean; texto: string }>(`/usuarios/notas/${usuId}`, { silencioso: true })
      .then((d) => {
        if (!vivo || !d.disponivel) return
        setTexto(d.texto)
        setSalvo(d.texto)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [usuId])

  if (texto === null) return null

  async function salvar() {
    try {
      const r = await api<{ mensagem: string }>(`/usuarios/notas/${usuId}`, { metodo: 'PUT', corpo: { texto } })
      setSalvo(texto ?? '')
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar a anotação.', 'erro')
    }
  }

  return (
    <section className={styles.caixa} aria-labelledby="titulo-anotacao">
      <h2 id="titulo-anotacao"><NotebookPen size={16} strokeWidth={2.4} aria-hidden="true" /> Minha anotação</h2>
      <p className={styles.dica}>Só você vê. Ex.: "ótimo em logo, prazo apertado".</p>
      <label className="sr-only" htmlFor="anotacao-privada">Anotação privada</label>
      <textarea id="anotacao-privada" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} rows={3} />
      <button type="button" className={styles.botao} onClick={salvar} disabled={texto === salvo}>
        {texto === salvo && salvo ? 'Salva' : 'Salvar anotação'}
      </button>
    </section>
  )
}

export function AvisarQuandoLivre({ usuId, nome, ocupado }: { usuId: number; nome: string; ocupado: boolean }) {
  const toast = useToast()
  const [ativo, setAtivo] = useState<boolean | null>(null)

  useEffect(() => {
    if (!ocupado) return
    let vivo = true
    api<{ disponivel: boolean; ativo: boolean }>(`/usuarios/freelancers/${usuId}/aviso-livre`, { silencioso: true })
      .then((d) => vivo && d.disponivel && setAtivo(d.ativo))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [usuId, ocupado])

  if (!ocupado || ativo === null) return null

  async function alternar() {
    try {
      const r = await api<{ mensagem: string }>(`/usuarios/freelancers/${usuId}/aviso-livre`, { metodo: ativo ? 'DELETE' : 'POST' })
      setAtivo(!ativo)
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar o aviso.', 'erro')
    }
  }

  return (
    <button type="button" className={styles.botao} onClick={alternar} aria-pressed={ativo}>
      <BellRing size={15} strokeWidth={2.4} aria-hidden="true" />
      {ativo ? `Você vai saber quando ${nome.split(' ')[0]} estiver livre` : 'Me avise quando estiver livre'}
    </button>
  )
}

export function PedirAmostra({ usuId, nome }: { usuId: number; nome: string }) {
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('100')
  const [prazo, setPrazo] = useState('3')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await api<{ mensagem: string }>('/servicos/amostra', { metodo: 'POST', corpo: { usu_id: usuId, titulo, descricao, valor: Number(valor.replace(',', '.')), prazo: Number(prazo) } })
      toast.mostrar(r.mensagem, 'sucesso')
      setAberto(false)
      setTitulo('')
      setDescricao('')
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível pedir a amostra.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={styles.caixa} aria-labelledby="titulo-amostra">
      <h2 id="titulo-amostra"><FlaskConical size={16} strokeWidth={2.4} aria-hidden="true" /> Trabalho de amostra</h2>
      <p className={styles.dica}>
        Antes de um projeto grande, pague uma tarefa pequena (até R$ 300, até 7 dias) para testar {nome.split(' ')[0]}. Tem garantia e avaliação como um projeto normal.
      </p>
      {!aberto ? (
        <button type="button" className={styles.botao} onClick={() => setAberto(true)}>Pedir uma amostra</button>
      ) : (
        <form className={styles.form} onSubmit={enviar}>
          <label>
            O que é a amostra
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={140} placeholder="Ex.: Um rascunho do logo" required />
          </label>
          <label>
            O que precisa ter
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={1000} required />
          </label>
          <div className={styles.linha}>
            <label>
              Valor (R$)
              <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} />
            </label>
            <label>
              Prazo (dias)
              <input inputMode="numeric" value={prazo} onChange={(e) => setPrazo(e.target.value.replace(/\D/g, '').slice(0, 1))} />
            </label>
          </div>
          <div className={styles.linha}>
            <button type="button" className={styles.botao} onClick={() => setAberto(false)}>Cancelar</button>
            <button type="submit" className={styles.botaoForte} disabled={enviando}>Criar e convidar</button>
          </div>
        </form>
      )}
    </section>
  )
}

export function AtalhosContratante({ usuId, nome }: { usuId: number; nome: string }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [confirmar, setConfirmar] = useState(false)

  async function bloquear() {
    try {
      const r = await api<{ mensagem: string }>(`/usuarios/bloqueios/${usuId}`, { metodo: 'POST' })
      toast.mostrar(r.mensagem, 'sucesso')
      navigate('/contratante/freelancers', { viewTransition: true })
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível bloquear.', 'erro')
    }
  }

  return (
    <div className={styles.atalhos}>
      <button type="button" className={styles.botao} onClick={() => navigate(`/contratante/orcamentos?para=${usuId}`, { viewTransition: true })}>
        <ReceiptText size={15} strokeWidth={2.4} aria-hidden="true" /> Pedir orçamento
      </button>
      {confirmar ? (
        <span className={styles.confirmar} role="alert">
          Bloquear {nome.split(' ')[0]}?
          <button type="button" className={styles.botaoPerigo} onClick={bloquear}>Bloquear</button>
          <button type="button" className={styles.botao} onClick={() => setConfirmar(false)}>Cancelar</button>
        </span>
      ) : (
        <button type="button" className={styles.botao} onClick={() => setConfirmar(true)}>
          <Ban size={15} strokeWidth={2.4} aria-hidden="true" /> Bloquear
        </button>
      )}
    </div>
  )
}
