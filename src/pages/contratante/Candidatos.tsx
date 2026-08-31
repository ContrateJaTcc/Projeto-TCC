import { Star } from 'lucide-react'
import { getCandidatos } from '../../data/mock'
import Avatar from '../../components/avatar/avatar'
import styles from './Candidatos.module.css'

export default function Candidatos() {
  const candidatos = getCandidatos()

  return (
    <div className={styles.pagina}>
      <h1>Escolher candidatos</h1>
      <div className={styles.lista}>
        {candidatos.map((c) => (
          <article key={c.id} className={styles.card}>
            <Avatar nome={c.nome} size={54} />
            <div className={styles.info}>
              <span className={styles.projeto}>{c.projetoTitulo}</span>
              <div className={styles.nomeELinha}>
                <strong>{c.nome}</strong>
                <span className={styles.nota}><Star size={13} strokeWidth={2.2} fill="currentColor" /> {c.nota}</span>
              </div>
              <span className={styles.especialidade}>{c.especialidade}</span>
              <p className={styles.proposta}>{c.proposta}</p>
            </div>
            <div className={styles.direita}>
              <span className={styles.valor}>{c.valorProposto}</span>
              <div className={styles.acoes}>
                <button type="button" className={styles.recusar}>Recusar</button>
                <button type="button" className={styles.aceitar}>Aceitar</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
