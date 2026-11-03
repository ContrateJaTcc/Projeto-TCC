import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Maximize, Users, Briefcase, CircleCheckBig, Star, Wifi, Building2 } from 'lucide-react'
import { api } from '../services/api'
import MuralReino from '../components/reino/mural'
import logo from '../components/imgs/logo.png'
import styles from './ModoTv.module.css'

interface Numeros {
  freelancers: number
  contratantes: number
  projetos_abertos: number
  projetos_concluidos: number
  avaliacoes: number
  nota_media: number | null
  online: number | null
  atualizado_em: string
}

const ATUALIZAR = 60_000

/* Número que sobe contando até o valor (fica parado se a pessoa pediu menos movimento) */
function Contador({ valor }: { valor: number }) {
  const [mostrado, setMostrado] = useState(valor)
  useEffect(() => {
    if (document.documentElement.dataset.movimento === 'reduzido') {
      const t = setTimeout(() => setMostrado(valor), 0)
      return () => clearTimeout(t)
    }
    let quadro = 0
    const inicio = performance.now()
    const de = 0
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 900)
      setMostrado(Math.round(de + (valor - de) * t))
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [valor])
  return <>{mostrado.toLocaleString('pt-BR')}</>
}

/* Modo TV: os números da plataforma ao vivo, em tela cheia, para deixar aberto no telão */
export default function ModoTv() {
  const [numeros, setNumeros] = useState<Numeros | null>(null)
  const [erro, setErro] = useState(false)
  const [hora, setHora] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    let vivo = true
    const buscar = () =>
      api<Numeros>('/publico/numeros', { publico: true, silencioso: true })
        .then((d) => {
          if (!vivo) return
          setNumeros(d)
          setErro(false)
        })
        .catch(() => vivo && setErro(true))
    buscar()
    const id = setInterval(buscar, ATUALIZAR)
    const relogio = setInterval(() => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), 15_000)
    return () => {
      vivo = false
      clearInterval(id)
      clearInterval(relogio)
    }
  }, [])

  const cartoes = numeros
    ? [
        { icone: Users, valor: numeros.freelancers, rotulo: 'freelancers' },
        { icone: Building2, valor: numeros.contratantes, rotulo: 'contratantes' },
        { icone: Briefcase, valor: numeros.projetos_abertos, rotulo: 'projetos abertos' },
        { icone: CircleCheckBig, valor: numeros.projetos_concluidos, rotulo: 'projetos concluídos' },
        ...(numeros.online !== null ? [{ icone: Wifi, valor: numeros.online, rotulo: 'online agora' }] : []),
        { icone: Star, valor: numeros.avaliacoes, rotulo: numeros.nota_media ? `avaliações · média ${numeros.nota_media.toLocaleString('pt-BR')}` : 'avaliações' },
      ]
    : []

  return (
    <div className={styles.tela} data-area="home">
      <header className={styles.topo}>
        <Link to="/" className={styles.marca}>
          <img src={logo} alt="" />
          <span>ContrateJá ao vivo</span>
        </Link>
        <span className={styles.hora} aria-label={`Agora são ${hora}`}>{hora}</span>
        <button type="button" className={styles.cheia} onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
          <Maximize size={16} strokeWidth={2.4} /> Tela cheia
        </button>
      </header>

      {erro && !numeros && <p className={styles.aviso} role="alert">Sem conexão com o servidor agora. Tentando de novo a cada minuto.</p>}

      <ul className={styles.numeros} aria-label="Números da plataforma" aria-live="polite">
        {cartoes.map(({ icone: Icone, valor, rotulo }) => (
          <li key={rotulo}>
            <Icone size={30} strokeWidth={2.2} aria-hidden="true" />
            <strong><Contador valor={valor} /></strong>
            <span>{rotulo}</span>
          </li>
        ))}
      </ul>

      <div className={styles.mural}>
        <MuralReino limite={6} titulo="Acontecendo agora no castelo" />
      </div>

      <p className={styles.rodape}>Atualiza sozinho a cada minuto · Esc sai da tela cheia</p>
    </div>
  )
}
