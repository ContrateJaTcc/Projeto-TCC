import { Laptop, Building2 } from 'lucide-react'
import styles from './cadastro.module.css'

export type Perfil = 'freelancer' | 'contratante'

interface EtapaPerfilProps {
  selecionado: Perfil
  onSelecionar: (perfil: Perfil) => void
  onContinuar: () => void
}

export default function EtapaPerfil({ selecionado, onSelecionar, onContinuar }: EtapaPerfilProps) {
  return (
    <div className={styles.etapa}>
      <h2>Qual perfil te descreve melhor?</h2>
      <p className={styles.subtitulo}>Você poderá ajustar isso depois no seu perfil.</p>

      <div className={styles.cartoesPerfil}>
        <button
          type="button"
          className={`${styles.cartaoPerfil} ${selecionado === 'freelancer' ? styles.cartaoAtivo : ''}`}
          onClick={() => onSelecionar('freelancer')}
        >
          <span className={styles.iconePerfil}><Laptop size={26} strokeWidth={2} /></span>
          <strong>Freelancer</strong>
          <p>Trabalhe, ganhe dinheiro e evolua</p>
        </button>
        <button
          type="button"
          className={`${styles.cartaoPerfil} ${selecionado === 'contratante' ? styles.cartaoAtivo : ''}`}
          onClick={() => onSelecionar('contratante')}
        >
          <span className={styles.iconePerfil}><Building2 size={26} strokeWidth={2} /></span>
          <strong>Contratante</strong>
          <p>Poste projetos e contrate pessoas</p>
        </button>
      </div>

      <button type="button" className={styles.btnPrimario} onClick={onContinuar}>
        Continuar
      </button>
    </div>
  )
}
