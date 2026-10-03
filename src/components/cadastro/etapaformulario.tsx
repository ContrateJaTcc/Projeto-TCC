import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import styles from './cadastro.module.css'
import type { Perfil } from './etapaperfil'
import { api, ErroApi, salvarSessao } from '../../services/api'
import { pedirTokenGoogle, type DadosGoogle } from '../../services/google'
import { useRole } from '../../context/useRole'
import { mascararCpf, mascararTelefone } from '../../utils/mascaras'

interface EtapaFormularioProps {
  perfil: Perfil
  /* Conta Google ainda sem cadastro: e-mail fixo e sem campo de senha. */
  google: DadosGoogle | null
  onGoogle: (dados: DadosGoogle | null) => void
  onVoltar: () => void
  onCriarConta: (email: string) => void
}

interface RespostaSessao {
  token?: string
  tipo?: Perfil
  cadastroNecessario?: boolean
  google?: { email: string; nome: string; sobrenome: string }
}

export default function EtapaFormulario({
  perfil,
  google,
  onGoogle,
  onVoltar,
  onCriarConta,
}: EtapaFormularioProps) {
  const navigate = useNavigate()
  const { setRole } = useRole()
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [nome, setNome] = useState(google?.nome ?? '')
  const [sobrenome, setSobrenome] = useState(google?.sobrenome ?? '')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  /* Devolve false se o token não trouxer um tipo válido. */
  const entrar = (token: string, tipo?: Perfil) => {
    const tipoReal = salvarSessao(token, tipo)

    if (!tipoReal) return false

    setRole(tipoReal)
    navigate(`/${tipoReal}`)
    return true
  }

  const handleGoogle = async () => {
    setErro('')
    setCarregando(true)

    try {
      const accessToken = await pedirTokenGoogle()

      const dados = await api<RespostaSessao>('/auth/google', {
        metodo: 'POST',
        corpo: { accessToken },
        publico: true,
      })

      /* Esse e-mail do Google já tem conta: entra direto. */
      if (dados.token) {
        if (!entrar(dados.token, dados.tipo)) {
          setErro('Não foi possível identificar o tipo da sua conta. Tente novamente.')
        }
        return
      }

      if (dados.cadastroNecessario && dados.google) {
        onGoogle({ token: accessToken, ...dados.google })
        if (dados.google.nome) setNome(dados.google.nome)
        if (dados.google.sobrenome) setSobrenome(dados.google.sobrenome)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setCarregando(true)

    try {
      const dados = await api<RespostaSessao>('/auth/register', {
        metodo: 'POST',
        publico: true,
        corpo: {
          nome: `${nome} ${sobrenome}`.trim(),
          ...(google ? { googleToken: google.token } : { email, senha }),
          cpf,
          telefone,
          data_nasc: dataNasc,
          cidade,
          estado,
          tipo: perfil,
        },
      })

      /* Cadastro pelo Google já devolve a sessão (não há senha para digitar no login). */
      if (dados?.token && entrar(dados.token, dados.tipo)) return

      onCriarConta(google?.email ?? email)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form className={styles.formulario} onSubmit={handleSubmit}>
      <button
        type="button"
        className={styles.btnVoltar}
        onClick={onVoltar}
      >
        <ArrowLeft size={15} strokeWidth={2.4} />
        Voltar
      </button>

      <h2>Crie sua conta</h2>

      {google ? (
        <p className={styles.avisoGoogle}>
          Conectado com o Google como <strong>{google.email}</strong>. Complete os dados abaixo
          para criar sua conta.{' '}
          <button type="button" onClick={() => onGoogle(null)}>
            Usar outro e-mail
          </button>
        </p>
      ) : (
        <>
          <div className={styles.botoesSociais}>
            <button
              type="button"
              className={styles.btnSocial}
              onClick={handleGoogle}
              disabled={carregando}
            >
              Continuar com Google
            </button>

            <button type="button" className={styles.btnSocial}>
              Continuar com Apple
            </button>
          </div>

          <div className={styles.divisor}>
            <span>ou crie manualmente</span>
          </div>
        </>
      )}

      <div className={styles.linhaForm}>
        <label>
          Primeiro nome
          <input
            type="text"
            required
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>

        <label>
          Sobrenome
          <input
            type="text"
            required
            placeholder="Seu sobrenome"
            value={sobrenome}
            onChange={(e) => setSobrenome(e.target.value)}
          />
        </label>
      </div>

      <label>
        E-mail
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={google ? google.email : email}
          readOnly={Boolean(google)}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {!google && (
      <label>
        Senha
        <div className={styles.campoSenha}>
          <input
            type={mostrarSenha ? 'text' : 'password'}
            required
            minLength={6}
            placeholder="Crie uma senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            aria-label="Mostrar senha"
          >
            {mostrarSenha ? (
              <EyeOff size={17} strokeWidth={2} />
            ) : (
              <Eye size={17} strokeWidth={2} />
            )}
          </button>
        </div>

        <small>Deve ter pelo menos 6 caracteres.</small>
      </label>
      )}

      <label>
        CPF
        <input
          type="text"
          required
          inputMode="numeric"
          minLength={14}
          maxLength={14}
          title="Informe os 11 dígitos do CPF"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(mascararCpf(e.target.value))}
        />
      </label>

      <label>
        Telefone
        <input
          type="tel"
          required
          inputMode="numeric"
          minLength={14}
          maxLength={15}
          title="Informe DDD e número, com 10 ou 11 dígitos"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
        />
      </label>

      <label>
        Data de nascimento
        <input
          type="date"
          required
          value={dataNasc}
          onChange={(e) => setDataNasc(e.target.value)}
        />
      </label>

      <div className={styles.linhaForm}>
        <label>
          Cidade
          <input
            type="text"
            required
            placeholder="Sua cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </label>

        <label>
          Estado
          <input
            type="text"
            required
            maxLength={2}
            placeholder="UF"
            value={estado}
            onChange={(e) => setEstado(e.target.value.toUpperCase())}
          />
        </label>
      </div>

      <label>
        Você prefere trabalhar como?
        <select value={perfil} disabled>
          <option value="freelancer">Freelancer</option>
          <option value="contratante">Contratante</option>
        </select>
      </label>

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
        {carregando ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className={styles.linkLogin}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  )
}