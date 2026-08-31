import { Star, PackageCheck } from 'lucide-react'
import { getHistorico, getEntregues } from '../data/mock'
import styles from './Historico.module.css'

interface HistoricoProps {
  /* "Entregue Trabalho" e "Histórico" mostram o mesmo tipo de registro, só que
     em recortes diferentes — daí a mesma página atender aos dois em vez de
     duplicar a marcação dos cards. */
  apenasEntregues?: boolean
}

export default function Historico({ apenasEntregues = false }: HistoricoProps) {
  const itens = apenasEntregues ? getEntregues() : getHistorico()

  return (
    <div className={styles.pagina}>
      <h1>{apenasEntregues ? 'Trabalhos entregues' : 'Histórico'}</h1>
      {apenasEntregues && (
        <p className={styles.subtitulo}>
          Entregas aguardando a avaliação do contratante.
        </p>
      )}

      {itens.length === 0 ? (
        <div className={styles.vazio}>
          <PackageCheck size={32} strokeWidth={1.8} />
          <strong>Nenhum trabalho aguardando avaliação</strong>
          <p>Assim que você entregar um projeto, ele aparece aqui até o contratante avaliar.</p>
        </div>
      ) : (
      <div className={styles.lista}>
        {itens.map((item) => (
          <article key={item.id} className={styles.card}>
            <div className={styles.info}>
              <span className={styles.categoria}>{item.categoria}</span>
              <strong>{item.titulo}</strong>
              <p>{item.descricao}</p>
            </div>
            <div className={styles.direita}>
              <span className={styles.valor}>{item.valor}</span>
              <span className={styles.data}>{item.data}</span>
              <span className={`${styles.status} ${item.status === 'Concluído' ? styles.concluido : ''}`}>
                {item.status}
                {item.nota ? <span className={styles.nota}><Star size={12} strokeWidth={2.4} fill="currentColor" /> {item.nota}</span> : null}
              </span>
            </div>
          </article>
        ))}
      </div>
      )}
    </div>
  )
}
