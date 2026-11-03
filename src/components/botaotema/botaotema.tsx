import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { lerPreferencias, salvarPreferencias, temaAtual, type Preferencias } from '../../utils/preferencias'
import { useCenarioGlobal } from '../../utils/cenarioglobal'

/* Sol e lua no cabeçalho: troca noite e pôr do sol sem passar pelas Configurações */
export default function BotaoTema({ className = '' }: { className?: string }) {
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias)
  const cenario = useCenarioGlobal()

  useEffect(() => {
    const aoMudar = (e: Event) => setPrefs((e as CustomEvent<Preferencias>).detail)
    window.addEventListener('preferencias', aoMudar)
    return () => window.removeEventListener('preferencias', aoMudar)
  }, [])

  const noite = temaAtual(prefs) === 'escuro'
  /* Com o tema fixado pela administração, o botão só mostra o que está valendo */
  const travado = Boolean(cenario.tema)
  const rotulo = travado
    ? 'A administração fixou o tema do site'
    : noite
      ? 'Mudar para o pôr do sol'
      : 'Mudar para a noite'

  return (
    <button
      type="button"
      className={className}
      onClick={() => setPrefs(salvarPreferencias({ tema: noite ? 'claro' : 'escuro' }))}
      disabled={travado}
      title={rotulo}
      aria-label={rotulo}
      data-tour="tema"
    >
      {noite ? <Sun size={18} strokeWidth={2.2} /> : <Moon size={18} strokeWidth={2.2} />}
    </button>
  )
}
