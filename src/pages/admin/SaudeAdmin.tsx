import { useCallback, useEffect, useState } from 'react'
import { Database, Mail, BellRing, Clock, Bug, Server, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { haQuanto } from '../../utils/formatar'
import styles from './SaudeAdmin.module.css'

interface Saude {
  banco: { ok: boolean; ms: number | null; erro: string | null }
  email: boolean
  push: boolean
  migracoes: number | null
  erros_24h: number | null
  ultima_migracao_ok: boolean
  tarefas: Record<string, string>
  servidor: { no_ar_desde: string; memoria_mb: number; node: string; vercel: boolean }
  verificado_em: string
  demonstracao?: boolean
}

const TAREFAS: [string, string, number][] = [
  ['lembretes', 'Lembretes de prazo', 2 * 3_600_000],
  ['limpeza', 'Limpeza e projetos recorrentes', 2 * 86_400_000],
  ['resumo', 'Resumo semanal por e-mail', 8 * 86_400_000],
]

/* A tarefa rodou dentro do intervalo esperado? (fora do render: o lint pede componentes puros) */
const rodouHaPouco = (quando: string, limite: number) => Date.now() - new Date(quando).getTime() < limite

/* Saúde do servidor: banco, e-mail, push, migrações e quando as tarefas automáticas rodaram */
export default function SaudeAdmin() {
  const [dados, setDados] = useState<Saude | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setErro('')
    api<Saude>('/admin/saude')
      .then(setDados)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'O servidor não respondeu.'))
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={carregar} />
  if (!dados) return <Carregando variante="cartoes" quantidade={4} />

  const linha = (ok: boolean | null, icone: React.ReactNode, titulo: string, texto: string) => (
    <li className={ok === null ? styles.neutro : ok ? styles.ok : styles.ruim}>
      {icone}
      <div>
        <strong>{titulo}</strong>
        <span>{texto}</span>
      </div>
      {ok === null ? null : ok ? <CheckCircle2 size={18} aria-label="ok" /> : <XCircle size={18} aria-label="com problema" />}
    </li>
  )

  return (
    <div className={styles.caixa}>
      {dados.demonstracao && <p className={styles.aviso}>Modo demonstração: estes números são de exemplo.</p>}
      <ul className={styles.lista}>
        {linha(dados.banco.ok, <Database size={20} aria-hidden="true" />, 'Banco de dados', dados.banco.ok ? `Respondendo em ${dados.banco.ms} ms` : `Fora do ar (${dados.banco.erro ?? 'erro'})`)}
        {linha(dados.ultima_migracao_ok, <Server size={20} aria-hidden="true" />, 'Migrações', dados.ultima_migracao_ok ? `Em dia (${dados.migracoes ?? '?'} rodadas)` : 'Falta rodar npx knex migrate:latest')}
        {linha(dados.email, <Mail size={20} aria-hidden="true" />, 'E-mail', dados.email ? 'Configurado (códigos e resumos saem)' : 'Sem SMTP: códigos por e-mail e confirmação de cadastro ficam desligados')}
        {linha(dados.push, <BellRing size={20} aria-hidden="true" />, 'Notificações no celular', dados.push ? 'Chaves VAPID configuradas' : 'Sem chaves VAPID: o push fica desligado')}
        {linha(dados.erros_24h === null ? null : dados.erros_24h < 20, <Bug size={20} aria-hidden="true" />, 'Erros nas últimas 24 h', dados.erros_24h === null ? 'Monitor ainda não instalado' : `${dados.erros_24h} ${dados.erros_24h === 1 ? 'erro' : 'erros'} (veja a aba Erros)`)}
        {TAREFAS.map(([chave, titulo, limite]) => {
          const quando = dados.tarefas[chave]
          return linha(
            quando ? rodouHaPouco(quando, limite) : null,
            <Clock size={20} aria-hidden="true" />,
            titulo,
            quando ? `Rodou ${haQuanto(quando)}` : 'Ainda não rodou desde que o painel começou a anotar'
          )
        })}
      </ul>
      <p className={styles.rodape}>
        Servidor no ar desde {new Date(dados.servidor.no_ar_desde).toLocaleString('pt-BR')} · {dados.servidor.memoria_mb} MB de memória · Node {dados.servidor.node}
        {dados.servidor.vercel ? ' · Vercel' : ''}
        <button type="button" className={styles.atualizar} onClick={carregar}><RefreshCw size={14} strokeWidth={2.4} /> Conferir de novo</button>
      </p>
    </div>
  )
}
