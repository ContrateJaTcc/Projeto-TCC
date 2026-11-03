import { Link } from 'react-router-dom'
import { useRole } from '../../context/useRole'
import { t, useIdioma } from '../../utils/idioma'
import styles from './privatefooter.module.css'

export default function PrivateFooter() {
  const { role } = useRole()
  useIdioma()
  const base = `/${role ?? 'freelancer'}`
  const ehAdmin = role === 'administrador'
  const ano = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <span className={styles.logo}>ContrateJá</span>
      <nav className={styles.links}>
        <Link to="/" viewTransition>{t('Página inicial')}</Link>
        <Link to={base} viewTransition>{t(ehAdmin ? 'Painel' : 'Dashboard')}</Link>
        {!ehAdmin && <Link to={`${base}/historico`} viewTransition>{t('Histórico')}</Link>}
        {!ehAdmin && <Link to={`${base}/mensagens`} viewTransition>{t('Mensagens')}</Link>}
        <Link to="/termos" viewTransition>{t('Termos de uso')}</Link>
        <Link to="/ajuda" viewTransition>{t('Ajuda')}</Link>
        <Link to="/tv" viewTransition>{t('Modo TV')}</Link>
        <Link to="/sobre" viewTransition>{t('Sobre')}</Link>
      </nav>
      <span className={styles.copyright}>© {ano} ContrateJá. {t('Todos os direitos reservados.')}</span>
    </footer>
  )
}
