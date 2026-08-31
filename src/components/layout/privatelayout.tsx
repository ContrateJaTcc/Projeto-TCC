import { Navigate, Outlet } from 'react-router-dom'
import { useRole } from '../../context/useRole'
import PrivateHeader from '../privateheader/privateheader'
import PrivateFooter from '../privatefooter/privatefooter'
import styles from './privatelayout.module.css'

export default function PrivateLayout() {
  const { role } = useRole()

  if (!role) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={styles.pagina}>
      <PrivateHeader />
      <div className={styles.conteudo}>
        <Outlet />
      </div>
      <PrivateFooter />
    </div>
  )
}
