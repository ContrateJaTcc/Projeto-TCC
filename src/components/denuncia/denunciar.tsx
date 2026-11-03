import { useId, useRef, useState } from 'react'
import { Flag, X } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import styles from './denunciar.module.css'

const MOTIVOS = [
  { valor: 'golpe', rotulo: 'Golpe ou fraude' },
  { valor: 'spam', rotulo: 'Spam ou propaganda' },
  { valor: 'ofensivo', rotulo: 'Conteúdo ofensivo' },
  { valor: 'falso', rotulo: 'Informações falsas' },
  { valor: 'outro', rotulo: 'Outro motivo' },
]

/* Botão discreto que abre a janela de denúncia de um projeto ou de um perfil */
export default function Denunciar({ alvoTipo, alvoId, rotulo, titulo = rotulo }: { alvoTipo: 'servico' | 'usuario' | 'mensagem'; alvoId: number | string; rotulo: string; titulo?: string }) {
  /* Várias denúncias na mesma página (mensagens do chat): cada janela com o seu id */
  const idTitulo = useId()
  const toast = useToast()
  const janela = useRef<HTMLDialogElement>(null)
  const [motivo, setMotivo] = useState('')
  const [detalhe, setDetalhe] = useState('')
  const [enviando, setEnviando] = useState(false)

  const abrir = () => janela.current?.showModal()
  const fechar = () => janela.current?.close()

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await api<{ mensagem: string }>('/denuncias', { metodo: 'POST', corpo: { alvo_tipo: alvoTipo, alvo_id: Number(alvoId), motivo, detalhe } })
      toast.mostrar(r.mensagem, 'sucesso')
      setMotivo('')
      setDetalhe('')
      fechar()
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível enviar a denúncia.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button type="button" className={styles.botao} onClick={abrir}>
        <Flag size={14} strokeWidth={2.4} /> {rotulo}
      </button>

      <dialog ref={janela} className={styles.janela} aria-labelledby={idTitulo} onClick={(e) => e.target === janela.current && fechar()}>
        <form onSubmit={enviar} className={styles.formulario}>
          <header>
            <h2 id={idTitulo}>{titulo}</h2>
            <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar">
              <X size={18} strokeWidth={2.4} />
            </button>
          </header>
          <p>A administração vai analisar. Quem você denunciou não fica sabendo quem foi.</p>

          <fieldset>
            <legend>Motivo</legend>
            {MOTIVOS.map((m) => (
              <label key={m.valor} className={styles.opcao}>
                <input type="radio" name="motivo" value={m.valor} required checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} />
                {m.rotulo}
              </label>
            ))}
          </fieldset>

          <label className={styles.detalhe}>
            Conte o que aconteceu (opcional)
            <textarea rows={3} maxLength={500} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
          </label>

          <div className={styles.acoes}>
            <button type="button" className={styles.cancelar} onClick={fechar}>Cancelar</button>
            <button type="submit" className={styles.enviar} disabled={enviando || !motivo}>
              {enviando ? 'Enviando...' : 'Enviar denúncia'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
