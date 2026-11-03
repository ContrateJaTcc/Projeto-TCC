import { useState } from 'react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { eventoAtual } from '../../utils/eventos'
import { guardarSituacaoEvento, useSituacaoEvento, type SituacaoEvento } from '../../utils/eventoprogresso'
import { comemorar } from '../../utils/preferencias'
import IconeEvento from './iconeevento'
import styles from './evento.module.css'

/* Chance de aparecer um item em cada página que a pessoa abre */
const CHANCE = 0.45

/* Lugares longe do cabeçalho e do conteúdo do meio (em % da tela) */
const LUGARES = [
  { left: 3, top: 34 },
  { left: 93, top: 42 },
  { left: 4, top: 78 },
  { left: 92, top: 82 },
  { left: 48, top: 92 },
  { left: 95, top: 60 },
]

function sortear() {
  let forcado = false
  try {
    forcado = localStorage.getItem('evento:sempre') === '1'
  } catch {
    /* Sem armazenamento */
  }
  if (!forcado && Math.random() > CHANCE) return null
  return LUGARES[Math.floor(Math.random() * LUGARES.length)]
}

/*
 * Item do evento escondido num canto da página (a área logada monta um por página aberta).
 * Clicar pega o item; quem acha todos ganha a insígnia do evento.
 */
export default function ItemEvento() {
  const evento = eventoAtual()
  const situacao = useSituacaoEvento(Boolean(evento))
  const toast = useToast()
  const [lugar] = useState(sortear)
  const [pego, setPego] = useState(false)
  const [pegando, setPegando] = useState(false)

  if (!evento || !lugar || pego || !situacao?.disponivel || !situacao.evento || situacao.evento.completo) return null

  async function pegar() {
    if (pegando) return
    setPegando(true)
    try {
      const r = await api<SituacaoEvento & { mensagem: string; completou?: boolean }>('/eventos/coletar', { metodo: 'POST', silencioso: true })
      guardarSituacaoEvento(r)
      setPego(true)
      toast.mostrar(r.mensagem, 'sucesso')
      if (r.completou) comemorar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : `Não deu para pegar ${evento!.artigo} ${evento!.item}.`, 'info')
      setPego(true)
    } finally {
      setPegando(false)
    }
  }

  return (
    <button
      type="button"
      className={styles.item}
      style={{ left: `${lugar.left}%`, top: `${lugar.top}%` }}
      onClick={pegar}
      aria-label={`Pegar ${evento.item} escondid${evento.artigo} (evento de ${evento.nome})`}
      title={`Achou ${evento.artigo === 'a' ? 'uma' : 'um'} ${evento.item}! Clique para pegar`}
      data-evento-item={evento.codigo}
    >
      <IconeEvento codigo={evento.codigo} tamanho={34} />
    </button>
  )
}
