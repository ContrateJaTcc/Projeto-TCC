import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../components/imgs/logo.png'
import { api, ErroApi } from '../services/api'
import styles from '../components/login/login.module.css'

/* Página aberta pelo link do e-mail: /redefinir-senha?token=... */
export default function RedefinirSenha() {
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('token') ?? ''

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }

    setErro('')
    setCarregando(true)

    try {
      await api('/auth/redefinir-senha', {
        metodo: 'POST',
        corpo: { token, senha },
        publico: true,
      })

      navigate('/login', { state: { senhaRedefinida: true } })
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
          Crie uma nova <span>senha</span>
        </h1>

        {!token ? (
          <p className="msg-erro">
            Link incompleto. Abra o link exatamente como veio no e-mail ou{' '}
            <Link to="/esqueci-senha" className={styles.linkEsqueci}>peça um novo</Link>.
          </p>
        ) : (
          <>
            <div className={styles.formulario}>
              <label>
                Nova senha
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Pelo menos 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </label>

              <label>
                Confirme a nova senha
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repita a senha"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </label>
            </div>

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
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </>
        )}

        <p className={styles.linkCadastro}>
          <Link to="/login">Voltar ao login</Link>
        </p>
      </form>
    </div>
  )
}
