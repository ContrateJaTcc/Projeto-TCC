import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/*
 * O BrowserRouter não volta ao topo ao trocar de página: quem clicava num
 * link no fim de uma lista caía no meio da próxima tela.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
