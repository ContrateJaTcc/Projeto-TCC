import { Link } from 'react-router-dom'
import {
  Award, BellRing, CloudSun, Code2, Database, Handshake, KeyRound, ListChecks, MessagesSquare, Server, ShieldCheck, Sparkles, Target, Trophy, Users,
  Shield, GraduationCap, Wallet, BookOpenText, ExternalLink,
} from 'lucide-react'
import PaginaPublica from '../components/layout/topopublico'
import Avatar from '../components/avatar/avatar'
import { URL_DOCS_API } from '../services/api'
import styles from './Sobre.module.css'

/*
 * Equipe do TCC: preencha com os integrantes (a seção só aparece com pelo menos um nome).
 * Ex.: { nome: 'Maria Souza', papel: 'Front-end e design' }
 */
const EQUIPE: { nome: string; papel: string }[] = []

const OBJETIVOS = [
  { icone: Handshake, titulo: 'Aproximar', texto: 'Ligar quem precisa de um serviço a freelancers da própria região ou de qualquer lugar, sem intermediário cobrando taxa.' },
  { icone: Trophy, titulo: 'Motivar', texto: 'Transformar cada trabalho entregue em progresso: XP, níveis, insígnias, missões da semana e ranking.' },
  { icone: ShieldCheck, titulo: 'Dar confiança', texto: 'Avaliações dos dois lados, histórico com linha do tempo, denúncias e moderação para manter a plataforma segura.' },
]

const RECURSOS = [
  { icone: Target, texto: 'Projetos com categoria, valor, prazo e local' },
  { icone: Handshake, texto: 'Candidaturas com contraproposta de valor e prazo' },
  { icone: ListChecks, texto: 'Etapas do projeto com barra de progresso' },
  { icone: MessagesSquare, texto: 'Chat em tempo real com imagens e PDF' },
  { icone: Award, texto: 'XP, níveis, insígnias, missões e ranking' },
  { icone: BellRing, texto: 'Notificações, alertas de busca e push no celular' },
  { icone: Users, texto: 'Perfil público com link para divulgar' },
  { icone: CloudSun, texto: 'Cenário em pixel art com clima e estações' },
  { icone: Wallet, texto: 'Pagamento simulado com garantia, por etapa e bônus' },
  { icone: Shield, texto: 'Guildas de freelancers e mascote que cresce com o nível' },
  { icone: GraduationCap, texto: 'Testes de habilidade com selo no perfil' },
  { icone: ShieldCheck, texto: 'Avaliação às cegas e aviso de contato por fora' },
]

const TECNOLOGIAS = [
  { icone: Code2, grupo: 'Front-end', itens: ['React 19', 'TypeScript', 'Vite', 'React Router', 'CSS Modules', 'Lucide'] },
  { icone: Server, grupo: 'Back-end', itens: ['Node.js', 'Express', 'JWT', 'Web Push', 'Nodemailer'] },
  { icone: Database, grupo: 'Dados', itens: ['MySQL', 'Knex (migrações)'] },
  { icone: KeyRound, grupo: 'Qualidade', itens: ['bcrypt', 'ESLint', 'Playwright (testes)', 'node:test', 'GitHub Actions', 'Swagger', 'Vercel'] },
]

/* Sobre o projeto: o que é, para que serve e como foi feito */
export default function Sobre() {
  return (
    <PaginaPublica>
      <div className={styles.pagina}>
        <section className={`${styles.abertura} entrada`}>
          <span className={styles.selo}>
            <Sparkles size={14} strokeWidth={2.4} />
            Trabalho de Conclusão de Curso
          </span>
          <h1>Sobre o ContrateJá</h1>
          <p>
            Uma plataforma que conecta contratantes e freelancers e trata cada trabalho como uma jornada: quem entrega bem ganha
            experiência, sobe de nível e coleciona conquistas, tudo num cenário de castelo em pixel art.
          </p>
          <div className={styles.botoes}>
            <Link to="/cadastro" className={styles.btnPrincipal}>Criar conta</Link>
            <Link to="/" className={styles.btnSecundario}>Conhecer a plataforma</Link>
          </div>
        </section>

        <h2 className="placa">Objetivos</h2>
        <div className={styles.grade3}>
          {OBJETIVOS.map(({ icone: Icone, titulo, texto }) => (
            <article key={titulo} className={styles.cartao}>
              <span className={styles.icone}><Icone size={20} strokeWidth={2.2} /></span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>

        <h2 className="placa">O que dá para fazer</h2>
        <ul className={styles.recursos}>
          {RECURSOS.map(({ icone: Icone, texto }) => (
            <li key={texto}>
              <Icone size={17} strokeWidth={2.2} />
              {texto}
            </li>
          ))}
        </ul>

        <h2 className="placa">Tecnologias</h2>
        <div className={styles.grade4}>
          {TECNOLOGIAS.map(({ icone: Icone, grupo, itens }) => (
            <article key={grupo} className={styles.cartao}>
              <span className={styles.icone}><Icone size={20} strokeWidth={2.2} /></span>
              <h3>{grupo}</h3>
              <div className={styles.etiquetas}>
                {itens.map((i) => <span key={i}>{i}</span>)}
              </div>
            </article>
          ))}
        </div>

        <h2 className="placa">Documentação da API</h2>
        <article className={`${styles.cartao} ${styles.docs}`}>
          <span className={styles.icone}><BookOpenText size={20} strokeWidth={2.2} /></span>
          <div>
            <h3>Todas as rotas do servidor, testáveis pelo navegador</h3>
            <p>
              A página é gerada a partir das rotas de verdade do back-end (Swagger / OpenAPI): mostra o método, o caminho, quem pode usar e
              se precisa de login. Dá para fazer login, colar o token em "Authorize" e chamar as rotas ali mesmo.
            </p>
          </div>
          <a href={URL_DOCS_API} target="_blank" rel="noreferrer" className={styles.btnSecundario}>
            Abrir a documentação <ExternalLink size={15} strokeWidth={2.4} aria-hidden="true" />
          </a>
        </article>

        {EQUIPE.length > 0 && (
          <>
            <h2 className="placa">Equipe</h2>
            <div className={styles.grade4}>
              {EQUIPE.map((p) => (
                <article key={p.nome} className={`${styles.cartao} ${styles.pessoa}`}>
                  <Avatar nome={p.nome} size={64} />
                  <h3>{p.nome}</h3>
                  <p>{p.papel}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </PaginaPublica>
  )
}
