import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, MailOpen } from 'lucide-react'
import Avatar from '../avatar/avatar'
import Carregando from '../carregando/carregando'
import EstadoErro from '../carregando/estadoerro'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarValorServico, haQuanto } from '../../utils/formatar'
import styles from './convites.module.css'

interface Convite {
  conv_id: number
  conv_status: 'pendente' | 'aceito' | 'recusado'
  conv_mensagem: string | null
  conv_data: string
  serv_id: number
  serv_titulo: string
  serv_desc: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_status: string
  categoria: string
  contratante_nome: string
  contratante_foto: string | null
}

const ROTULO: Record<Convite['conv_status'], string> = {
  pendente: 'Aguardando você',
  aceito: 'Aceito',
  recusado: 'Recusado',
}

/* Convites do freelancer */
export default function ConvitesRecebidos() {
  const toast = useToast()
  const [convites, setConvites] = useState<Convite[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [emAcao, setEmAcao] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await api<{ convites: Convite[] }>('/convites/recebidos')
      setConvites(dados.convites)
      setErro('')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar seus convites.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function responder(c: Convite, acao: 'aceitar' | 'recusar') {
    setEmAcao(c.conv_id)

    try {
      const dados = await api<{ mensagem: string }>(`/convites/${c.conv_id}`, { metodo: 'PUT', corpo: { acao } })
      toast.mostrar(dados.mensagem, acao === 'aceitar' ? 'sucesso' : 'info')
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível responder ao convite.', 'erro')
    } finally {
      setEmAcao(null)
    }
  }

  if (carregando) return <Carregando variante="lista" quantidade={2} />
  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setCarregando(true); carregar() }} />

  if (convites.length === 0) {
    return (
      <div className={`${styles.vazio} entrada`}>
        <MailOpen size={32} strokeWidth={1.7} />
        <strong>Nenhum convite por enquanto</strong>
        <p>Capriche no perfil e no portfólio: contratantes podem convidar você direto para um projeto.</p>
        <Link to="/freelancer/perfil" className={styles.link}>Completar meu perfil</Link>
      </div>
    )
  }

  return (
    <div className={`${styles.lista} cascata`}>
      {convites.map((c) => {
        const pendente = c.conv_status === 'pendente'
        const ocupado = emAcao === c.conv_id

        return (
          <article key={c.conv_id} className={`${styles.card} ${pendente ? styles.destaque : ''}`}>
            <div className={styles.topo}>
              <Avatar nome={c.contratante_nome} size={40} foto={c.contratante_foto} />
              <div>
                <strong>{c.contratante_nome}</strong>
                <span>convidou você {haQuanto(c.conv_data)}</span>
              </div>
              <span className={`${styles.status} ${styles[c.conv_status]}`}>{ROTULO[c.conv_status]}</span>
            </div>

            <span className={styles.categoria}>{c.categoria}</span>
            <h3>
              {c.serv_status === 'aberto' ? (
                <Link to={`/freelancer/projetos/${c.serv_id}`}>{c.serv_titulo}</Link>
              ) : (
                c.serv_titulo
              )}
            </h3>
            <p className={styles.descricao}>{c.serv_desc}</p>

            {c.conv_mensagem && <blockquote className={styles.recado}>“{c.conv_mensagem}”</blockquote>}

            <div className={styles.rodape}>
              <strong className={styles.valor}>{formatarValorServico(c.serv_valor, c.serv_tipo_valor)}</strong>

              {pendente && (
                <div className={styles.acoes}>
                  <button type="button" className={styles.recusar} onClick={() => responder(c, 'recusar')} disabled={ocupado}>
                    <X size={15} strokeWidth={2.6} /> Recusar
                  </button>
                  <button type="button" className={styles.aceitar} onClick={() => responder(c, 'aceitar')} disabled={ocupado}>
                    {ocupado ? <span className="spinner" /> : <Check size={15} strokeWidth={2.6} />} Aceitar convite
                  </button>
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
