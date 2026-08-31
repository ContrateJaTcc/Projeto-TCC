import { Check, X } from 'lucide-react'
import styles from './comparison.module.css'

const linhas = [
  'Gamificação',
  'Ranking por área',
  'Insígnias',
  'Progressão visível',
  'Taxa fixa transparente',
  'Sem plano obrigatório',
]

export default function Comparison() {
  return (
    <section className={styles.diferenciais} id="diferenciais">
      <h2>O que nos torna diferentes?</h2>
      <p className={styles.chamada}>
        Enquanto outras plataformas só conectam, nós reconhecemos e recompensamos!
      </p>

      <div className={styles.destaques}>
        <div className={styles.destaque}>
          <span className={styles.tagDestaque}>GAMIFICAÇÃO REAL</span>
          <h3>Não é só trabalho, é uma jornada</h3>
          <p>
            Cada projeto concluído gera XP, sobe seu nível e desbloqueia insígnias exclusivas. Aqui
            a sua evolução profissional é visível e recompensada, não só registrada. Diferente das
            plataformas comuns, no ContrateJá você cresce de verdade.
          </p>
        </div>

        <div className={styles.destaque}>
          <span className={styles.tagDestaque}>VISIBILIDADE · EXCLUSIVO DO CONTRATEJÁ</span>
          <h3>Seu esforço aparece de verdade</h3>
          <p>
            Nas plataformas comuns, dois freelancers com históricos diferentes parecem iguais. No
            ContrateJá, seu nível, insígnias e ranking mostram exatamente quem você é e o quanto
            evoluiu.
          </p>
        </div>
      </div>

      <div className={styles.tabelaWrap}>
        <h3 className={styles.tituloTabela}>Comparação com plataformas conhecidas</h3>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Funcionalidade</th>
              <th>ContrateJá</th>
              <th>Workana</th>
              <th>Upwork</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha}>
                <td>{linha}</td>
                <td className={styles.check}><Check size={18} strokeWidth={3} /></td>
                <td className={styles.x}><X size={18} strokeWidth={3} /></td>
                <td className={styles.x}><X size={18} strokeWidth={3} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
