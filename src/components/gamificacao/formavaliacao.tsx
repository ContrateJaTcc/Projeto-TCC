import { useState } from 'react'
import { Star, Send } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import type { AvaliacaoPendente } from './tipos'
import styles from './gamificacao.module.css'

const ROTULOS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']

/* Comentário curto */
const LIMITE = 280

/* Notas por critério (opcionais): aparecem no perfil de quem foi avaliado */
const CRITERIOS = [
  { codigo: 'comunicacao', rotulo: 'Comunicação' },
  { codigo: 'prazo', rotulo: 'Prazo' },
  { codigo: 'qualidade', rotulo: 'Qualidade' },
] as const
type Criterio = (typeof CRITERIOS)[number]['codigo']

interface FormAvaliacaoProps {
  pendente: AvaliacaoPendente
  onEnviada: () => void
}

/* Avaliação: estrelas, comentário e envio (quem é avaliado fica no cartão em volta) */
export default function FormAvaliacao({ pendente, onEnviada }: FormAvaliacaoProps) {
  const [nota, setNota] = useState(0)
  const [passando, setPassando] = useState(0)
  const [comentario, setComentario] = useState('')
  const [criterios, setCriterios] = useState<Partial<Record<Criterio, number>>>({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const exibida = passando || nota
  const idBase = `${pendente.serv_id}-${pendente.usu_id}`

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
        corpo: { serv_id: pendente.serv_id, usu_avaliado: pendente.usu_id, nota, comentario, ...criterios },
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
              size={32}
              strokeWidth={2}
              className={n <= exibida ? styles.estrelaCheia : styles.estrelaVazia}
            />
          </button>
        ))}
        <span className={styles.rotuloNota}>{ROTULOS[exibida] || 'Escolha uma nota'}</span>
      </div>

      <fieldset className={styles.criterios}>
        <legend>Por critério <span>(opcional)</span></legend>
        {CRITERIOS.map((c) => (
          <div key={c.codigo} className={styles.criterio} role="radiogroup" aria-label={c.rotulo}>
            <span>{c.rotulo}</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={criterios[c.codigo] === n}
                aria-label={`${c.rotulo}: ${n} de 5`}
                onClick={() => setCriterios((atual) => ({ ...atual, [c.codigo]: atual[c.codigo] === n ? undefined : n }))}
              >
                <Star size={18} strokeWidth={2} className={n <= (criterios[c.codigo] ?? 0) ? styles.estrelaCheia : styles.estrelaVazia} />
              </button>
            ))}
          </div>
        ))}
      </fieldset>

      <label className={styles.rotuloComentario} htmlFor={`comentario-${idBase}`}>
        Comentário <span>(opcional)</span>
      </label>
      <textarea
        id={`comentario-${idBase}`}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={LIMITE}
        rows={3}
        placeholder="Ex.: Comunicação clara e pagamento em dia."
        aria-describedby={`contador-${idBase}`}
      />

      <div className={styles.formAvaliacaoRodape}>
        <span
          id={`contador-${idBase}`}
          className={`${styles.contadorTexto} ${comentario.length > LIMITE - 30 ? styles.contadorPerto : ''}`}
        >
          {comentario.length}/{LIMITE}
        </span>
        <button type="submit" className={styles.btnEnviar} disabled={enviando}>
          {enviando ? <span className="spinner" /> : <Send size={15} strokeWidth={2.2} />}
          {enviando ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </div>

      {erro && <p className={styles.erroTexto}>{erro}</p>}
    </form>
  )
}
