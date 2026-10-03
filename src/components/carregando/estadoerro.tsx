import { CloudOff, RotateCw } from 'lucide-react'
import styles from './carregando.module.css'

interface EstadoErroProps {
  mensagem: string
  onTentarDeNovo?: () => void
}

/* Falha ao carregar uma tela: mensagem clara e um jeito de tentar de novo sem recarregar tudo. */
export default function EstadoErro({ mensagem, onTentarDeNovo }: EstadoErroProps) {
  return (
    <div className={`${styles.erro} entrada`} role="alert">
      <CloudOff size={34} strokeWidth={1.7} />
      <strong>Não deu para carregar</strong>
      <p>{mensagem}</p>
      {onTentarDeNovo && (
        <button type="button" onClick={onTentarDeNovo}>
          <RotateCw size={15} strokeWidth={2.4} /> Tentar de novo
        </button>
      )}
    </div>
  )
}
