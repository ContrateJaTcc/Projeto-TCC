import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import styles from './camposenha.module.css'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/* Campo de senha com o olho para mostrar o que foi digitado (o estilo do campo vem da página) */
export default function CampoSenha(props: Props) {
  const [ver, setVer] = useState(false)
  /* Senha "errada" por causa do Caps Lock é o erro de login mais comum */
  const [maiusculas, setMaiusculas] = useState(false)

  const conferirCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setMaiusculas(e.getModifierState?.('CapsLock') ?? false)

  return (
    <>
      <span className={styles.campo}>
        <input
          {...props}
          type={ver ? 'text' : 'password'}
          onKeyUp={(e) => {
            conferirCaps(e)
            props.onKeyUp?.(e)
          }}
          onBlur={(e) => {
            setMaiusculas(false)
            props.onBlur?.(e)
          }}
        />
        <button
          type="button"
          className={styles.olho}
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
          aria-pressed={ver}
          title={ver ? 'Esconder senha' : 'Mostrar senha'}
        >
          {ver ? <EyeOff size={18} strokeWidth={2.2} /> : <Eye size={18} strokeWidth={2.2} />}
        </button>
      </span>
      {maiusculas && (
        <span className={styles.caps} role="status">
          Caps Lock ligado
        </span>
      )}
    </>
  )
}
