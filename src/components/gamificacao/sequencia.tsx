import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import Desenho from '../pixel/desenho'
import styles from './sequencia.module.css'

interface Sequencia {
  disponivel: boolean
  dias: number
  hoje: boolean
  em_risco: boolean
  ultimos7: { dia: string; feito: boolean }[]
}

const CHAMA = ['...y...', '..yy...', '..yoy..', '.yooy..', '.yooyy.', 'yoorooy', 'yorrroy', '.orrro.', '..ooo..']
const CORES = { y: '#ffd45e', o: '#e0782a', r: '#ff6b5e' }
/* A partir de 30 dias a chama fica azul, de feitiço */
const CORES_MAGICAS = { y: '#e8fbff', o: '#8bd8e6', r: '#5ec4d6' }

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/* Tamanho da chama: cresce com a sequência */
const tamanho = (dias: number) => (dias >= 30 ? 26 : dias >= 7 ? 23 : dias >= 3 ? 20 : 17)

/* Chama no cabeçalho: dias seguidos entrando no site (um dia perdido não apaga, dois seguidos sim) */
export default function ChamaSequencia() {
  const [seq, setSeq] = useState<Sequencia | null>(null)
  const [aberta, setAberta] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  /* Marca a visita de hoje uma vez por carregamento do site */
  useEffect(() => {
    let vivo = true
    api<Sequencia>('/usuarios/eu/atividade', { metodo: 'POST', silencioso: true })
      .then((s) => vivo && setSeq(s))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    if (!aberta) return
    const fechar = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !caixa.current?.contains(e.target as Node)) setAberta(false)
    }
    window.addEventListener('keydown', fechar)
    window.addEventListener('pointerdown', fechar)
    return () => {
      window.removeEventListener('keydown', fechar)
      window.removeEventListener('pointerdown', fechar)
    }
  }, [aberta])

  if (!seq?.disponivel || seq.dias === 0) return null

  const lado = tamanho(seq.dias)
  const texto = `${seq.dias} ${seq.dias === 1 ? 'dia seguido' : 'dias seguidos'}`

  return (
    <div className={styles.envolve} ref={caixa}>
      <button
        type="button"
        className={`${styles.chama} ${seq.em_risco ? styles.fraca : ''}`}
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-label={`Sequência: ${texto}${seq.em_risco ? ' (entre hoje para não perder)' : ''}`}
        title={texto}
        data-tour="sequencia"
      >
        <svg width={lado} height={(lado * 9) / 7} viewBox="0 0 7 9" shapeRendering="crispEdges" aria-hidden="true" className={styles.fogo}>
          <Desenho linhas={CHAMA} cores={seq.dias >= 30 ? CORES_MAGICAS : CORES} />
        </svg>
        <b>{seq.dias}</b>
      </button>

      {aberta && (
        <div className={styles.balao} role="dialog" aria-label="Sua sequência">
          <strong>{texto} no castelo</strong>
          <ol className={styles.semana} aria-label="Últimos 7 dias">
            {seq.ultimos7.map((d) => (
              <li key={d.dia} className={d.feito ? styles.feito : ''} title={d.dia.split('-').reverse().join('/')}>
                <span>{DIAS_SEMANA[new Date(`${d.dia}T12:00:00`).getDay()]}</span>
                <i aria-label={d.feito ? 'entrou' : 'não entrou'} />
              </li>
            ))}
          </ol>
          <p>
            {seq.em_risco
              ? 'Ontem você não entrou: a chama ficou fraca. Entre amanhã também para ela voltar a crescer.'
              : 'Perder um dia só não apaga a chama. Dois dias seguidos sem entrar, aí sim ela apaga.'}
          </p>
          <small>Com 7 dias ela cresce; com 30, vira chama de feitiço.</small>
        </div>
      )}
    </div>
  )
}
