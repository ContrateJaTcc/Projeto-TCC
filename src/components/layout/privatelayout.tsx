import { Suspense, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useRole } from '../../context/useRole'
import PrivateHeader from '../privateheader/privateheader'
import PrivateFooter from '../privatefooter/privatefooter'
import SubiuNivel from '../gamificacao/subiunivel'
import AvisoConquista from '../gamificacao/avisoconquista'
import Tour from '../tour/tour'
import BarraProgresso from './barraprogresso'
import PaletaComandos from '../busca/paletacomandos'
import ItemEvento from '../evento/itemevento'
import Apresentacao from '../apresentacao/apresentacao'
import { api } from '../../services/api'
import Carregando from '../carregando/carregando'
import LimiteErro from './limiteerro'
import { definirTemaCenario } from '../../utils/temacenario'
import { FaixaDemo, FaixaSupremo } from './faixas'
import styles from './privatelayout.module.css'

export default function PrivateLayout() {
  const { role } = useRole()
  const { pathname } = useLocation()

  /* Cenário comprado na loja (só freelancer compra, mas a rota responde para todos) */
  useEffect(() => {
    if (!role || role === 'administrador') return
    let vivo = true
    api<{ tema: string | null }>('/loja/tema', { silencioso: true })
      .then((d) => vivo && definirTemaCenario(d.tema))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [role])

  if (!role) {
    return <Navigate to="/login" replace />
  }

  /* Área de outro papel */
  if (pathname.split('/')[1] !== role) {
    return <Navigate to={`/${role}`} replace />
  }

  return (
    /* data-area: o modo claro vale só na área logada */
    <div className={styles.pagina} data-area="privada">
      <BarraProgresso />
      <FaixaDemo />
      <FaixaSupremo />
      <PrivateHeader />
      {/* Conteúdo */}
      <div key={pathname} className={`${styles.conteudo} entrada`}>
        <LimiteErro chave={pathname}>
          <Suspense fallback={<Carregando variante="detalhe" />}>
            <Outlet />
          </Suspense>
        </LimiteErro>
      </div>
      <PrivateFooter />
      <SubiuNivel />
      <AvisoConquista />
      <Tour key={role} papel={role} />
      <PaletaComandos papel={role} />
      {role !== 'administrador' && <ItemEvento key={`evento:${pathname}`} />}
      <Apresentacao />
    </div>
  )
}
