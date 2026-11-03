import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, FlaskConical, Megaphone, X } from 'lucide-react'
import { vendoComo, voltarAoSupremo } from '../../services/api'
import { demoAtivo } from '../../services/demoflag'
import { useRole } from '../../context/useRole'
import { useCenarioGlobal } from '../../utils/cenarioglobal'
import styles from './faixas.module.css'

/* Supremo vendo o site como outra pessoa: lembra disso e leva de volta */
export function FaixaSupremo() {
  const { setRole } = useRole()
  const navigate = useNavigate()
  const nome = vendoComo()

  if (!nome) return null

  function voltar() {
    const papel = voltarAoSupremo()
    if (!papel) return
    setRole(papel)
    navigate(`/${papel}`, { viewTransition: true })
  }

  return (
    <div className={`${styles.faixa} ${styles.supremo}`} role="status">
      <Crown size={16} strokeWidth={2.4} />
      <span>
        Você está vendo o site como <strong>{nome}</strong>.
      </span>
      <button type="button" onClick={voltar}>
        Voltar ao painel supremo
      </button>
    </div>
  )
}

/* Modo demonstração: lembra que os dados são de exemplo e deixa sair */
export function FaixaDemo() {
  const { sair } = useRole()
  const navigate = useNavigate()

  if (!demoAtivo()) return null

  function sairDaDemo() {
    sair()
    navigate('/login', { viewTransition: true })
  }

  return (
    <div className={`${styles.faixa} ${styles.demo}`} role="status">
      <FlaskConical size={16} strokeWidth={2.4} />
      <span>
        <strong>Modo demonstração:</strong> tudo aqui é de exemplo e some quando você sair.
      </span>
      <button type="button" onClick={sairDaDemo}>
        Sair do modo
      </button>
    </div>
  )
}

const CHAVE_FECHADO = 'aviso-fechado'

/* Aviso que o supremo deixou para o site inteiro; cada pessoa pode fechar (volta se o texto mudar) */
export function FaixaAviso() {
  const { aviso } = useCenarioGlobal()
  const [fechado, setFechado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_FECHADO)
    } catch {
      return null
    }
  })

  if (!aviso || fechado === aviso) return null

  function fechar() {
    try {
      localStorage.setItem(CHAVE_FECHADO, aviso ?? '')
    } catch {
      /* Sem armazenamento: fecha só agora */
    }
    setFechado(aviso)
  }

  return (
    <div className={`${styles.faixa} ${styles.aviso}`} role="status">
      <Megaphone size={16} strokeWidth={2.4} />
      <span>{aviso}</span>
      <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar aviso">
        <X size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}
