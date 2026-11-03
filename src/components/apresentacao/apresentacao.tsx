import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Presentation, ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react'
import { useRole } from '../../context/useRole'
import { useToast } from '../../context/useToast'
import { salvarSessao } from '../../services/api'
import { demoAtivo } from '../../services/demoflag'
import { EVENTO_APRESENTACAO, ROTEIRO, guardarPassoApresentacao, lerPassoApresentacao } from '../../utils/apresentacao'
import styles from './apresentacao.module.css'

/* Painel do roteiro de apresentação (só no modo demonstração); o passo fica guardado na aba */
export default function Apresentacao() {
  const { setRole } = useRole()
  const navigate = useNavigate()
  const toast = useToast()
  const [passo, setPasso] = useState<number | null>(() => (demoAtivo() ? lerPassoApresentacao() : null))
  const [minimizado, setMinimizado] = useState(false)

  const ir = useCallback(
    async (n: number) => {
      const p = ROTEIRO[n]
      if (!p) return
      /* Troca de conta sem apagar o que já foi feito */
      const { trocarContaDemo } = await import('../../services/demo')
      const tipo = salvarSessao(trocarContaDemo(p.papel), p.papel)
      if (tipo) setRole(tipo)
      guardarPassoApresentacao(n)
      setPasso(n)
      navigate(p.rota, { viewTransition: true })
    },
    [navigate, setRole]
  )

  /* Abre pelas Configurações ou com Ctrl+Shift+A */
  useEffect(() => {
    const abrir = () => {
      if (!demoAtivo()) {
        toast.mostrar('O modo apresentação funciona no modo demonstração (entre por "Experimente sem conta" no login).', 'info')
        return
      }
      setMinimizado(false)
      ir(0)
    }
    const teclar = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener(EVENTO_APRESENTACAO, abrir)
    window.addEventListener('keydown', teclar)
    return () => {
      window.removeEventListener(EVENTO_APRESENTACAO, abrir)
      window.removeEventListener('keydown', teclar)
    }
  }, [ir, toast])

  function encerrar() {
    guardarPassoApresentacao(null)
    setPasso(null)
  }

  async function restaurar() {
    const { reiniciarDemo } = await import('../../services/demo')
    const tipo = salvarSessao(reiniciarDemo('freelancer'), 'freelancer')
    if (tipo) setRole(tipo)
    encerrar()
    toast.mostrar('Dados de exemplo restaurados. Tudo pronto para a próxima apresentação!', 'sucesso')
    navigate('/freelancer', { viewTransition: true })
  }

  if (passo === null || !demoAtivo()) return null
  const atual = ROTEIRO[passo]
  const ultimo = passo === ROTEIRO.length - 1

  if (minimizado) {
    return (
      <button type="button" className={styles.minimo} onClick={() => setMinimizado(false)} aria-label="Mostrar o roteiro da apresentação">
        <Presentation size={18} strokeWidth={2.2} /> {passo + 1}/{ROTEIRO.length}
      </button>
    )
  }

  return (
    <aside className={styles.painel} aria-label="Roteiro da apresentação" aria-live="polite">
      <div className={styles.topo}>
        <span className={styles.selo}>
          <Presentation size={14} strokeWidth={2.4} /> Apresentação · {passo + 1} de {ROTEIRO.length} · {atual.papel === 'freelancer' ? 'Ana (freelancer)' : 'Lucas (contratante)'}
        </span>
        <button type="button" className={styles.icone} onClick={() => setMinimizado(true)} aria-label="Esconder o roteiro">
          <ChevronRight size={16} strokeWidth={2.4} />
        </button>
        <button type="button" className={styles.icone} onClick={encerrar} aria-label="Encerrar a apresentação">
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
      <h2>{atual.titulo}</h2>
      <p>{atual.texto}</p>
      <div className={styles.barra} aria-hidden="true">
        <span style={{ width: `${((passo + 1) / ROTEIRO.length) * 100}%` }} />
      </div>
      <div className={styles.acoes}>
        <button type="button" className={styles.botao} onClick={() => ir(passo - 1)} disabled={passo === 0}>
          <ChevronLeft size={15} strokeWidth={2.4} /> Voltar
        </button>
        {ultimo ? (
          <button type="button" className={styles.botaoOuro} onClick={restaurar}>
            <RotateCcw size={15} strokeWidth={2.4} /> Terminar e restaurar dados
          </button>
        ) : (
          <button type="button" className={styles.botaoOuro} onClick={() => ir(passo + 1)}>
            Próximo <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </aside>
  )
}
