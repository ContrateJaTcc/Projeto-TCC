import ProjectCard, { type Projeto } from './projectcard'
import styles from './recommended.module.css'

const projetos: Projeto[] = [
  {
    titulo: 'Landing page para loja virtual',
    categoria: 'Web Design',
    orcamento: 'R$350 - 600',
    prazo: '7 dias',
    nota: 4.8,
    descricao: 'Criação de landing page responsiva com foco em conversão para e-commerce de moda.',
  },
  {
    titulo: 'Redesign de site institucional',
    categoria: 'Web Design',
    orcamento: 'R$500 - 900',
    prazo: '10 dias',
    nota: 4.7,
    descricao: 'Atualização visual completa de site institucional, mantendo a identidade de marca.',
  },
  {
    titulo: 'Gestão de redes sociais',
    categoria: 'Marketing',
    orcamento: 'R$300 - 500/mês',
    prazo: 'Contínuo',
    nota: 4.9,
    descricao: 'Planejamento e produção de conteúdo para Instagram e TikTok de uma pequena empresa.',
  },
  {
    titulo: 'Campanha de tráfego pago',
    categoria: 'Marketing',
    orcamento: 'R$400 - 700',
    prazo: '15 dias',
    nota: 4.6,
    descricao: 'Estruturação de campanhas no Meta Ads e Google Ads para lançamento de produto.',
  },
  {
    titulo: 'Organização financeira para autônomo',
    categoria: 'Finanças',
    orcamento: 'R$200 - 350',
    prazo: '5 dias',
    nota: 4.9,
    descricao: 'Planilha e relatório mensal de fluxo de caixa para profissional autônomo.',
  },
  {
    titulo: 'Suporte administrativo remoto',
    categoria: 'Administração',
    orcamento: 'R$250 - 400/mês',
    prazo: 'Contínuo',
    nota: 4.7,
    descricao: 'Organização de agenda, e-mails e documentos para um pequeno escritório.',
  },
]

export default function Recommended() {
  return (
    <section className={styles.recomendados}>
      <h2>Projetos que você pode gostar</h2>
      <div className={styles.grid}>
        {projetos.map((p) => (
          <ProjectCard key={p.titulo} projeto={p} />
        ))}
      </div>
    </section>
  )
}
