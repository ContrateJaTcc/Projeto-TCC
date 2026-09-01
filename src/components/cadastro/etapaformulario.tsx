import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import styles from './cadastro.module.css'
import type { Perfil } from './etapaperfil'

interface EtapaFormularioProps {
  perfil: Perfil
  onVoltar: () => void
  onCriarConta: () => void
}

export default function EtapaFormulario({
  perfil,
  onVoltar,
  onCriarConta,
}: EtapaFormularioProps) {
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setCarregando(true)

    try {
      const resposta = await fetch(
        'https://backendtcc-zeta.vercel.app/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: `${nome} ${sobrenome}`.trim(),
            email,
            senha,
            cpf,
            telefone,
            data_nasc: dataNasc,
            cidade,
            estado,
            tipo: perfil,
          }),
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(dados.erro || 'Erro ao criar conta.')
        return
      }

      onCriarConta()
    } catch (erro) {
      console.error(erro)
      setErro('Não foi possível conectar ao servidor.')
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

      <div className={styles.botoesSociais}>
        <button type="button" className={styles.btnSocial}>
          Continuar com Google
        </button>

        <button type="button" className={styles.btnSocial}>
          Continuar com Apple
        </button>
      </div>

      <div className={styles.divisor}>
        <span>ou crie manualmente</span>
      </div>

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

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

      <label>
        CPF
        <input
          type="text"
          required
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />
      </label>

      <label>
        Telefone
        <input
          type="tel"
          required
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
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
        <p style={{ color: 'red' }}>
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