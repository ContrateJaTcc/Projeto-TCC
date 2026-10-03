import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useRole } from '../../context/useRole'
import PrivateHeader from '../privateheader/privateheader'
import PrivateFooter from '../privatefooter/privatefooter'
import styles from './privatelayout.module.css'

export default function PrivateLayout() {
  const { role } = useRole()
  const { pathname } = useLocation()

  if (!role) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={styles.pagina}>
      <PrivateHeader />
      {/* A key faz o conteúdo remontar a cada rota e tocar a animação de
          entrada, em vez de a tela nova simplesmente substituir a anterior. */}
      <div key={pathname} className={`${styles.conteudo} entrada`}>
        <Outlet />
      </div>
      <PrivateFooter />
    </div>
  )
}
