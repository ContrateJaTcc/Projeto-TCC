import { UserPlus, Search, TrendingUp, Sparkles, Megaphone, Handshake, Star } from 'lucide-react'
import styles from './howitworks.module.css'

interface HowItWorksProps {
  perfil: 'free' | 'cont'
}

const etapasPorPerfil = {
  free: [
    { icon: UserPlus, titulo: 'Cadastre-se', texto: 'Faça sua conta e entre na plataforma' },
    { icon: Search, titulo: 'Encontre', texto: 'Explore projetos e candidate-se' },
    { icon: TrendingUp, titulo: 'Evolua', texto: 'Ganhe XP e suba no ranking' },
    { icon: Sparkles, titulo: 'Personalize', texto: 'Deixe seu perfil apresentável para contratantes' },
  ],
  cont: [
    { icon: UserPlus, titulo: 'Cadastre-se', texto: 'Faça sua conta e entre na plataforma' },
    { icon: Megaphone, titulo: 'Poste', texto: 'Poste projetos e receba concluídos' },
    { icon: Handshake, titulo: 'Escolha', texto: 'Escolha freelancers para realizar projetos' },
    { icon: Star, titulo: 'Avalie', texto: 'Avalie profissionais com comentários e notas' },
  ],
}

export default function HowItWorks({ perfil }: HowItWorksProps) {
  const etapas = etapasPorPerfil[perfil]

  return (
    <section className={styles.como} id="como-funciona">
      <h2>Como Funciona?</h2>

      <div className={styles.grid}>
        {etapas.map((e) => (
          <div key={e.titulo} className={styles.card}>
            <span className={styles.icone}><e.icon size={22} strokeWidth={2} /></span>
            <h3>{e.titulo}</h3>
            <p>{e.texto}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
