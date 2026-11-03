import { Laptop, Building2 } from 'lucide-react'
import styles from './cadastro.module.css'
import { t, useIdioma } from '../../utils/idioma'

export type Perfil = 'freelancer' | 'contratante'

interface EtapaPerfilProps {
  selecionado: Perfil
  onSelecionar: (perfil: Perfil) => void
  onContinuar: () => void
}

export default function EtapaPerfil({ selecionado, onSelecionar, onContinuar }: EtapaPerfilProps) {
  useIdioma()
  return (
    <div className={styles.etapa}>
      <h2>{t('Qual perfil te descreve melhor?')}</h2>
      <p className={styles.subtitulo}>Dá para trocar no próximo passo, antes de criar a conta.</p>

      <div className={styles.cartoesPerfil}>
        <button
          type="button"
          className={`${styles.cartaoPerfil} ${selecionado === 'freelancer' ? styles.cartaoAtivo : ''}`}
          onClick={() => onSelecionar('freelancer')}
        >
          <span className={styles.iconePerfil}><Laptop size={26} strokeWidth={2} /></span>
          <strong>{t('Freelancer')}</strong>
          <p>{t('Trabalhe, ganhe dinheiro e evolua')}</p>
        </button>
        <button
          type="button"
          className={`${styles.cartaoPerfil} ${selecionado === 'contratante' ? styles.cartaoAtivo : ''}`}
          onClick={() => onSelecionar('contratante')}
        >
          <span className={styles.iconePerfil}><Building2 size={26} strokeWidth={2} /></span>
          <strong>{t('Contratante')}</strong>
          <p>{t('Poste projetos e contrate pessoas')}</p>
        </button>
      </div>

      <button type="button" className={styles.btnPrimario} onClick={onContinuar}>
        {t('Continuar')}
      </button>
    </div>
  )
}
