import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Role } from '../../context/role-context-def'
import { chaveTour, EVENTO_TOUR } from '../../utils/tour'
import styles from './tour.module.css'

interface Passo {
  /* data-tour do alvo; sem alvo visível (ex.: menu escondido no celular) o balão fica no meio */
  alvo: string
  titulo: string
  texto: string
}

const PASSOS: Record<'freelancer' | 'contratante', Passo[]> = {
  freelancer: [
    { alvo: 'menu', titulo: 'Seu castelo', texto: 'Por aqui você encontra projetos, acompanha os trabalhos em andamento, o histórico e as mensagens.' },
    { alvo: 'xp', titulo: 'Seu nível', texto: 'Cada projeto concluído, avaliação e missão dá XP. Subindo de nível, seu perfil ganha moldura e destaque.' },
    { alvo: 'notificacoes', titulo: 'Avisos', texto: 'Convites, candidaturas aceitas, prazos chegando e alertas de projetos novos aparecem no sino.' },
    { alvo: 'tema', titulo: 'Noite ou pôr do sol', texto: 'Troque o visual do castelo quando quiser. Nas Configurações dá para mudar o clima e rever este tour.' },
  ],
  contratante: [
    { alvo: 'menu', titulo: 'Seu castelo', texto: 'Por aqui você vê seus projetos, encontra freelancers, acompanha o histórico e conversa pelo chat.' },
    { alvo: 'papel', titulo: 'Publique um projeto', texto: 'Em "Projetos", crie um projeto novo, escolha um modelo pronto e receba candidaturas (até contrapropostas).' },
    { alvo: 'notificacoes', titulo: 'Avisos', texto: 'Candidaturas novas, entregas, etapas concluídas e prazos vencidos aparecem no sino.' },
    { alvo: 'tema', titulo: 'Noite ou pôr do sol', texto: 'Troque o visual do castelo quando quiser. Nas Configurações dá para mudar o clima e rever este tour.' },
  ],
}

function marcarVisto(papel: Role) {
  try {
    localStorage.setItem(chaveTour(papel), '1')
  } catch {
    /* Sem armazenamento: aparece de novo na próxima vez */
  }
}

function jaViu(papel: Role) {
  try {
    return localStorage.getItem(chaveTour(papel)) === '1'
  } catch {
    return true
  }
}

interface Caixa {
  top: number
  left: number
  width: number
  height: number
}

/* Tour de boas-vindas: 4 balões apontando o que importa no cabeçalho (uma vez por papel) */
export default function Tour({ papel }: { papel: Role }) {
  const passos = papel === 'freelancer' || papel === 'contratante' ? PASSOS[papel] : null
  const [aberto, setAberto] = useState(() => Boolean(passos) && !jaViu(papel))
  const [passo, setPasso] = useState(0)
  const [caixa, setCaixa] = useState<Caixa | null>(null)

  /* "Rever o tour" nas Configurações */
  useEffect(() => {
    const abrir = () => {
      setPasso(0)
      setAberto(true)
    }
    window.addEventListener(EVENTO_TOUR, abrir)
    return () => window.removeEventListener(EVENTO_TOUR, abrir)
  }, [])

  const atual = passos?.[passo]

  /* Mede o alvo (e de novo se a tela mudar de tamanho) */
  const medir = useCallback(() => {
    if (!atual) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${atual.alvo}"]`)
    const r = el?.getBoundingClientRect()
    setCaixa(r && r.width > 0 && r.height > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null)
  }, [atual])

  useEffect(() => {
    if (!aberto) return
    /* No próximo quadro: o cabeçalho já está no lugar */
    const quadro = requestAnimationFrame(medir)
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [aberto, medir])

  const fechar = useCallback(() => {
    marcarVisto(papel)
    setAberto(false)
  }, [papel])

  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto, fechar])

  if (!aberto || !passos || !atual) return null

  const ultimo = passo === passos.length - 1
  const folga = 6
  /* Balão logo abaixo do alvo, sem sair da tela */
  const largura = Math.min(340, window.innerWidth - 32)
  const balao = caixa
    ? {
        top: caixa.top + caixa.height + 14,
        left: Math.min(Math.max(16, caixa.left + caixa.width / 2 - largura / 2), window.innerWidth - largura - 16),
      }
    : null

  return (
    <div className={styles.tour} role="dialog" aria-modal="true" aria-labelledby="tour-titulo" aria-describedby="tour-texto">
      {caixa ? (
        <div
          className={styles.foco}
          style={{ top: caixa.top - folga, left: caixa.left - folga, width: caixa.width + folga * 2, height: caixa.height + folga * 2 }}
        />
      ) : (
        <div className={styles.veu} />
      )}
      <div className={`${styles.balao} ${balao ? '' : styles.centro}`} style={balao ? { top: balao.top, left: balao.left, width: largura } : { width: largura }}>
        <button type="button" className={styles.fechar} onClick={fechar} aria-label="Fechar o tour">
          <X size={16} strokeWidth={2.4} />
        </button>
        <span className={styles.contador}>{passo + 1} de {passos.length}</span>
        <h2 id="tour-titulo">{atual.titulo}</h2>
        <p id="tour-texto">{atual.texto}</p>
        <div className={styles.pontos} aria-hidden="true">
          {passos.map((p, i) => <span key={p.alvo} className={i === passo ? styles.pontoAtual : ''} />)}
        </div>
        <div className={styles.acoes}>
          <button type="button" className={styles.pular} onClick={fechar}>Pular</button>
          {passo > 0 && (
            <button type="button" className={styles.voltar} onClick={() => setPasso((p) => p - 1)}>Voltar</button>
          )}
          <button
            type="button"
            className={styles.proximo}
            onClick={() => (ultimo ? fechar() : setPasso((p) => p + 1))}
            autoFocus
          >
            {ultimo ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
