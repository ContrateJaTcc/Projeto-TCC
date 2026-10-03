import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, CircleCheckBig, Star, MessageCircle } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import FormAvaliacao from '../components/gamificacao/formavaliacao'
import { formatarValorServico, formatarData } from '../utils/formatar'
import type { AvaliacaoPendente } from '../components/gamificacao/tipos'
import styles from './Historico.module.css'

interface ItemHistorico {
  serv_id: number
  serv_titulo: string
  serv_desc: string
  categoria: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_status: string
  serv_data_criacao: string
  /* A outra ponta do projeto (contratante ou freelancer aceito). */
  outro_usu_id: number | null
  outro_nome: string | null
}

interface HistoricoProps {
  apenasEntregues?: boolean
}

const ROTULO_STATUS: Record<string, string> = {
  em_andamento: 'Em andamento',
  finalizado: 'Concluído',
  cancelado: 'Cancelado',
}

export default function Historico({ apenasEntregues = false }: HistoricoProps) {
  const { role } = useRole()
  const ehContratante = role === 'contratante'

  const [itens, setItens] = useState<ItemHistorico[]>([])
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const toast = useToast()

  /* Finalizar pede confirmação no próprio botão (dois cliques). */
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [finalizando, setFinalizando] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [dadosHistorico, dadosPendentes] = await Promise.all([
        api<{ itens: ItemHistorico[] }>('/historico'),
        api<{ pendentes: AvaliacaoPendente[] }>('/avaliacoes/pendentes'),
      ])
      setItens(dadosHistorico.itens)
      setPendentes(dadosPendentes.pendentes)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function finalizar(serv_id: number) {
    if (confirmando !== serv_id) {
      setConfirmando(serv_id)
      return
    }

    setFinalizando(serv_id)

    try {
      const dados = await api<{ mensagem: string }>(`/servicos/${serv_id}/finalizar`, { metodo: 'PUT' })
      toast.mostrar(dados.mensagem)
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível finalizar o projeto.', 'erro')
    } finally {
      setFinalizando(null)
      setConfirmando(null)
    }
  }

  async function avaliacaoEnviada() {
    toast.mostrar('Avaliação enviada. Obrigado!')
    await carregar()
  }

  function tentarDeNovo() {
    setErro('')
    setCarregando(true)
    carregar()
  }

  /* "Entregues" é o recorte do que ainda está em andamento. */
  const visiveis = apenasEntregues
    ? itens.filter((i) => i.serv_status === 'em_andamento')
    : itens

  if (carregando) {
    return <Carregando variante="lista" />
  }

  if (erro) {
    return <EstadoErro mensagem={erro} onTentarDeNovo={tentarDeNovo} />
  }

  return (
    <div className={styles.pagina}>
      <h1>{apenasEntregues ? 'Trabalhos em andamento' : 'Histórico'}</h1>
      {apenasEntregues && (
        <p className={styles.subtitulo}>
          Projetos que você está executando agora. Quando o contratante finalizar, você ganha XP.
        </p>
      )}

      {!apenasEntregues && pendentes.length > 0 && (
        <p className={styles.faixaPendentes}>
          <Star size={16} strokeWidth={2.2} />
          Você tem {pendentes.length} {pendentes.length === 1 ? 'avaliação pendente' : 'avaliações pendentes'}.
          {ehContratante
            ? ' Sua nota dá XP ao freelancer e ajuda outros contratantes.'
            : ' Avaliar o contratante ajuda outros freelancers a escolherem bem.'}
        </p>
      )}


      {visiveis.length === 0 ? (
        <div className={`${styles.vazio} entrada`}>
          <PackageCheck size={32} strokeWidth={1.8} />
          <strong>
            {apenasEntregues ? 'Nenhum trabalho em andamento' : 'Nenhum projeto no histórico'}
          </strong>
          <p>
            {apenasEntregues
              ? 'Assim que uma candidatura sua for aceita, o projeto aparece aqui.'
              : 'Projetos em andamento, finalizados e cancelados aparecem aqui.'}
          </p>
        </div>
      ) : (
        <div className={`${styles.lista} cascata`}>
          {visiveis.map((item) => {
            const avaliar = apenasEntregues ? [] : pendentes.filter((p) => p.serv_id === item.serv_id)
            const podeFinalizar = ehContratante && item.serv_status === 'em_andamento'

            return (
              <article key={item.serv_id} className={styles.card}>
                <div className={styles.info}>
                  <span className={styles.categoria}>{item.categoria}</span>
                  <strong>{item.serv_titulo}</strong>
                  <p>{item.serv_desc}</p>
                </div>
                <div className={styles.direita}>
                  <span className={styles.valor}>
                    {formatarValorServico(item.serv_valor, item.serv_tipo_valor)}
                  </span>
                  <span className={styles.data}>{formatarData(item.serv_data_criacao)}</span>
                  <span
                    className={`${styles.status} ${
                      item.serv_status === 'finalizado' ? styles.concluido : ''
                    }`}
                  >
                    {ROTULO_STATUS[item.serv_status] ?? item.serv_status}
                  </span>

                  {item.outro_usu_id && (
                    <Link
                      className={styles.btnMensagem}
                      to={`/${role}/mensagens?serv=${item.serv_id}&com=${item.outro_usu_id}&nome=${encodeURIComponent(item.outro_nome ?? '')}&titulo=${encodeURIComponent(item.serv_titulo)}`}
                    >
                      <MessageCircle size={14} strokeWidth={2.2} />
                      Mensagem{item.outro_nome ? ` para ${item.outro_nome.split(' ')[0]}` : ''}
                    </Link>
                  )}

                  {podeFinalizar && (
                    <button
                      type="button"
                      className={`${styles.btnFinalizar} ${confirmando === item.serv_id ? styles.confirmar : ''}`}
                      onClick={() => finalizar(item.serv_id)}
                      onBlur={() => setConfirmando((c) => (c === item.serv_id ? null : c))}
                      disabled={finalizando === item.serv_id}
                    >
                      <CircleCheckBig size={15} strokeWidth={2.2} />
                      {finalizando === item.serv_id
                        ? 'Finalizando...'
                        : confirmando === item.serv_id
                          ? 'Confirmar: trabalho entregue?'
                          : 'Finalizar projeto'}
                    </button>
                  )}
                </div>

                {avaliar.map((p) => (
                  <FormAvaliacao key={p.usu_id} pendente={p} onEnviada={avaliacaoEnviada} />
                ))}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
