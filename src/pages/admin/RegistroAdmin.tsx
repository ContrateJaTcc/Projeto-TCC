import { useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import styles from './Painel.module.css'

interface Linha {
  reg_id: number
  usu_nome: string
  alvo_nome: string | null
  reg_acao: string
  reg_detalhe: string | null
  reg_data: string
}

/* O que cada código de ação quer dizer, em português */
const ACOES: Record<string, string> = {
  conta_ativa: 'reativou a conta de',
  conta_suspensa: 'suspendeu a conta de',
  conta_banida: 'baniu',
  cancelar_projeto: 'cancelou um projeto de',
  mudar_papel: 'mudou o papel de',
  entrar_como: 'entrou no site como',
  acao_como_outra_conta: 'fez uma alteração como',
  excluir_conta: 'excluiu a conta de',
  aviso: 'mandou uma notificação para todos',
  cenario: 'mudou o cenário do site',
}

/* Ações mais delicadas ganham destaque */
const SERIAS = new Set(['excluir_conta', 'entrar_como', 'acao_como_outra_conta', 'conta_banida'])

const quando = (data: string) =>
  new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/* Aba do supremo: quem fez o quê e quando */
export default function RegistroAdmin() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    api<{ registro: Linha[] }>('/admin/registro')
      .then((d) => ativo && setLinhas(d.registro))
      .catch((e) => ativo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o registro.'))
    return () => {
      ativo = false
    }
  }, [])

  if (erro) return <EstadoErro mensagem={erro} />
  if (!linhas) return <Carregando variante="lista" />
  if (linhas.length === 0) {
    return <p className={`${styles.vazio} placa`}>Nenhuma ação registrada ainda. Tudo o que os admins fizerem aparece aqui.</p>
  }

  return (
    <ul className={`${styles.lista} cascata`}>
      {linhas.map((l) => (
        <li key={l.reg_id} className={`${styles.linha} ${SERIAS.has(l.reg_acao) ? styles.linhaSeria : ''}`}>
          <ScrollText size={18} strokeWidth={2.2} className={styles.iconeRegistro} />
          <div className={styles.info}>
            <strong>
              {l.usu_nome} {ACOES[l.reg_acao] ?? l.reg_acao} {l.alvo_nome ?? ''}
            </strong>
            {l.reg_detalhe && <span>{l.reg_detalhe}</span>}
          </div>
          <small className={styles.quando}>{quando(l.reg_data)}</small>
        </li>
      ))}
    </ul>
  )
}
