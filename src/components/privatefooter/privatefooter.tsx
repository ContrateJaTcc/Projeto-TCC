import { useRole } from '../../context/useRole'
import styles from './privatefooter.module.css'

export default function PrivateFooter() {
  const { role } = useRole()
  const papel = role ?? 'freelancer'
  const base = papel === 'freelancer' ? '/freelancer' : '/contratante'
  const ano = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <span className={styles.logo}>ContrateJá</span>
      <nav className={styles.links}>
        <a href={base}>Dashboard</a>
        <a href={`${base}/historico`}>Histórico</a>
        <a href={`${base}/mensagens`}>Mensagens</a>
      </nav>
      <span className={styles.copyright}>© {ano} ContrateJá. Todos os direitos reservados.</span>
    </footer>
  )
}
