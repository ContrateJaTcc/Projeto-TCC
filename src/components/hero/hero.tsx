import { Search } from 'lucide-react'
import styles from './hero.module.css'

interface HeroProps {
    perfil: 'free' | 'cont'
}

export default function Hero({ perfil }: HeroProps) {
    const conteudo = {
        free: {
            tit: 'Conecte-se.',
            subt: 'Evolua e Conquiste',
            placeholder: 'Procure Projetos...',
        },
        cont: {
            tit: 'Conecte-se.',
            subt: 'Poste e Receba',
            placeholder: 'Procure Profissionais...',
        }
    }

    const c = conteudo[perfil]

return (
    <section className={`${styles.hero} ${perfil === 'cont' ? styles.heroCont : ''}`}>
        <div className={styles.heroTexto}>
            <h1>
                {c.tit}<br/>
                <span className={styles.heroSubt}>{c.subt}</span>
            </h1>

            <div className={styles.heroAcoes}>
                <div className={styles.heroBusca}>
                    <input type="text" placeholder={c.placeholder} />
                    <button aria-label="Buscar"><Search size={18} strokeWidth={2.4} /></button>
                </div>
                <button className={styles.heroBtn}>Saiba Mais Sobre Nós</button>
            </div>
        </div>

        <div className={styles.heroBruxa}></div>
    </section>
)

}