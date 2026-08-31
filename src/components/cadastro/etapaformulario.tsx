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

export default function EtapaFormulario({ perfil, onVoltar, onCriarConta }: EtapaFormularioProps) {
  const [mostrarSenha, setMostrarSenha] = useState(false)

  return (
    <form
      className={styles.formulario}
      onSubmit={(e) => {
        e.preventDefault()
        onCriarConta()
      }}
    >
      <button type="button" className={styles.btnVoltar} onClick={onVoltar}><ArrowLeft size={15} strokeWidth={2.4} /> Voltar</button>
      <h2>Crie sua conta</h2>

      <div className={styles.botoesSociais}>
        <button type="button" className={styles.btnSocial}>Continuar com Google</button>
        <button type="button" className={styles.btnSocial}>Continuar com Apple</button>
      </div>

      <div className={styles.divisor}><span>ou crie manualmente</span></div>

      <div className={styles.linhaForm}>
        <label>
          Primeiro nome
          <input type="text" required placeholder="Seu nome" />
        </label>
        <label>
          Sobrenome
          <input type="text" required placeholder="Seu sobrenome" />
        </label>
      </div>

      <label>
        E-mail
        <input type="email" required placeholder="seu@email.com" />
      </label>

      <label>
        Senha
        <div className={styles.campoSenha}>
          <input type={mostrarSenha ? 'text' : 'password'} required minLength={6} placeholder="Crie uma senha" />
          <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label="Mostrar senha">
            {mostrarSenha ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
          </button>
        </div>
        <small>Deve ter pelo menos 6 caracteres.</small>
      </label>

      <label>
        Você prefere trabalhar como?
        <select defaultValue={perfil}>
          <option value="freelancer">Freelancer</option>
          <option value="contratante">Contratante</option>
        </select>
      </label>

      <button type="submit" className={styles.btnPrimario}>Criar conta</button>

      <p className={styles.linkLogin}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  )
}
