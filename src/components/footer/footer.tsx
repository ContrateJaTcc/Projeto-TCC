import { Link } from 'react-router-dom'
import { FacebookIcon, InstagramIcon, LinkedinIcon } from './socialicons'
import { t, useIdioma } from '../../utils/idioma'
import styles from './footer.module.css'

export default function Footer() {
  const ano = new Date().getFullYear()
  useIdioma()

  return (
    <footer className={styles.footer}>
      <div className={styles.conteudo}>
        <div className={styles.marca}>
          <span className={styles.logo}>ContrateJá</span>
          <p>{t('A plataforma que transforma seu trabalho em uma jornada de conquistas e evolução profissional.')}</p>
          <div className={styles.social}>
            <a href="/#" aria-label="Facebook"><FacebookIcon size={17} strokeWidth={2} /></a>
            <a href="/#" aria-label="Instagram"><InstagramIcon size={17} strokeWidth={2} /></a>
            <a href="/#" aria-label="LinkedIn"><LinkedinIcon size={17} strokeWidth={2} /></a>
          </div>
        </div>

        <div className={styles.coluna}>
          <h3>{t('Navegação')}</h3>
          <Link to="/">{t('Início')}</Link>
          <a href="/#categorias">{t('Encontre projetos')}</a>
          <a href="/#como-funciona">{t('Como funciona')}</a>
          <a href="/#diferenciais">{t('Comparação')}</a>
          <a href="/#depoimentos">{t('Clientes')}</a>

          <h3 className={styles.subtitulo}>{t('Suporte')}</h3>
          <a href="/#contato">{t('Fale conosco')}</a>
          <Link to="/termos" viewTransition>{t('Termos de uso')}</Link>
          <Link to="/sobre" viewTransition>{t('Sobre o projeto')}</Link>
          <Link to="/ajuda" viewTransition>{t('Central de ajuda')}</Link>
          <Link to="/tv" viewTransition>{t('Modo TV')}</Link>
        </div>

        <div className={styles.coluna}>
          <h3>{t('Freelancers')}</h3>
          <a href="/#categorias">{t('Encontre projetos')}</a>
          <Link to="/cadastro">{t('Portfólio')}</Link>
          <Link to="/cadastro">{t('Candidate-se')}</Link>
        </div>

        <div className={styles.coluna}>
          <h3>{t('Contratantes')}</h3>
          <Link to="/cadastro">{t('Poste projeto')}</Link>
          <a href="/#categorias">{t('Encontre freelancers')}</a>
        </div>
      </div>

      <div className={styles.rodape}>
        <span className={styles.copyright}>© {ano} ContrateJá. {t('Todos os direitos reservados.')}</span>
        <div className={styles.rodapeLinks}>
          <Link to="/termos" viewTransition>{t('Termos de uso')}</Link>
          <span className={styles.ponto} />
          <Link to="/termos#privacidade" viewTransition>{t('Política de privacidade')}</Link>
        </div>
      </div>
    </footer>
  )
}
