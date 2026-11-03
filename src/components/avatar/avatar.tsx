import { useState } from 'react'
import { NOME_MOLDURA } from '../../utils/aparencia'
import styles from './avatar.module.css'

interface AvatarProps {
  nome: string
  size?: number
  /* Foto do usuário */
  foto?: string | null
  /* Nível do freelancer: com ele o avatar ganha moldura (madeira, prata, ouro ou mágica) */
  nivel?: number
  /* Moldura especial (da loja ou da temporada do ranking): vale mais que a do nível */
  especial?: string | null
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

/* Moldura por nível: 1 e 2 madeira, 3 e 4 prata, 5 a 7 ouro, 8 em diante mágica */
function moldura(nivel?: number) {
  if (!nivel) return null
  if (nivel >= 8) return { classe: styles.magica, nome: `Moldura mágica (nível ${nivel})` }
  if (nivel >= 5) return { classe: styles.ouro, nome: `Moldura de ouro (nível ${nivel})` }
  if (nivel >= 3) return { classe: styles.prata, nome: `Moldura de prata (nível ${nivel})` }
  return { classe: styles.madeira, nome: `Moldura de madeira (nível ${nivel})` }
}

export default function Avatar({ nome, size = 44, foto, nivel, especial }: AvatarProps) {
  const [falhou, setFalhou] = useState(false)

  /* Reset de erro da foto */
  const [fotoAnterior, setFotoAnterior] = useState(foto)
  if (fotoAnterior !== foto) {
    setFotoAnterior(foto)
    setFalhou(false)
  }

  const rosto =
    foto && !falhou ? (
      <img
        className={styles.foto}
        src={foto}
        alt={nome}
        style={{ width: size, height: size }}
        onError={() => setFalhou(true)}
      />
    ) : (
      <span
        className={styles.avatar}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {iniciais(nome)}
      </span>
    )

  const aro = especial && styles[especial] ? { classe: styles[especial], nome: NOME_MOLDURA[especial] ?? 'Moldura especial' } : moldura(nivel)
  if (!aro) return rosto

  return (
    <span className={`${styles.moldura} ${aro.classe}`} title={aro.nome} data-moldura={especial ?? undefined}>
      {rosto}
    </span>
  )
}
