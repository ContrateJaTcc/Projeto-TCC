import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import logo from '../components/imgs/logo.png'
import styles from './Termos.module.css'

/* Seções */
const SECOES = [
  {
    id: 'aceite',
    titulo: '1. Aceite dos termos',
    texto: [
      'Ao criar uma conta no ContrateJá você declara que leu e concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize a plataforma.',
      'Para se cadastrar é preciso ter 18 anos ou mais e informar dados verdadeiros (nome, CPF, telefone, cidade e estado).',
    ],
  },
  {
    id: 'plataforma',
    titulo: '2. O que é o ContrateJá',
    texto: [
      'O ContrateJá aproxima contratantes, que publicam projetos, e freelancers, que se candidatam a eles. A plataforma não é parte do contrato entre os dois: preço, prazo e forma de pagamento são combinados entre contratante e freelancer.',
      'Níveis, XP e insígnias são elementos de gamificação que mostram a reputação dentro da plataforma e não têm valor financeiro.',
    ],
  },
  {
    id: 'conta',
    titulo: '3. Sua conta',
    texto: [
      'Você é responsável por manter sua senha em sigilo. Ela é guardada apenas na forma de hash (bcrypt) e ninguém da equipe consegue lê-la.',
      'Sua sessão expira automaticamente após 1 hora. Se perceber acesso indevido, troque a senha em "Meu perfil" ou use "Esqueci minha senha".',
    ],
  },
  {
    id: 'regras',
    titulo: '4. Regras de convivência',
    texto: [
      'É proibido publicar projetos ilegais, enganosos ou discriminatórios; usar a plataforma para spam, golpes ou assédio; criar contas falsas; e manipular avaliações.',
      'As avaliações devem refletir a experiência real do trabalho e ser curtas e respeitosas (até 280 caracteres).',
    ],
  },
  {
    id: 'fluxo',
    titulo: '5. Projetos, convites e entregas',
    texto: [
      'O contratante pode convidar um freelancer para um projeto aberto. Ao aceitar o convite, o freelancer envia uma candidatura, que o contratante confirma.',
      'Quando terminar, o freelancer marca o trabalho como entregue; o contratante confere e finaliza o projeto. Só depois da finalização os dois podem se avaliar.',
    ],
  },
  {
    id: 'moderacao',
    titulo: '6. Moderação',
    texto: [
      'A administração pode suspender ou banir contas e cancelar projetos que violem estes termos. Contas suspensas ou banidas perdem o acesso imediatamente.',
    ],
  },
  {
    id: 'privacidade',
    titulo: '7. Privacidade e dados pessoais (LGPD)',
    texto: [
      'Coletamos apenas os dados necessários para o funcionamento do serviço: identificação, contato, localização, perfil profissional e o histórico de uso (projetos, candidaturas, mensagens e avaliações).',
      'E-mail, CPF e telefone nunca aparecem no seu perfil público. Outros usuários veem somente nome, foto, cidade, descrição, áreas de atuação, portfólio, nível, insígnias e avaliações.',
      'Você pode pedir a correção ou a exclusão dos seus dados a qualquer momento, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
    ],
  },
  {
    id: 'alteracoes',
    titulo: '8. Alterações',
    texto: [
      'Estes termos podem ser atualizados. Mudanças importantes serão avisadas pelas notificações da plataforma.',
    ],
  },
]

export default function Termos() {
  const navigate = useNavigate()

  return (
    <div className={styles.pagina}>
      <header className={styles.topo}>
        <Link to="/" className={styles.logo} viewTransition>
          <img src={logo} alt="" />
          <span>Contrate Já</span>
        </Link>
        <button type="button" className={styles.voltar} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} strokeWidth={2.4} /> Voltar
        </button>
      </header>

      <main className={styles.conteudo}>
        <h1 className="titulo-magico">Termos de Uso e Privacidade</h1>
        <p className={styles.atualizado}>Última atualização: outubro de 2026</p>

        <nav className={styles.sumario} aria-label="Sumário">
          {SECOES.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.titulo}</a>
          ))}
        </nav>

        {SECOES.map((s) => (
          <section key={s.id} id={s.id} className={styles.secao}>
            <h2>{s.titulo}</h2>
            {s.texto.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </main>
    </div>
  )
}
