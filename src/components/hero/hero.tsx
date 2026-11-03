import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import logo from '../imgs/logo.png'
import { useRole } from '../../context/useRole'
import styles from './hero.module.css'

interface HeroProps {
    perfil: 'free' | 'cont'
}

export default function Hero({ perfil }: HeroProps) {
    const navigate = useNavigate()
    const { role } = useRole()
    const [busca, setBusca] = useState('')

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

    /*
     * A busca leva para a lista certa já filtrada: projetos abertos (freelancer) ou freelancers (contratante).
     * Sem login, passa pelo login e volta para a busca depois de entrar.
     */
    function buscar(e: React.FormEvent) {
        e.preventDefault()
        const termo = encodeURIComponent(busca.trim())
        const destino = perfil === 'free'
            ? `/freelancer${termo ? `?busca=${termo}` : ''}`
            : `/contratante/freelancers${termo ? `?busca=${termo}` : ''}`
        const papel = perfil === 'free' ? 'freelancer' : 'contratante'
        if (role === papel) navigate(destino, { viewTransition: true })
        else if (role) navigate(`/${role}`, { viewTransition: true })
        else navigate('/login', { state: { destino }, viewTransition: true })
    }

return (
    <section className={`${styles.hero} ${perfil === 'cont' ? styles.heroCont : ''}`}>
        <div className={styles.heroTexto}>
            <h1>
                {c.tit}<br/>
                <span className={styles.heroSubt}>{c.subt}</span>
            </h1>

            <div className={styles.heroAcoes}>
                <form className={styles.heroBusca} onSubmit={buscar} role="search">
                    <input
                        type="search"
                        placeholder={c.placeholder}
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        aria-label={c.placeholder.replace('...', '')}
                    />
                    <button type="submit" aria-label="Buscar"><Search size={18} strokeWidth={2.4} /></button>
                </form>
                <a href="#como-funciona" className={styles.heroBtn}>Saiba Mais Sobre Nós</a>
            </div>
        </div>

        <div className={styles.heroBruxa} aria-hidden="true">
            <span className="faisca" style={{ top: '10%', left: '8%' }} />
            <span className="faisca lilas" style={{ top: '30%', right: '4%', animationDelay: '.8s' }} />
            <span className="faisca" style={{ bottom: '12%', left: '18%', animationDelay: '1.4s', width: 12, height: 12 }} />
            <img src={logo} alt="" />
        </div>
    </section>
)

}
