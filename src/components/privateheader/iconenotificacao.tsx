import Desenho from '../pixel/desenho'
import styles from './notificacoes.module.css'

/* Ícone pixel de cada tipo de aviso; o tipo sai do título que o servidor manda */
type Tipo = 'mensagem' | 'convite' | 'avaliacao' | 'insignia' | 'contratacao' | 'entrega' | 'administracao' | 'aviso'

const TIPOS: [RegExp, Tipo][] = [
  [/mensage/i, 'mensagem'],
  [/convite/i, 'convite'],
  [/avalia/i, 'avaliacao'],
  [/ins[ií]gnia|n[ií]vel|\bxp\b/i, 'insignia'],
  [/candidatura|contrat/i, 'contratacao'],
  [/entregue|conclu/i, 'entrega'],
  [/den[uú]ncia|removid|conta|papel/i, 'administracao'],
]

const tipoDoAviso = (titulo: string): Tipo => TIPOS.find(([re]) => re.test(titulo))?.[1] ?? 'aviso'

const DESENHOS: Record<Tipo, string[]> = {
  mensagem: ['111111111', '11.....11', '1.1...1.1', '1..1.1..1', '1...1...1', '1.......1', '111111111'],
  convite: ['.11111111', '1.1.....1', '.11.....1', '..1.111.1', '..1.....1', '..1.111.1', '..1.....1', '..1111111'],
  avaliacao: ['....1....', '....1....', '...111...', '111111111', '.1111111.', '..11111..', '..11.11..', '.11...11.', '.1.....1.'],
  insignia: ['11.....11', '.11...11.', '..11.11..', '...111...', '..11111..', '.1111111.', '.111.111.', '.1111111.', '..11111..'],
  contratacao: ['........1', '.......11', '......11.', '1....11..', '11..11...', '.1111....', '..11.....'],
  entrega: ['..11111..', '.1..1..1.', '111111111', '1...1...1', '1...1...1', '1...1...1', '111111111'],
  administracao: ['111111111', '1.......1', '1...1...1', '1..111..1', '1...1...1', '.1.....1.', '..1...1..', '...111...'],
  aviso: ['....1....', '...111...', '..11111..', '..11111..', '.1111111.', '.1111111.', '111111111', '....1....'],
}

export default function IconeNotificacao({ titulo }: { titulo: string }) {
  const tipo = tipoDoAviso(titulo)
  const linhas = DESENHOS[tipo]
  return (
    <span className={`${styles.icone} ${styles[`icone_${tipo}`]}`} aria-hidden="true">
      <svg viewBox={`0 0 9 ${linhas.length}`} width={18} height={linhas.length * 2} shapeRendering="crispEdges">
        <Desenho linhas={linhas} cores={{ 1: 'currentColor' }} />
      </svg>
    </span>
  )
}
