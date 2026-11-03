import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import styles from './contact.module.css'

const VAZIO = { nome: '', email: '', assunto: '', mensagem: '' }

/* A mensagem vai para o sino (e o e-mail) dos administradores (POST /publico/contato) */
export default function Contact() {
  const [campos, setCampos] = useState(VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [resposta, setResposta] = useState<{ ok: boolean; texto: string } | null>(null)

  const mudar = (campo: keyof typeof VAZIO) => (e: { target: { value: string } }) => {
    setCampos((c) => ({ ...c, [campo]: e.target.value }))
    if (resposta?.ok) setResposta(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await api<{ mensagem: string }>('/publico/contato', { metodo: 'POST', corpo: campos, publico: true })
      setResposta({ ok: true, texto: r.mensagem })
      setCampos(VAZIO)
    } catch (erro) {
      setResposta({ ok: false, texto: erro instanceof ErroApi ? erro.message : 'Não foi possível enviar agora. Tente pelo e-mail ao lado.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={styles.contato} id="contato">
      <div className={styles.cartao}>
        <div className={styles.info}>
          <span className={styles.logoTexto}>ContrateJá</span>
          <h2 className="titulo-magico esquerda">Entre em contato</h2>
          <p>Dúvidas, sugestões ou parcerias? Fale com a gente!</p>
          <a href="mailto:contato@contrateja.com.br">contato@contrateja.com.br</a>
        </div>

        <form className={styles.formulario} onSubmit={handleSubmit}>
          <div className={styles.linha}>
            <label>
              Nome
              <input type="text" placeholder="Seu nome" required maxLength={120} value={campos.nome} onChange={mudar('nome')} />
            </label>
            <label>
              E-mail
              <input type="email" placeholder="seu@email.com" required maxLength={200} value={campos.email} onChange={mudar('email')} />
            </label>
          </div>
          <label>
            Assunto
            <input type="text" placeholder="Como podemos ajudar?" required maxLength={120} value={campos.assunto} onChange={mudar('assunto')} />
          </label>
          <label>
            Mensagem
            <textarea placeholder="Escreva sua mensagem..." required minLength={10} maxLength={2000} value={campos.mensagem} onChange={mudar('mensagem')} />
          </label>
          {resposta && (
            <p className={resposta.ok ? styles.enviado : styles.erro} role={resposta.ok ? 'status' : 'alert'}>
              {resposta.ok && <Check size={16} strokeWidth={2.6} />} {resposta.texto}
            </p>
          )}
          <button type="submit" disabled={enviando}>
            {enviando ? <><span className="spinner" /> Enviando...</> : 'Enviar mensagem'}
          </button>
        </form>
      </div>
    </section>
  )
}
