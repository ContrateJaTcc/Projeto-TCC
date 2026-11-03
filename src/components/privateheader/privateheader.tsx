import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Search, Menu, X, House, Settings, TextSearch } from 'lucide-react'
import logo from '../imgs/logo.png'
import { useRole } from '../../context/useRole'
import type { Role } from '../../context/role-context-def'
import Notificacoes from './notificacoes'
import BotaoTema from '../botaotema/botaotema'
import XpCabecalho from './xpcabecalho'
import ChamaSequencia from '../gamificacao/sequencia'
import { abrirPaleta } from '../../utils/paleta'
import { api } from '../../services/api'
import { useAvaliacoesPendentes } from '../../utils/avaliacoespendentes'
import { t, useIdioma } from '../../utils/idioma'
import styles from './privateheader.module.css'

const navPorPapel: Record<Role, { to: string; label: string; end?: boolean }[]> = {
  freelancer: [
    { to: '/freelancer', label: 'Encontre projetos', end: true },
    { to: '/freelancer/entregues', label: 'Em andamento' },
    { to: '/freelancer/historico', label: 'Histórico' },
    { to: '/freelancer/mensagens', label: 'Mensagens' },
    { to: '/freelancer/perfil', label: 'Meu perfil' },
  ],
  contratante: [
    { to: '/contratante', label: 'Projetos', end: true },
    { to: '/contratante/freelancers', label: 'Freelancers' },
    { to: '/contratante/historico', label: 'Histórico' },
    { to: '/contratante/mensagens', label: 'Mensagens' },
    { to: '/contratante/perfil', label: 'Meu perfil' },
  ],
  administrador: [
    { to: '/administrador', label: 'Painel', end: true },
  ],
}

/* Páginas que ficam só no menu do celular e na busca rápida (no computador, pelos atalhos do perfil) */
const extrasPorPapel: Record<Role, { to: string; label: string }[]> = {
  freelancer: [
    { to: '/freelancer/carteira', label: 'Carteira' },
    { to: '/freelancer/ganhos', label: 'Meus ganhos' },
    { to: '/freelancer/loja', label: 'Loja do castelo' },
    { to: '/freelancer/agenda', label: 'Agenda' },
    { to: '/freelancer/mapa', label: 'Projetos no mapa' },
    { to: '/freelancer/reino', label: 'Mapa do reino' },
    { to: '/freelancer/guildas', label: 'Guildas' },
    { to: '/freelancer/testes', label: 'Testes de habilidade' },
    { to: '/freelancer/insignias', label: 'Álbum de insígnias' },
    { to: '/freelancer/arena', label: 'Arena: chefão e desafio' },
    { to: '/freelancer/habilidades', label: 'Árvore de habilidades' },
    { to: '/freelancer/orcamentos', label: 'Pedidos de orçamento' },
    { to: '/freelancer/curriculo', label: 'Meu currículo' },
    { to: '/freelancer/retrospectiva', label: 'Retrospectiva do ano' },
    { to: '/freelancer/convidar', label: 'Convide um amigo' },
    { to: '/ajuda', label: 'Central de ajuda' },
  ],
  contratante: [
    { to: '/contratante/carteira', label: 'Carteira' },
    { to: '/contratante/freelancers?favoritos=1', label: 'Freelancers favoritos' },
    { to: '/contratante/freelancers?visao=mapa', label: 'Freelancers no mapa' },
    { to: '/contratante/agenda', label: 'Agenda' },
    { to: '/contratante/orcamentos', label: 'Orçamentos' },
    { to: '/contratante/arena', label: 'Arena: chefão e desafio' },
    { to: '/contratante/retrospectiva', label: 'Retrospectiva do ano' },
    { to: '/contratante/convidar', label: 'Convide um amigo' },
    { to: '/ajuda', label: 'Central de ajuda' },
  ],
  administrador: [],
}

const ROTULO_PAPEL: Record<Role, string> = {
  freelancer: 'Freelancer',
  contratante: 'Contratante',
  administrador: 'Administrador',
}

export default function PrivateHeader() {
  useIdioma()
  const { role, sair } = useRole()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const papel: Role = role ?? 'freelancer'
  const itens = navPorPapel[papel]
  const home = `/${papel}`
  const temBusca = papel !== 'administrador'

  /* Administrador supremo ganha o próprio selo */
  const [supremo, setSupremo] = useState(false)
  useEffect(() => {
    if (papel !== 'administrador') return
    let ativo = true
    api<{ usu_supremo?: boolean }>('/usuarios/eu', { silencioso: true })
      .then((eu) => ativo && setSupremo(Boolean(eu.usu_supremo)))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [papel])

  /* Bolinha no "Histórico" com as avaliações pendentes (reconta a cada página) */
  const pendentes = useAvaliacoesPendentes(papel !== 'administrador', pathname)
  const selo = (to: string) =>
    to.endsWith('/historico') && pendentes > 0 ? (
      <span className={styles.selo} aria-label={`${pendentes} ${pendentes === 1 ? 'avaliação pendente' : 'avaliações pendentes'}`}>
        {pendentes > 9 ? '9+' : pendentes}
      </span>
    ) : null

  /* Fecha menu */
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

  /* Busca */
  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const termo = busca.trim()
    navigate(termo ? `${home}?busca=${encodeURIComponent(termo)}` : home, { viewTransition: true })
  }

  return (
    <header className={styles.cabe}>
      <div className={styles.esquerda}>
        {/* Home pública */}
        <Link to="/" className={styles.logo} title="Página inicial" viewTransition>
          <img src={logo} alt="" />
          <span className={styles.logoTexto}>Contrate Já</span>
        </Link>
        <span className={styles.papel} data-tour="papel">{supremo ? 'Admin supremo' : ROTULO_PAPEL[papel]}</span>
        {papel === 'freelancer' && <XpCabecalho />}
      </div>

      <nav className={styles.menu} aria-label="Menu principal" data-tour="menu">
        {itens.map((item) => (
          <NavLink
            key={t(item.label)}
            to={item.to}
            end={item.end}
            viewTransition
            className={({ isActive }) => (isActive ? styles.ativo : '')}
          >
            {t(item.label)}
            {selo(item.to)}
          </NavLink>
        ))}
      </nav>

      <div className={styles.direita}>
        {temBusca && (
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
        )}
        {papel !== 'administrador' && <ChamaSequencia />}
        <button type="button" className={`${styles.inicio} ${styles.soLargo}`} onClick={abrirPaleta} title="Busca rápida (Ctrl+K)" aria-label="Busca rápida (Ctrl+K)" data-tour="busca">
          <TextSearch size={18} strokeWidth={2.2} />
        </button>
        <Link to="/" className={`${styles.inicio} ${styles.soLargo}`} title="Página inicial" aria-label="Página inicial" viewTransition>
          <House size={18} strokeWidth={2.2} />
        </Link>
        <NavLink
          to={`${home}/configuracoes`}
          className={({ isActive }) => `${styles.inicio} ${styles.soLargo} ${isActive ? styles.inicioAtivo : ''}`}
          title="Configurações"
          aria-label="Configurações"
          viewTransition
        >
          <Settings size={18} strokeWidth={2.2} />
        </NavLink>
        <BotaoTema className={styles.inicio} />
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
          <nav className={styles.menucel} aria-label="Menu do celular">
            {temBusca && (
              <form className={styles.buscaCel} onSubmit={buscar} role="search">
                <Search size={16} strokeWidth={2.2} />
                <input
                  type="search"
                  placeholder="Buscar"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  aria-label="Buscar"
                />
              </form>
            )}
            {itens.map((item) => (
              <NavLink
                key={t(item.label)}
                to={item.to}
                end={item.end}
                viewTransition
                className={({ isActive }) => (isActive ? styles.ativo : '')}
              >
                {t(item.label)}
                {selo(item.to)}
              </NavLink>
            ))}
            <button type="button" className={styles.itemMenuCel} onClick={() => { setMenuAberto(false); abrirPaleta() }}>
              Busca rápida
            </button>
            {extrasPorPapel[papel].map((item) => (
              <NavLink key={item.to} to={item.to} viewTransition className={({ isActive }) => (isActive ? styles.ativo : '')}>
                {t(item.label)}
              </NavLink>
            ))}
            <NavLink to={`${home}/configuracoes`} viewTransition className={({ isActive }) => (isActive ? styles.ativo : '')}>
              {t('Configurações')}
            </NavLink>
            <Link to="/" viewTransition>{t('Página inicial')}</Link>
            <Link to="/" onClick={sair}>Sair</Link>
          </nav>
        </>
      )}
    </header>
  )
}
