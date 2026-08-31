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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRole(papel)
    navigate(`/${papel}`)
  }

  return (
    <div className={styles.pagina}>
      <form className={styles.cartao} onSubmit={handleSubmit}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="ContrateJá" />
        </Link>
        <h1>Bem-vindo de volta ao <span>ContrateJá</span></h1>
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
            <input type="email" required placeholder="seu@email.com" />
          </label>
          <label>
            Senha
            <input type="password" required minLength={6} placeholder="Sua senha" />
          </label>
        </div>

        <button type="submit" className={styles.btnPrimario}>Entrar</button>

        <p className={styles.linkCadastro}>
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
