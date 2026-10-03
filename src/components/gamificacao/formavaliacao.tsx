import { useState } from 'react'
import { Star } from 'lucide-react'
import Avatar from '../avatar/avatar'
import { api, ErroApi } from '../../services/api'
import type { AvaliacaoPendente } from './tipos'
import styles from './gamificacao.module.css'

const ROTULOS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']

interface FormAvaliacaoProps {
  pendente: AvaliacaoPendente
  onEnviada: () => void
}

/* Avalia a outra ponta de um projeto finalizado: estrelas + comentário opcional. */
export default function FormAvaliacao({ pendente, onEnviada }: FormAvaliacaoProps) {
  const [nota, setNota] = useState(0)
  const [passando, setPassando] = useState(0)
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const exibida = passando || nota

  async function enviar(e: React.FormEvent) {
    e.preventDefault()

    if (nota === 0) {
      setErro('Escolha de 1 a 5 estrelas.')
      return
    }

    setErro('')
    setEnviando(true)

    try {
      await api('/avaliacoes', {
        metodo: 'POST',
        corpo: { serv_id: pendente.serv_id, usu_avaliado: pendente.usu_id, nota, comentario },
      })
      onEnviada()
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível enviar a avaliação.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className={styles.formAvaliacao} onSubmit={enviar}>
      <div className={styles.formAvaliacaoTopo}>
        <Avatar nome={pendente.usu_nome} size={36} foto={pendente.usu_foto} />
        <span>
          Como foi trabalhar com <strong>{pendente.usu_nome}</strong>?
        </span>
      </div>

      <div className={styles.seletorEstrelas} onMouseLeave={() => setPassando(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            aria-pressed={nota === n}
            onClick={() => setNota(n)}
            onMouseEnter={() => setPassando(n)}
          >
            <Star
              size={26}
              strokeWidth={2}
              className={n <= exibida ? styles.estrelaCheia : styles.estrelaVazia}
            />
          </button>
        ))}
        <span className={styles.rotuloNota}>{ROTULOS[exibida]}</span>
      </div>

      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Conte como foi (opcional). Isso aparece no perfil da pessoa."
      />

      {erro && <p className={styles.erroTexto}>{erro}</p>}

      <button type="submit" className={styles.btnEnviar} disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </form>
  )
}
