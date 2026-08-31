import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import logo from '../imgs/logo.png'
import styles from './header.module.css'

interface HeaderProps {
  perfil: 'free' | 'cont'
  setPerfil: (p: 'free' | 'cont') => void
}

export default function Header({ perfil, setPerfil }: HeaderProps) {
  const [menuA, setMenuA] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [rolou, setRolou] = useState(false)
  const navigate = useNavigate()

  // Header fixo sem sombra "flutua" sobre o conteúdo sem separação visível.
  // A sombra só aparece depois que a página rola.
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header className={`${styles.cabe} ${rolou ? styles.cabeRolou : ''}`}>

      <Link to="/" className={styles.logo}>
        <img src={logo} alt=""/>
        <span className={styles.logoTexto}>Contrate Já</span>
      </Link>

      <div className={styles.perfil}>
        <div className={`${styles.slider} ${perfil === 'cont' ? styles.sliderDireita : ''}`}></div>
        <button
          className={`${styles.frebu} ${perfil === 'free' ? styles.ativo : ''}`}
          onClick={() => setPerfil('free')}>Seja Freelancer</button>
        <button
          className={`${styles.conbu} ${perfil === 'cont' ? styles.ativo : ''}`}
          onClick={() => setPerfil('cont')}>Seja Contratante</button>
      </div>

      <nav className={styles.menu}>
        <a href="#como-funciona">Como Funciona</a>
        <a href="#diferenciais">Por que ContrateJá</a>
        <a href="#contato">Contato</a>
      </nav>

      <div
        className={styles.login}
        onMouseEnter={() => perfil === 'cont' && setDropdownAberto(true)}
        onMouseLeave={() => setDropdownAberto(false)}
      >
        <button className={styles.btnEnt} onClick={() => navigate('/login')}>Entrar</button>
        <button className={styles.btnCad} onClick={() => navigate('/cadastro')}>Cadastrar</button>

        {dropdownAberto && (
          <div className={styles.dropdown}>
            <Link to="/cadastro" onClick={() => setDropdownAberto(false)}>Postar projetos</Link>
            <Link to="/cadastro" onClick={() => setDropdownAberto(false)}>Contratar freelancers</Link>
          </div>
        )}
      </div>

      <button
        className={styles.hamburguer}
        aria-label="Menu"
        onClick={() => setMenuA(!menuA)}>
        <Menu size={24} strokeWidth={2.2} />
      </button>

      {menuA && (
        <nav className={styles.menucel}>
          <a href="#como-funciona" onClick={() => setMenuA(false)}>Como Funciona</a>
          <a href="#diferenciais" onClick={() => setMenuA(false)}>Por que ContrateJá</a>
          <a href="#contato" onClick={() => setMenuA(false)}>Contato</a>
        </nav>
      )}

    </header>
  )
}