import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../components/imgs/logo.png'
import { useRole } from '../context/useRole'
import type { Role } from '../context/role-context-def'
import { api, ErroApi, salvarSessao } from '../services/api'
import { pedirTokenGoogle } from '../services/google'
import styles from '../components/login/login.module.css'

interface RespostaLogin {
  token: string
  tipo?: Role
}

interface RespostaGoogle extends Partial<RespostaLogin> {
  cadastroNecessario?: boolean
  google?: { email: string; nome: string; sobrenome: string }
}

export default function Login() {
  const navigate = useNavigate()
  const { setRole } = useRole()

  const [papel, setPapel] = useState<Role>('freelancer')
  /* Vindo do cadastro ou da redefinição de senha: mostra a confirmação e já preenche o e-mail. */
  const location = useLocation()
  const vindoDe = location.state as { cadastrado?: boolean; senhaRedefinida?: boolean; email?: string } | null
  const aviso = vindoDe?.cadastrado
    ? 'Conta criada com sucesso! Entre com seu e-mail e senha.'
    : vindoDe?.senhaRedefinida
      ? 'Senha redefinida! Entre com a nova senha.'
      : ''

  const [email, setEmail] = useState(vindoDe?.email ?? '')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  /*
   * O destino vem do tipo que o servidor le do banco, nao do botao acima:
   * antes um contratante que clicasse em "Freelancer" entrava na area errada.
   */
  const entrar = (dados: RespostaLogin) => {
    const tipoReal = salvarSessao(dados.token, dados.tipo)

    if (!tipoReal) {
      setErro('Não foi possível identificar o tipo da sua conta. Tente novamente.')
      return
    }

    setRole(tipoReal)
    navigate(`/${tipoReal}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setCarregando(true)

    try {
      const dados = await api<RespostaLogin>('/auth/login', {
        metodo: 'POST',
        corpo: { email, senha },
        publico: true,
      })

      entrar(dados)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  const handleGoogle = async () => {
    setErro('')
    setCarregando(true)

    try {
      const accessToken = await pedirTokenGoogle()

      const dados = await api<RespostaGoogle>('/auth/google', {
        metodo: 'POST',
        corpo: { accessToken },
        publico: true,
      })

      if (dados.token) {
        entrar({ token: dados.token, tipo: dados.tipo })
        return
      }

      /* Conta Google sem cadastro: completa os dados que o Google não dá
         (CPF, telefone...) na tela de cadastro, já preenchida. */
      if (dados.cadastroNecessario && dados.google) {
        navigate('/cadastro', {
          state: { google: { token: accessToken, ...dados.google }, perfil: papel },
        })
      }
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Não foi possível conectar ao servidor.'
      )
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

        <button
          type="button"
          className={styles.btnSocial}
          onClick={handleGoogle}
          disabled={carregando}
        >
          Continuar com Google
        </button>

        <div className={styles.divisor}>
          <span>ou entre com e-mail</span>
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

          <Link to="/esqueci-senha" state={{ email }} className={styles.linkEsqueci}>
            Esqueci minha senha
          </Link>
        </div>

        {aviso && !erro && (
          <p className="msg-ok">
            {aviso}
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
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className={styles.linkCadastro}>
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
