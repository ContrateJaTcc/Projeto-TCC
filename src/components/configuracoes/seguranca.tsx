import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, MonitorSmartphone, LogOut, KeyRound } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { haQuanto } from '../../utils/formatar'
import styles from '../../pages/Configuracoes.module.css'
import proprio from './seguranca.module.css'

interface Situacao {
  dois_fatores: boolean
  dois_fatores_possivel: boolean
  email: string | null
  sessoes_disponivel: boolean
}

interface Sessao {
  ses_id: string
  ses_agente: string | null
  ses_ip: string | null
  ses_criada: string
  ses_ultimo_uso: string
  atual: boolean
}

/* Segurança da conta: verificação em 2 etapas (código por e-mail) e os aparelhos conectados */
export default function PainelSeguranca() {
  const toast = useToast()
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [pedindo, setPedindo] = useState<boolean | null>(null)
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    const [s, l] = await Promise.all([
      api<Situacao>('/auth/seguranca', { silencioso: true }).catch(() => null),
      api<{ disponivel: boolean; sessoes: Sessao[] }>('/auth/sessoes', { silencioso: true }).catch(() => null),
    ])
    setSituacao(s)
    setSessoes(l?.sessoes ?? [])
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function pedirCodigo(ativar: boolean) {
    setOcupado(true)
    try {
      const r = await api<{ mensagem: string }>('/auth/2fa/codigo', { metodo: 'POST' })
      toast.mostrar(r.mensagem, 'info')
      setPedindo(ativar)
      setCodigo('')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível mandar o código.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (pedindo === null) return
    setOcupado(true)
    try {
      const r = await api<{ mensagem: string; dois_fatores: boolean }>('/auth/2fa', { metodo: 'PUT', corpo: { ativo: pedindo, codigo } })
      toast.mostrar(r.mensagem, 'sucesso')
      setSituacao((s) => (s ? { ...s, dois_fatores: r.dois_fatores } : s))
      setPedindo(null)
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível confirmar o código.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  async function encerrar(caminho: string, metodo: 'DELETE' | 'POST') {
    setOcupado(true)
    try {
      const r = await api<{ mensagem: string }>(caminho, { metodo })
      toast.mostrar(r.mensagem, 'sucesso')
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível desconectar.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={styles.painel}>
      <h2><ShieldCheck size={18} strokeWidth={2.2} /> Segurança</h2>

      {situacao === null ? (
        <p className={styles.texto}>A segurança da conta ainda está sendo preparada no servidor.</p>
      ) : (
        <>
          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>Verificação em 2 etapas</strong>
              <span>
                {situacao.dois_fatores
                  ? `Ligada: a cada login pedimos um código mandado para ${situacao.email ?? 'o seu e-mail'}.`
                  : situacao.dois_fatores_possivel
                    ? 'Além da senha, o login pede um código de 6 números que chega no seu e-mail.'
                    : 'O servidor ainda não está mandando e-mails, então ela não pode ser ligada agora.'}
              </span>
            </div>
            {situacao.dois_fatores_possivel && pedindo === null && (
              <button type="button" className={situacao.dois_fatores ? styles.botao : styles.botaoOuro} onClick={() => pedirCodigo(!situacao.dois_fatores)} disabled={ocupado}>
                <KeyRound size={16} strokeWidth={2.2} /> {situacao.dois_fatores ? 'Desligar' : 'Ligar'}
              </button>
            )}
          </div>

          {pedindo !== null && (
            <form className={proprio.codigo} onSubmit={confirmar}>
              <label>
                Código que chegou no e-mail
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <div className={styles.acoes}>
                <button type="button" className={styles.botao} onClick={() => setPedindo(null)}>Cancelar</button>
                <button type="submit" className={styles.botaoOuro} disabled={ocupado || codigo.length !== 6}>
                  {pedindo ? 'Ligar verificação' : 'Desligar verificação'}
                </button>
              </div>
            </form>
          )}

          {situacao.sessoes_disponivel && (
            <div className={proprio.sessoes}>
              <strong>Aparelhos conectados</strong>
              <ul>
                {sessoes.map((s) => (
                  <li key={s.ses_id}>
                    <MonitorSmartphone size={18} strokeWidth={2.2} aria-hidden="true" />
                    <div>
                      <b>{s.ses_agente ?? 'Aparelho'}</b>
                      <span>{s.atual ? 'Este aparelho' : `Usado ${haQuanto(s.ses_ultimo_uso)}`}{s.ses_ip ? ` · ${s.ses_ip}` : ''}</span>
                    </div>
                    {s.atual ? (
                      <em className={proprio.atual}>Você está aqui</em>
                    ) : (
                      <button type="button" className={styles.botao} onClick={() => encerrar(`/auth/sessoes/${s.ses_id}`, 'DELETE')} disabled={ocupado} aria-label={`Desconectar ${s.ses_agente ?? 'aparelho'}`}>
                        Desconectar
                      </button>
                    )}
                  </li>
                ))}
                {sessoes.length === 0 && <li className={proprio.vazio}>Os logins novos aparecem aqui.</li>}
              </ul>
              <button type="button" className={styles.botao} onClick={() => encerrar('/auth/sessoes/encerrar-outras', 'POST')} disabled={ocupado}>
                <LogOut size={16} strokeWidth={2.2} /> Sair de todos os outros aparelhos
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
