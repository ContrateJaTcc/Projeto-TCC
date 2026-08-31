import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search, HelpCircle, Bell, Menu } from 'lucide-react'
import logo from '../imgs/logo.png'
import { useRole } from '../../context/useRole'
import styles from './privateheader.module.css'

const navPorPapel = {
  freelancer: [
    { to: '/freelancer', label: 'Encontre projetos', end: true },
    { to: '/freelancer/entregues', label: 'Entregue Trabalho' },
    { to: '/freelancer/historico', label: 'Histórico' },
    { to: '/freelancer/mensagens', label: 'Mensagens' },
  ],
  contratante: [
    { to: '/contratante', label: 'Projetos', end: true },
    { to: '/contratante/candidatos', label: 'Escolher candidatos' },
    { to: '/contratante/historico', label: 'Histórico' },
    { to: '/contratante/mensagens', label: 'Mensagens' },
  ],
}

export default function PrivateHeader() {
  const { role, sair } = useRole()
  const [menuAberto, setMenuAberto] = useState(false)
  const papel = role ?? 'freelancer'
  const itens = navPorPapel[papel]
  const home = papel === 'freelancer' ? '/freelancer' : '/contratante'

  return (
    <header className={styles.cabe}>
      <div className={styles.esquerda}>
        <Link to={home} className={styles.logo}>
          <img src={logo} alt="" />
          <span className={styles.logoTexto}>Contrate Já</span>
        </Link>
        <span className={styles.papel}>{papel === 'freelancer' ? 'Freelancer' : 'Contratante'}</span>
      </div>

      <nav className={styles.menu}>
        {itens.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? styles.ativo : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.direita}>
        <div className={styles.busca}>
          <Search size={16} strokeWidth={2.2} />
          <input type="text" placeholder="Procure" />
        </div>
        <button className={styles.iconBtn} aria-label="Ajuda"><HelpCircle size={18} strokeWidth={2.2} /></button>
        <button className={styles.iconBtn} aria-label="Notificações"><Bell size={18} strokeWidth={2.2} /></button>
        <Link to="/" onClick={sair} className={styles.sair}>Sair</Link>
      </div>

      <button className={styles.hamburguer} onClick={() => setMenuAberto(!menuAberto)} aria-label="Menu">
        <Menu size={24} strokeWidth={2.2} />
      </button>

      {menuAberto && (
        <nav className={styles.menucel}>
          {itens.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? styles.ativo : '')}
              onClick={() => setMenuAberto(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
