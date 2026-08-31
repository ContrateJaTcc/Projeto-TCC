import Avatar from '../avatar/avatar'
import styles from './profilecard.module.css'

interface ProfileCardProps {
  nome: string
  bio: string
  progresso: number
}

export default function ProfileCard({ nome, bio, progresso }: ProfileCardProps) {
  return (
    <div className={styles.card}>
      <Avatar nome={nome} size={55} />
      <div className={styles.texto}>
        <strong>{nome}</strong>
        <span>{bio}</span>
        <div className={styles.barra}>
          <div className={styles.progresso} style={{ width: `${progresso}%` }} />
        </div>
      </div>
    </div>
  )
}
