import { useEffect, useState } from 'react'
import styles from './avatar.module.css'

interface AvatarProps {
  nome: string
  size?: number
  /* Foto do usuario: data URI vinda do banco ou endereco externo.
     Sem foto, ou se ela falhar ao carregar, caem as iniciais do nome. */
  foto?: string | null
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

export default function Avatar({ nome, size = 44, foto }: AvatarProps) {
  const [falhou, setFalhou] = useState(false)

  /* Trocar de foto precisa limpar a falha anterior, senao o avatar ficaria
     preso nas iniciais depois que o usuario corrige a imagem. */
  useEffect(() => {
    setFalhou(false)
  }, [foto])

  if (foto && !falhou) {
    return (
      <img
        className={styles.foto}
        src={foto}
        alt={nome}
        style={{ width: size, height: size }}
        onError={() => setFalhou(true)}
      />
    )
  }

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {iniciais(nome)}
    </span>
  )
}
