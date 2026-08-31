import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../components/imgs/logo.png'
import { useRole } from '../context/useRole'
import type { Role } from '../context/role-context-def'
import styles from '../components/login/login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { setRole } = useRole()

  const [papel, setPapel] = useState<Role>('freelancer')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setCarregando(true)

    try {
      const resposta = await fetch(
        'https://backendtcc-zeta.vercel.app/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            senha
          })
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(dados.erro || 'Erro ao fazer login')
        return
      }

      localStorage.setItem('token', dados.token)

      setRole(papel)
      navigate(`/${papel}`)

    } catch (erro) {
      console.error(erro)
      setErro('Não foi possível conectar ao servidor.')
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
          Bem-vindo de volta ao <span>ContrateJá</span>
        </h1>

        <p className={styles.subtitulo}>Entre como:</p>

        <div className={styles.toggle}>
          <button
            type="button"
            className={papel === 'freelancer' ? styles.ativo : ''}
            onClick={() => setPapel('freelancer')}
          >
            Freelancer
          </button>

          <button
            type="button"
            className={papel === 'contratante' ? styles.ativo : ''}
            onClick={() => setPapel('contratante')}
          >
            Contratante
          </button>
        </div>

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

          <label>
            Senha
            <input
            type="password"
            required
            minLength={5}
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
           />
          </label>
        </div>

        {erro && (
          <p style={{ color: 'red' }}>
            {erro}
          </p>
        )}

        <button
          type="submit"
          className={styles.btnPrimario}
          disabled={carregando}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className={styles.linkCadastro}>
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}