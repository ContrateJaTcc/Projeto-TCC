import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, XCircle, X, Info } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import styles from './removerprojeto.module.css'

/* O que o servidor diz que o dono pode fazer com o projeto (GET /servicos/:id → remocao) */
export interface SituacaoRemocao {
  pode_excluir: boolean
  pode_cancelar: boolean
  candidaturas: number
  motivo: string | null
}

interface Props {
  servId: number | string
  titulo: string
  remocao: SituacaoRemocao
  /* Rascunho: o texto fala em "rascunho" em vez de "projeto" */
  rascunho?: boolean
  /* Para onde ir depois (padrão: painel do contratante) */
  destino?: string
}

/*
 * Cartão "Gerenciar projeto" para o dono:
 * - ninguém se envolveu ainda: excluir de vez
 * - já tem candidatos: cancelar (sai do ar, os candidatos são avisados e o projeto fica no histórico)
 * - já contratou alguém: só explica por que não dá
 */
export default function RemoverProjeto({ servId, titulo, remocao, rascunho = false, destino = '/contratante' }: Props) {
  const idTitulo = useId()
  const idTexto = useId()
  const janela = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const toast = useToast()
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const { pode_excluir: excluir, pode_cancelar: cancelar, candidaturas } = remocao
  const nome = rascunho ? 'rascunho' : 'projeto'

  /* Encerrado: nada a fazer aqui */
  if (!excluir && !cancelar && !remocao.motivo) return null

  const abrir = () => janela.current?.showModal()
  const fechar = () => {
    if (!enviando) janela.current?.close()
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = excluir
        ? await api<{ mensagem: string }>(`/servicos/${servId}`, { metodo: 'DELETE' })
        : await api<{ mensagem: string }>(`/servicos/${servId}/cancelar`, { metodo: 'PUT', corpo: { motivo } })
      toast.mostrar(r.mensagem, 'sucesso')
      janela.current?.close()
      navigate(destino, { replace: true, viewTransition: true })
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : `Não foi possível ${excluir ? 'excluir' : 'cancelar'} o ${nome}.`, 'erro')
      setEnviando(false)
    }
  }

  return (
    <section className={styles.cartao} aria-labelledby={`${idTitulo}-cartao`}>
      <h2 id={`${idTitulo}-cartao`}>Gerenciar {nome}</h2>

      {excluir || cancelar ? (
        <>
          <p className={styles.dica}>
            {excluir
              ? `Ninguém se candidatou ainda, então dá para excluir o ${nome} de vez.`
              : `${candidaturas === 1 ? '1 pessoa já se candidatou' : `${candidaturas} pessoas já se candidataram`}. Dá para cancelar: o projeto sai do ar, mas continua no seu histórico.`}
          </p>
          <button type="button" className={styles.botao} onClick={abrir}>
            {excluir ? <Trash2 size={17} strokeWidth={2.4} aria-hidden="true" /> : <XCircle size={17} strokeWidth={2.4} aria-hidden="true" />}
            {excluir ? `Excluir ${nome}` : 'Cancelar projeto'}
          </button>
        </>
      ) : (
        <p className={styles.aviso}>
          <Info size={16} strokeWidth={2.4} aria-hidden="true" />
          {remocao.motivo}
        </p>
      )}

      <dialog
        ref={janela}
        className={styles.janela}
        aria-labelledby={idTitulo}
        aria-describedby={idTexto}
        onClick={(e) => e.target === janela.current && fechar()}
        onCancel={(e) => enviando && e.preventDefault()}
      >
        <form onSubmit={confirmar} className={styles.formulario}>
          <header>
            <h2 id={idTitulo}>{excluir ? `Excluir ${nome}?` : 'Cancelar projeto?'}</h2>
            <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar" disabled={enviando}>
              <X size={18} strokeWidth={2.4} />
            </button>
          </header>

          <p className={styles.alvo}>“{titulo}”</p>

          {excluir ? (
            <p id={idTexto}>
              Ele some do site de vez e <strong>não dá para desfazer</strong>.
            </p>
          ) : (
            <>
              <p id={idTexto}>
                O projeto sai do ar e {candidaturas === 1 ? 'o candidato é avisado' : `os ${candidaturas} candidatos são avisados`}. Ele continua no seu histórico, na aba
                “Cancelados”. <strong>Não dá para reabrir.</strong>
              </p>
              <label className={styles.motivo}>
                Motivo (opcional, os candidatos veem)
                <textarea rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: o orçamento mudou e o projeto foi adiado." />
              </label>
            </>
          )}

          <div className={styles.acoes}>
            <button type="button" className={styles.voltar} onClick={fechar} disabled={enviando}>
              Voltar
            </button>
            <button type="submit" className={styles.confirmar} disabled={enviando}>
              {enviando ? (excluir ? 'Excluindo...' : 'Cancelando...') : excluir ? `Sim, excluir` : 'Sim, cancelar'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  )
}
