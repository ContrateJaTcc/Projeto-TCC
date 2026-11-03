import { Link } from 'react-router-dom'
import logo from '../imgs/logo.png'
import { useRole } from '../../context/useRole'
import BotaoTema from '../botaotema/botaotema'
import Footer from '../footer/footer'
import { t, useIdioma } from '../../utils/idioma'
import styles from './topopublico.module.css'

/*
 * Moldura das páginas públicas avulsas (perfil público, sobre): logo, tema e entrar.
 * data-area="home" faz o tema claro (pôr do sol) valer aqui também.
 */
export default function PaginaPublica({ children }: { children: React.ReactNode }) {
  const { role } = useRole()
  useIdioma()

  return (
    <div data-area="home" className={styles.moldura}>
      <header className={styles.topo}>
        <Link to="/" className={styles.logo} viewTransition>
          <img src={logo} alt="" />
          <span>Contrate Já</span>
        </Link>
        <nav className={styles.acoes} aria-label="Navegação">
          <Link to="/ajuda" className={styles.link} viewTransition>{t('Ajuda')}</Link>
          <Link to="/sobre" className={styles.link} viewTransition>{t('Sobre')}</Link>
          <BotaoTema className={styles.tema} />
          {role ? (
            <Link to={`/${role}`} className={styles.entrar} viewTransition>{t('Minha área')}</Link>
          ) : (
            <>
              <Link to="/login" className={styles.link} viewTransition>{t('Entrar')}</Link>
              <Link to="/cadastro" className={styles.entrar} viewTransition>{t('Criar conta')}</Link>
            </>
          )}
        </nav>
      </header>
      <main className={styles.conteudo}>{children}</main>
      <Footer />
    </div>
  )
}
