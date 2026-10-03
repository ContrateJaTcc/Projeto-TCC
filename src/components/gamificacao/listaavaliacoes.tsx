import Avatar from '../avatar/avatar'
import Estrelas from './estrelas'
import type { Avaliacao } from './tipos'
import styles from './gamificacao.module.css'

interface ListaAvaliacoesProps {
  avaliacoes: Avaliacao[]
  vazio: string
}

export default function ListaAvaliacoes({ avaliacoes, vazio }: ListaAvaliacoesProps) {
  if (avaliacoes.length === 0) {
    return <p className={styles.vazioTexto}>{vazio}</p>
  }

  return (
    <ul className={styles.avaliacoes}>
      {avaliacoes.map((a) => (
        <li key={a.aval_id} className={styles.avaliacao}>
          <Avatar nome={a.avaliador_nome} size={40} foto={a.avaliador_foto} />
          <div className={styles.avaliacaoCorpo}>
            <div className={styles.avaliacaoTopo}>
              <strong>{a.avaliador_nome}</strong>
              <Estrelas nota={a.aval_nota} tamanho={14} />
            </div>
            <span className={styles.suave}>
              {a.serv_titulo} · {new Date(a.aval_data).toLocaleDateString('pt-BR')}
            </span>
            {a.aval_comentario && <p>{a.aval_comentario}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
