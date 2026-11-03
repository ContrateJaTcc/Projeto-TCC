import { useState } from 'react'
import { ExternalLink, Pencil, Trash2, ImageOff, BadgeCheck } from 'lucide-react'
import styles from './quadroportfolio.module.css'

export interface ItemPortfolio {
  port_id: number
  port_titulo: string
  port_desc: string
  port_link: string | null
  port_img: string | null
  port_data_criacao: string
  port_data_atualizacao: string
  /* Veio de um projeto concluído na plataforma: ganha o selo "Feito aqui" */
  port_serv_id?: number | null
}

interface QuadroProps {
  itens: ItemPortfolio[]
  /* Edição */
  onEditar?: (item: ItemPortfolio) => void
  onExcluir?: (item: ItemPortfolio) => void
  /* Excluindo */
  excluindo?: number | null
}

export default function QuadroPortfolio({ itens, onEditar, onExcluir, excluindo }: QuadroProps) {
  /* Imagens quebradas */
  const [quebradas, setQuebradas] = useState<number[]>([])
  const editavel = Boolean(onEditar && onExcluir)
  /* Confirmação */
  const [confirmando, setConfirmando] = useState<number | null>(null)

  return (
    <div className={`${styles.quadro} cascata`}>
      {itens.map((item) => {
        const temImagem = item.port_img && !quebradas.includes(item.port_id)

        return (
          <article key={item.port_id} className={`${styles.card} elevavel`}>
            <div className={styles.capa}>
              {temImagem ? (
                <img
                  src={item.port_img as string}
                  alt=""
                  loading="lazy"
                  onError={() => setQuebradas((atuais) => [...atuais, item.port_id])}
                />
              ) : (
                <div className={styles.semImagem}>
                  <ImageOff size={22} strokeWidth={1.8} />
                  <span>{item.port_img ? 'Imagem indisponível' : 'Sem imagem'}</span>
                </div>
              )}
            </div>

            <div className={styles.corpo}>
              {item.port_serv_id && (
                <span className={styles.feitoAqui} title="Este trabalho foi entregue num projeto concluído no ContrateJá">
                  <BadgeCheck size={13} strokeWidth={2.6} aria-hidden="true" /> Feito aqui
                </span>
              )}
              <strong className={styles.titulo}>{item.port_titulo}</strong>
              <p className={styles.desc}>{item.port_desc}</p>

              {item.port_link && (
                <a
                  className={styles.link}
                  href={item.port_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} strokeWidth={2.2} />
                  Ver trabalho
                </a>
              )}
            </div>

            {editavel && (
              <div className={styles.acoes}>
                <button
                  type="button"
                  className={styles.editar}
                  onClick={() => onEditar?.(item)}
                >
                  <Pencil size={14} strokeWidth={2.2} />
                  Editar
                </button>
                <button
                  type="button"
                  className={`${styles.excluir} ${confirmando === item.port_id ? styles.confirmar : ''}`}
                  onClick={() => {
                    if (confirmando === item.port_id) {
                      setConfirmando(null)
                      onExcluir?.(item)
                    } else {
                      setConfirmando(item.port_id)
                    }
                  }}
                  onBlur={() => setConfirmando((c) => (c === item.port_id ? null : c))}
                  disabled={excluindo === item.port_id}
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                  {excluindo === item.port_id ? 'Removendo...' : confirmando === item.port_id ? 'Confirmar exclusão' : 'Excluir'}
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
