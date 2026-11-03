import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import styles from './convites.module.css'

interface ProjetoAberto {
  serv_id: number
  serv_titulo: string
  serv_status: string
}

interface ConviteEnviado {
  conv_id: number
  conv_status: 'pendente' | 'aceito' | 'recusado'
  serv_id: number
  serv_titulo: string
}

const LIMITE = 280

const ROTULO: Record<ConviteEnviado['conv_status'], string> = {
  pendente: 'aguardando resposta',
  aceito: 'aceito',
  recusado: 'recusado',
}

/* Convidar freelancer */
export default function Convidar({ usuId, nome }: { usuId: number; nome: string }) {
  const toast = useToast()
  const [projetos, setProjetos] = useState<ProjetoAberto[]>([])
  const [enviados, setEnviados] = useState<ConviteEnviado[]>([])
  const [servId, setServId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    let ativo = true

    Promise.all([
      api<{ projetos: ProjetoAberto[] }>('/servicos/meus'),
      api<{ convites: ConviteEnviado[] }>(`/convites/enviados?usu_id=${usuId}`),
    ])
      .then(([p, c]) => {
        if (!ativo) return
        setProjetos(p.projetos.filter((x) => x.serv_status === 'aberto'))
        setEnviados(c.convites)
      })
      .catch(() => {})
      .finally(() => ativo && setCarregado(true))

    return () => {
      ativo = false
    }
  }, [usuId])

  const jaConvidados = new Set(enviados.map((c) => c.serv_id))
  const disponiveis = projetos.filter((p) => !jaConvidados.has(p.serv_id))
  const primeiroNome = nome.split(' ')[0]

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!servId) return

    setEnviando(true)

    try {
      const dados = await api<{ mensagem: string; conv_id: number }>('/convites', {
        metodo: 'POST',
        corpo: { serv_id: Number(servId), usu_id: usuId, mensagem },
      })
      const projeto = projetos.find((p) => String(p.serv_id) === servId)
      setEnviados((atuais) => [
        { conv_id: dados.conv_id, conv_status: 'pendente', serv_id: Number(servId), serv_titulo: projeto?.serv_titulo ?? '' },
        ...atuais,
      ])
      setServId('')
      setMensagem('')
      toast.mostrar(`Convite enviado para ${primeiroNome}!`)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível enviar o convite.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  if (!carregado) return null

  return (
    <section className={styles.convidar}>
      <h2>
        <Sparkles size={18} strokeWidth={2.2} /> Convidar {primeiroNome} para um projeto
      </h2>

      {disponiveis.length === 0 ? (
        <p className={styles.dica}>
          {projetos.length === 0 ? (
            <>
              Você não tem projetos abertos. <Link to="/contratante/criar-projeto">Publique um projeto</Link> para convidar.
            </>
          ) : (
            'Você já convidou este freelancer para todos os seus projetos abertos.'
          )}
        </p>
      ) : (
        <form onSubmit={enviar} className={styles.formConvite}>
          <label>
            Projeto
            <select value={servId} onChange={(e) => setServId(e.target.value)} required>
              <option value="">Escolha um projeto aberto</option>
              {disponiveis.map((p) => (
                <option key={p.serv_id} value={p.serv_id}>{p.serv_titulo}</option>
              ))}
            </select>
          </label>

          <label>
            Recado (opcional)
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={LIMITE}
              rows={2}
              placeholder={`Ex.: Gostei do seu portfólio, ${primeiroNome}!`}
            />
            <small>{mensagem.length}/{LIMITE}</small>
          </label>

          <button type="submit" className={styles.aceitar} disabled={enviando || !servId}>
            {enviando ? <span className="spinner" /> : <Send size={15} strokeWidth={2.4} />}
            Enviar convite
          </button>
        </form>
      )}

      {enviados.length > 0 && (
        <ul className={styles.enviados}>
          {enviados.map((c) => (
            <li key={c.conv_id}>
              <span>{c.serv_titulo}</span>
              <span className={`${styles.status} ${styles[c.conv_status]}`}>{ROTULO[c.conv_status]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
