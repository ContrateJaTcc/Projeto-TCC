import { useEffect } from 'react'
import { useToast } from '../../context/useToast'
import { EVENTO_CONQUISTA, luaCheia, tentarConquista } from '../../utils/conquistas'

/* Área logada: avisa quando sai uma conquista secreta e confere a da lua cheia */
export default function AvisoConquista() {
  const toast = useToast()

  useEffect(() => {
    const aoGanhar = (e: Event) => toast.mostrar(`Conquista secreta: ${(e as CustomEvent<string>).detail}!`)
    window.addEventListener(EVENTO_CONQUISTA, aoGanhar)
    if (luaCheia()) tentarConquista('lua_cheia')
    return () => window.removeEventListener(EVENTO_CONQUISTA, aoGanhar)
  }, [toast])

  return null
}
