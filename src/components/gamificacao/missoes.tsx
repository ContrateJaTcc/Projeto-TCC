import { useCallback, useEffect, useState } from 'react'
import { Target, Check, Gift, Sun } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { comemorar } from '../../utils/preferencias'
import { anunciarNivel } from '../../utils/xp'
import { eventoAtual } from '../../utils/eventos'
import { guardarSituacaoEvento, useSituacaoEvento, type SituacaoEvento } from '../../utils/eventoprogresso'
import IconeEvento from '../evento/iconeevento'
import styles from './missoes.module.css'

interface Missao {
  codigo: string
  titulo: string
  descricao: string
  meta: number
  xp: number
  progresso: number
  resgatada: boolean
}

interface Situacao {
  termina: string
  resgateDisponivel: boolean
  missoes: Missao[]
  /* Missões do dia (servidor antigo não manda) */
  dia_termina?: string
  diarias?: Missao[]
}

/* "renova em 2 dias" */
function renova(termina: string) {
  const horas = Math.max(0, Math.round((new Date(termina).getTime() - Date.now()) / 3_600_000))
  if (horas < 24) return `renova em ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.round(horas / 24)
  return `renova em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/* Missões da semana do freelancer: metas pequenas que dão XP extra */
export default function MissoesSemana() {
  const toast = useToast()
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [resgatando, setResgatando] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)
  /* Missão especial do evento do ano (Halloween, Natal...) */
  const temEvento = Boolean(eventoAtual())
  const situacaoEvento = useSituacaoEvento(temEvento)
  const ev = situacaoEvento?.disponivel ? situacaoEvento.evento : null

  const carregar = useCallback(async () => {
    try {
      setSituacao(await api<Situacao>('/missoes', { silencioso: true }))
    } catch {
      setFalhou(true)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function resgatar(m: Missao) {
    setResgatando(m.codigo)
    try {
      const dados = await api<{ mensagem: string; nivelAntes: number; nivelDepois: number }>(`/missoes/${m.codigo}/resgatar`, { metodo: 'POST' })
      toast.mostrar(dados.nivelDepois > dados.nivelAntes ? `${dados.mensagem} Você chegou ao nível ${dados.nivelDepois}!` : dados.mensagem, 'sucesso')
      if (dados.nivelDepois > dados.nivelAntes) anunciarNivel(dados.nivelDepois)
      else comemorar()
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível resgatar.', 'erro')
    } finally {
      setResgatando(null)
    }
  }

  async function resgatarEvento() {
    setResgatando('evento')
    try {
      const r = await api<SituacaoEvento & { mensagem: string }>('/eventos/resgatar', { metodo: 'POST' })
      guardarSituacaoEvento(r)
      toast.mostrar(r.mensagem, 'sucesso')
      comemorar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível resgatar.', 'erro')
    } finally {
      setResgatando(null)
    }
  }

  /* Sem missões (servidor antigo ou fora do ar): a seção some em silêncio */
  if (falhou || !situacao) return null

  const linha = (m: Missao) => {
    const cumprida = m.progresso >= m.meta
    return (
      <li key={m.codigo} className={`${styles.missao} ${m.resgatada ? styles.feita : ''}`}>
        <div className={styles.texto}>
          <strong>{m.titulo}</strong>
          <span>{m.descricao}</span>
          <div className={styles.barra} role="progressbar" aria-valuemin={0} aria-valuemax={m.meta} aria-valuenow={m.progresso} aria-label={`${m.progresso} de ${m.meta}`}>
            {Array.from({ length: m.meta }, (_, i) => (
              <span key={i} className={i < m.progresso ? styles.cheio : ''} />
            ))}
          </div>
        </div>
        {m.resgatada ? (
          <span className={styles.selo}><Check size={15} strokeWidth={2.6} /> +{m.xp} XP</span>
        ) : cumprida && situacao.resgateDisponivel ? (
          <button type="button" className={styles.resgatar} disabled={resgatando === m.codigo} onClick={() => resgatar(m)}>
            {resgatando === m.codigo ? <span className="spinner" /> : <Gift size={15} strokeWidth={2.4} />} Resgatar +{m.xp} XP
          </button>
        ) : (
          <span className={styles.premio}>{m.progresso}/{m.meta} · +{m.xp} XP</span>
        )}
      </li>
    )
  }

  return (
    <section className={styles.cartao}>
      {situacao.diarias && situacao.diarias.length > 0 && (
        <>
          <header className={styles.cabeca}>
            <h2><Sun size={20} strokeWidth={2.4} /> Missões do dia</h2>
            {situacao.dia_termina && <small>{renova(situacao.dia_termina)}</small>}
          </header>
          <ul className={`${styles.lista} ${styles.listaDia}`} aria-label="Missões do dia">
            {situacao.diarias.map(linha)}
          </ul>
        </>
      )}
      <header className={styles.cabeca}>
        <h2><Target size={20} strokeWidth={2.4} /> Missões da semana</h2>
        <small>{renova(situacao.termina)}</small>
      </header>
      <ul className={styles.lista} aria-label="Missões da semana">
        {ev && (
          <li className={`${styles.missao} ${styles.especial} ${ev.resgatado ? styles.feita : ''}`}>
            <span className={styles.iconeEspecial}><IconeEvento codigo={ev.codigo} tamanho={24} /></span>
            <div className={styles.texto}>
              <strong>Missão de {ev.nome}</strong>
              <span>Ache {ev.meta} {ev.itens} escondid{ev.artigo}s pelas páginas.</span>
              <div className={styles.barra} role="progressbar" aria-valuemin={0} aria-valuemax={ev.meta} aria-valuenow={ev.achados} aria-label={`${ev.achados} de ${ev.meta}`}>
                {Array.from({ length: ev.meta }, (_, i) => (
                  <span key={i} className={i < ev.achados ? styles.cheio : ''} />
                ))}
              </div>
            </div>
            {ev.resgatado ? (
              <span className={styles.selo}><Check size={15} strokeWidth={2.6} /> +{ev.xp} XP</span>
            ) : ev.completo ? (
              <button type="button" className={styles.resgatar} disabled={resgatando === 'evento'} onClick={resgatarEvento}>
                {resgatando === 'evento' ? <span className="spinner" /> : <Gift size={15} strokeWidth={2.4} />} Resgatar +{ev.xp} XP
              </button>
            ) : (
              <span className={styles.premio}>{ev.achados}/{ev.meta} · +{ev.xp} XP</span>
            )}
          </li>
        )}
        {situacao.missoes.map(linha)}
      </ul>
    </section>
  )
}
