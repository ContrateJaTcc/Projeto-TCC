import { Heart } from 'lucide-react'
import styles from './favorito.module.css'

/* Coração para guardar o freelancer nos favoritos do contratante */
export default function BotaoFavorito({ nome, ativo, aoAlternar, comTexto = false }: { nome: string; ativo: boolean; aoAlternar: () => void; comTexto?: boolean }) {
  const primeiro = nome.split(' ')[0]
  return (
    <button
      type="button"
      className={`${styles.favorito} ${ativo ? styles.ativo : ''} ${comTexto ? styles.comTexto : ''}`}
      onClick={aoAlternar}
      aria-pressed={ativo}
      aria-label={ativo ? `Tirar ${primeiro} dos favoritos` : `Guardar ${primeiro} nos favoritos`}
      title={ativo ? 'Nos seus favoritos' : 'Guardar nos favoritos'}
    >
      <Heart size={18} strokeWidth={2.2} fill={ativo ? 'currentColor' : 'none'} aria-hidden="true" />
      {comTexto && (ativo ? 'Favorito' : 'Favoritar')}
    </button>
  )
}
