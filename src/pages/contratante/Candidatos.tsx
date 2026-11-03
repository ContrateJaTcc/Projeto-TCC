import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Users, Check, X, MessageCircle, ArrowRightLeft } from 'lucide-react'
import Avatar from '../../components/avatar/avatar'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarValorServico } from '../../utils/formatar'
import Brasao from '../../components/reino/brasao'
import type { GuildaResumo } from '../../utils/aparencia'
import styles from './Candidatos.module.css'

/* Candidato */
interface Candidato {
  cand_id: number
  cand_status: 'pendente' | 'aceita' | 'recusada' | 'cancelada'
  serv_id: number
  serv_titulo: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias?: number | null
  /* Contraproposta do freelancer */
  cand_valor_proposto?: number | string | null
  cand_prazo_proposto?: number | null
  cand_mensagem?: string | null
  usu_id: number
  usu_nome: string
  usu_desc: string | null
  usu_cid: string | null
  usu_est: string | null
  usu_foto: string | null
  /* Candidatura em nome da guilda */
  guilda?: (GuildaResumo & { membros: number }) | null
}

const ROTULO_STATUS: Record<string, string> = {
  pendente: 'Aguardando resposta',
  aceita: 'Aceito',
  recusada: 'Recusado',
  cancelada: 'Cancelada',
}

export default function Candidatos() {
  const toast = useToast()
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  /* Em ação */
  const [emAcao, setEmAcao] = useState<{ id: number; acao: 'aceitar' | 'recusar' } | null>(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await api<{ candidatos: Candidato[] }>('/candidaturas/recebidas')
      setCandidatos(dados.candidatos)
      setErro('')
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

  async function responder(c: Candidato, acao: 'aceitar' | 'recusar') {
    setEmAcao({ id: c.cand_id, acao })

    try {
      await api(`/candidaturas/${c.cand_id}`, { metodo: 'PUT', corpo: { acao } })
      toast.mostrar(
        acao === 'aceitar'
          ? `${c.usu_nome.split(' ')[0]} foi contratado! "${c.serv_titulo}" agora está em andamento.`
          : 'Candidatura recusada.',
        acao === 'aceitar' ? 'sucesso' : 'info'
      )
      // Recarrega
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível responder à candidatura.', 'erro')
    } finally {
      setEmAcao(null)
    }
  }

  if (carregando) return <Carregando variante="lista" />
  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setCarregando(true); carregar() }} />

  /* Pendentes primeiro */
  const pendentes = candidatos.filter((c) => c.cand_status === 'pendente')
  const respondidos = candidatos.filter((c) => c.cand_status !== 'pendente')

  const cartao = (c: Candidato) => {
    const ocupado = emAcao?.id === c.cand_id
    const pendente = c.cand_status === 'pendente'
    const valorProposto = c.cand_valor_proposto != null ? Number(c.cand_valor_proposto) : null
    const prazoProposto = c.cand_prazo_proposto ?? null
    const temProposta = valorProposto !== null || prazoProposto !== null

    return (
      <article key={c.cand_id} className={`${styles.card} ${pendente ? '' : styles.respondido}`}>
        <Avatar nome={c.usu_nome} size={54} foto={c.usu_foto} />

        <div className={styles.info}>
          <span className={styles.projeto}>{c.serv_titulo}</span>
          <div className={styles.nomeELinha}>
            <strong>{c.usu_nome}</strong>
            {c.guilda && (
              <span className={styles.guilda} title={`Candidatura em nome da guilda ${c.guilda.nome}`}>
                <Brasao brasao={c.guilda.brasao} cor={c.guilda.cor} tamanho={16} />
                Com a guilda {c.guilda.nome} · {c.guilda.membros} {c.guilda.membros === 1 ? 'membro' : 'membros'}
              </span>
            )}
          </div>
          <span className={styles.especialidade}>
            {[c.usu_cid, c.usu_est].filter(Boolean).join(' - ') || 'Localização não informada'}
          </span>
          <p className={styles.proposta}>
            {c.usu_desc || 'Este freelancer ainda não escreveu uma descrição.'}
          </p>

          {temProposta && (
            <div className={styles.contraproposta}>
              <strong>
                <ArrowRightLeft size={14} strokeWidth={2.4} />
                Contraproposta
              </strong>
              <div className={styles.contrapropostaItens}>
                {valorProposto !== null && (
                  <span>
                    Valor: <s>{formatarValorServico(c.serv_valor, c.serv_tipo_valor)}</s>{' '}
                    <b>{formatarValorServico(valorProposto, c.serv_tipo_valor)}</b>
                  </span>
                )}
                {prazoProposto !== null && (
                  <span>
                    Prazo: {c.serv_qtd_dias ? <s>{c.serv_qtd_dias} dias</s> : null}{' '}
                    <b>{prazoProposto} {prazoProposto === 1 ? 'dia' : 'dias'}</b>
                  </span>
                )}
              </div>
              {c.cand_mensagem && <p>“{c.cand_mensagem}”</p>}
              {pendente && <small>Aceitar esta candidatura aceita também o novo valor e prazo.</small>}
            </div>
          )}

          {/* Portfólio */}
          <Link className={styles.verPortfolio} to={`/contratante/freelancer/${c.usu_id}`}>
            <Briefcase size={14} strokeWidth={2.2} />
            Ver perfil, insígnias e portfólio
          </Link>
          <Link
            className={styles.verPortfolio}
            to={`/contratante/mensagens?serv=${c.serv_id}&com=${c.usu_id}&nome=${encodeURIComponent(c.usu_nome)}&titulo=${encodeURIComponent(c.serv_titulo)}`}
          >
            <MessageCircle size={14} strokeWidth={2.2} />
            Mensagem
          </Link>
        </div>

        <div className={styles.direita}>
          <span className={styles.valor}>
            {formatarValorServico(c.serv_valor, c.serv_tipo_valor)}
          </span>

          {pendente ? (
            <div className={styles.acoes}>
              <button
                type="button"
                className={styles.recusar}
                onClick={() => responder(c, 'recusar')}
                disabled={ocupado}
              >
                {ocupado && emAcao?.acao === 'recusar' ? <span className="spinner" /> : <X size={15} strokeWidth={2.6} />}
                Recusar
              </button>
              <button
                type="button"
                className={styles.aceitar}
                onClick={() => responder(c, 'aceitar')}
                disabled={ocupado}
              >
                {ocupado && emAcao?.acao === 'aceitar' ? <span className="spinner" /> : <Check size={15} strokeWidth={2.6} />}
                {temProposta ? 'Aceitar contraproposta' : 'Aceitar'}
              </button>
            </div>
          ) : (
            <span className={`${styles.etiqueta} ${styles[c.cand_status] ?? ''}`}>
              {ROTULO_STATUS[c.cand_status] ?? c.cand_status}
            </span>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className={styles.pagina}>
      <h1 className="placa">Candidatos</h1>

      {candidatos.length === 0 ? (
        <div className={`${styles.vazio} entrada`}>
          <Users size={34} strokeWidth={1.7} />
          <strong>Nenhuma candidatura ainda</strong>
          <p>Quando um freelancer se candidatar a um projeto seu, ele aparece aqui para você comparar e escolher.</p>
          <Link to="/contratante/criar-projeto" className={styles.vazioBtn}>Publicar um projeto</Link>
        </div>
      ) : (
        <>
          <h2 className={`${styles.grupo} placa`}>
            Aguardando sua resposta <span>{pendentes.length}</span>
          </h2>
          {pendentes.length === 0 ? (
            <p className={`${styles.nenhum} placa`}>Tudo respondido por aqui. 🎉</p>
          ) : (
            <div className={`${styles.lista} cascata`}>{pendentes.map(cartao)}</div>
          )}

          {respondidos.length > 0 && (
            <>
              <h2 className={`${styles.grupo} placa`}>
                Já respondidas <span>{respondidos.length}</span>
              </h2>
              <div className={`${styles.lista} cascata`}>{respondidos.map(cartao)}</div>
            </>
          )}
        </>
      )}
    </div>
  )
}
