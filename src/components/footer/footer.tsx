import { FacebookIcon, InstagramIcon, LinkedinIcon } from './socialicons'
import styles from './footer.module.css'

export default function Footer() {
  const ano = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.conteudo}>
        <div className={styles.marca}>
          <span className={styles.logo}>ContrateJá</span>
          <p>A plataforma que transforma seu trabalho em uma jornada de conquistas e evolução profissional.</p>
          <div className={styles.social}>
            <a href="#" aria-label="Facebook"><FacebookIcon size={17} strokeWidth={2} /></a>
            <a href="#" aria-label="Instagram"><InstagramIcon size={17} strokeWidth={2} /></a>
            <a href="#" aria-label="LinkedIn"><LinkedinIcon size={17} strokeWidth={2} /></a>
          </div>
        </div>

        <div className={styles.coluna}>
          <h3>Navegação</h3>
          <a href="/">Início</a>
          <a href="#categorias">Encontre projetos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#diferenciais">Comparação</a>
          <a href="#depoimentos">Clientes</a>

          <h3 className={styles.subtitulo}>Suporte</h3>
          <a href="#contato">Fale conosco</a>
        </div>

        <div className={styles.coluna}>
          <h3>Freelancers</h3>
          <a href="#categorias">Encontre projetos</a>
          <a href="/cadastro">Portfólio</a>
          <a href="/cadastro">Candidate-se</a>
        </div>

        <div className={styles.coluna}>
          <h3>Contratantes</h3>
          <a href="/cadastro">Poste projeto</a>
          <a href="#categorias">Encontre freelancers</a>
        </div>
      </div>

      <div className={styles.rodape}>
        <span className={styles.copyright}>© {ano} ContrateJá. Todos os direitos reservados.</span>
        <div className={styles.rodapeLinks}>
          <a href="#">Termos de uso</a>
          <span className={styles.ponto} />
          <a href="#">Política de privacidade</a>
          <span className={styles.ponto} />
          <a href="#">Cookies</a>
        </div>
      </div>
    </footer>
  )
}
