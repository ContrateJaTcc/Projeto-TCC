import { useState } from 'react'
import { Gift, Check } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useRole } from '../../context/useRole'
import { useToast } from '../../context/useToast'
import { comemorar } from '../../utils/preferencias'
import { eventoAtual, fimDoEvento } from '../../utils/eventos'
import { guardarSituacaoEvento, useSituacaoEvento, type SituacaoEvento } from '../../utils/eventoprogresso'
import IconeEvento from './iconeevento'
import styles from './evento.module.css'

/* Faixa do evento no painel: o que é, até quando e quantos itens a pessoa já achou */
export default function FaixaEvento() {
  const evento = eventoAtual()
  const situacao = useSituacaoEvento(Boolean(evento))
  const { role } = useRole()
  const toast = useToast()
  const [resgatando, setResgatando] = useState(false)

  if (!evento || !situacao?.disponivel || !situacao.evento) return null
  const ev = situacao.evento
  const freelancer = role === 'freelancer'

  async function resgatar() {
    setResgatando(true)
    try {
      const r = await api<SituacaoEvento & { mensagem: string }>('/eventos/resgatar', { metodo: 'POST' })
      guardarSituacaoEvento(r)
      toast.mostrar(r.mensagem, 'sucesso')
      comemorar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível resgatar.', 'erro')
    } finally {
      setResgatando(false)
    }
  }

  return (
    <section className={styles.faixa} aria-label={`Evento de ${ev.nome}`}>
      <span className={styles.icone}><IconeEvento codigo={ev.codigo} tamanho={36} /></span>
      <div className={styles.texto}>
        <strong>{ev.nome} no castelo · até {fimDoEvento(ev)}</strong>
        <span>
          {ev.completo
            ? `Você achou ${ev.artigo === 'a' ? 'todas' : 'todos'} ${ev.artigo === 'a' ? 'as' : 'os'} ${ev.itens} e ganhou a insígnia "${ev.insignia}"!`
            : `Tem ${ev.meta} ${ev.itens} escondid${ev.artigo}s pelas páginas. Ache ${ev.artigo === 'a' ? 'todas' : 'todos'} para ganhar a insígnia "${ev.insignia}"${freelancer ? ` e +${ev.xp} XP` : ''}.`}
        </span>
        <div className={styles.contas} role="progressbar" aria-valuemin={0} aria-valuemax={ev.meta} aria-valuenow={ev.achados} aria-label={`${ev.achados} de ${ev.meta} ${ev.itens}`}>
          {Array.from({ length: ev.meta }, (_, i) => (
            <span key={i} className={i < ev.achados ? styles.achado : ''}>
              <IconeEvento codigo={ev.codigo} tamanho={18} />
            </span>
          ))}
          <b>{ev.achados}/{ev.meta}</b>
        </div>
      </div>
      {ev.completo && freelancer && (
        ev.resgatado ? (
          <span className={styles.feito}><Check size={15} strokeWidth={2.6} /> +{ev.xp} XP</span>
        ) : (
          <button type="button" className={styles.resgatar} onClick={resgatar} disabled={resgatando}>
            {resgatando ? <span className="spinner" /> : <Gift size={15} strokeWidth={2.4} />} Resgatar +{ev.xp} XP
          </button>
        )
      )}
    </section>
  )
}
