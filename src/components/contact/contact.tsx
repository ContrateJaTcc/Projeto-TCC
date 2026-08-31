import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import styles from './contact.module.css'

export default function Contact() {
  const [enviado, setEnviado] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnviado(true)
  }

  return (
    <section className={styles.contato} id="contato">
      <div className={styles.cartao}>
        <div className={styles.info}>
          <span className={styles.logoTexto}>ContrateJá</span>
          <h2>Entre em contato</h2>
          <p>Dúvidas, sugestões ou parcerias? Fale com a gente!</p>
          <a href="mailto:contato@contrateja.com.br">contato@contrateja.com.br</a>
        </div>

        <form className={styles.formulario} onSubmit={handleSubmit}>
          <div className={styles.linha}>
            <label>
              Nome
              <input type="text" placeholder="Seu nome" required />
            </label>
            <label>
              E-mail
              <input type="email" placeholder="seu@email.com" required />
            </label>
          </div>
          <label>
            Assunto
            <input type="text" placeholder="Como podemos ajudar?" required />
          </label>
          <label>
            Mensagem
            <textarea placeholder="Escreva sua mensagem..." required />
          </label>
          <button type="submit">
            {enviado ? <>Mensagem enviada <Check size={16} strokeWidth={2.6} /></> : 'Enviar mensagem'}
          </button>
        </form>
      </div>
    </section>
  )
}
