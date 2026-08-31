import Avatar from '../avatar/avatar'
import styles from './testimonials.module.css'

const depoimentos = [
  {
    nome: 'Marina Alves',
    area: 'Web Design · Nível 12',
    texto:
      'Comecei sem nenhuma experiência e hoje já fechei vários projetos. Subir de nível e ganhar insígnias me motiva muito mais do que só ver estrelinhas.',
  },
  {
    nome: 'Lucas Tavares',
    area: 'Marketing · Nível 9',
    texto: 'A gamificação faz toda diferença. Ver meu ranking subir é tão bom quanto receber o pagamento.',
  },
  {
    nome: 'Bianca Souza',
    area: 'Administração · Nível 15',
    texto: 'Diferente de outras plataformas, aqui meu histórico realmente importa pros contratantes.',
  },
  {
    nome: 'Rafael Costa',
    area: 'Finanças · Nível 7',
    texto: 'Taxa fixa e sem letra miúda. Sei exatamente quanto vou receber em cada projeto.',
  },
]

export default function Testimonials() {
  return (
    <section className={styles.depoimentos}>
      <h2>O que nossos clientes dizem</h2>
      <div className={styles.grid}>
        {depoimentos.map((d) => (
          <article key={d.nome} className={styles.card}>
            <Avatar nome={d.nome} size={42} />
            <strong>{d.nome}</strong>
            <span className={styles.area}>{d.area}</span>
            <p>{d.texto}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
