import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../components/imgs/logo.png'
import { api, ErroApi } from '../services/api'
import styles from '../components/login/login.module.css'

export default function EsqueciSenha() {
  /* O login passa o e-mail que já estava digitado. */
  const vindoDoLogin = useLocation().state as { email?: string } | null

  const [email, setEmail] = useState(vindoDoLogin?.email ?? '')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setMensagem('')
    setCarregando(true)

    try {
      const dados = await api<{ mensagem: string }>('/auth/esqueci-senha', {
        metodo: 'POST',
        corpo: { email },
        publico: true,
      })

      setMensagem(dados.mensagem)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <form className={styles.cartao} onSubmit={handleSubmit}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="ContrateJá" />
        </Link>

        <h1>
          Esqueceu sua <span>senha?</span>
        </h1>

        <p className={styles.subtitulo} style={{ marginTop: 0 }}>
          Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha.
        </p>

        <div className={styles.formulario}>
          <label>
            E-mail
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        {mensagem && (
          <p className="msg-ok">
            {mensagem}
          </p>
        )}

        {erro && (
          <p className="msg-erro">
            {erro}
          </p>
        )}

        <button
          type="submit"
          className={styles.btnPrimario}
          disabled={carregando}
        >
          {carregando ? 'Enviando...' : mensagem ? 'Enviar novamente' : 'Enviar link'}
        </button>

        <p className={styles.linkCadastro}>
          Lembrou a senha? <Link to="/login">Voltar ao login</Link>
        </p>
      </form>
    </div>
  )
}
