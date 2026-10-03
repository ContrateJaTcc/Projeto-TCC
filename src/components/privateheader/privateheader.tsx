import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Search, Menu, X } from 'lucide-react'
import logo from '../imgs/logo.png'
import { useRole } from '../../context/useRole'
import Notificacoes from './notificacoes'
import styles from './privateheader.module.css'

const navPorPapel = {
  freelancer: [
    { to: '/freelancer', label: 'Encontre projetos', end: true },
    { to: '/freelancer/entregues', label: 'Em andamento' },
    { to: '/freelancer/historico', label: 'Histórico' },
    { to: '/freelancer/mensagens', label: 'Mensagens' },
    { to: '/freelancer/perfil', label: 'Meu perfil' },
  ],
  contratante: [
    { to: '/contratante', label: 'Projetos', end: true },
    { to: '/contratante/candidatos', label: 'Candidatos' },
    { to: '/contratante/historico', label: 'Histórico' },
    { to: '/contratante/mensagens', label: 'Mensagens' },
    { to: '/contratante/perfil', label: 'Meu perfil' },
  ],
}

export default function PrivateHeader() {
  const { role, sair } = useRole()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const papel = role ?? 'freelancer'
  const itens = navPorPapel[papel]
  const home = papel === 'freelancer' ? '/freelancer' : '/contratante'

  /* Fecha o menu do celular ao navegar (inclusive pelo botão voltar). */
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname)
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname)
    setMenuAberto(false)
  }

  useEffect(() => {
    if (!menuAberto) return
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAberto(false)
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [menuAberto])

  /* Antes a busca do topo não fazia nada. Agora leva à lista de projetos já filtrada. */
  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const termo = busca.trim()
    navigate(termo ? `${home}?busca=${encodeURIComponent(termo)}` : home)
  }

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
        <form className={styles.busca} onSubmit={buscar} role="search">
          <Search size={16} strokeWidth={2.2} />
          <input
            type="search"
            placeholder={papel === 'freelancer' ? 'Buscar projetos' : 'Buscar nos meus projetos'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar"
          />
        </form>
        <Notificacoes />
        <Link to="/" onClick={sair} className={styles.sair}>Sair</Link>

        <button
          type="button"
          className={styles.hamburguer}
          onClick={() => setMenuAberto(!menuAberto)}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
        >
          {menuAberto ? <X size={24} strokeWidth={2.2} /> : <Menu size={24} strokeWidth={2.2} />}
        </button>
      </div>

      {menuAberto && (
        <>
          <div className={styles.veu} onClick={() => setMenuAberto(false)} />
          <nav className={styles.menucel}>
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
        </>
      )}
    </header>
  )
}
