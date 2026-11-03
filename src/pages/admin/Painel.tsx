import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FolderOpen, Star, ShieldAlert, Search, Ban, PauseCircle, PlayCircle, XCircle, Crown, LogIn, Trash2, FileSpreadsheet } from 'lucide-react'
import { baixarCsv, dataCsv } from '../../utils/csv'
import Avatar from '../../components/avatar/avatar'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import { api, entrarComoOutraConta, ErroApi, type Papel } from '../../services/api'
import { useRole } from '../../context/useRole'
import PoderesSupremos from './PoderesSupremos'
import RegistroAdmin from './RegistroAdmin'
import DenunciasAdmin from './DenunciasAdmin'
import DisputasAdmin from './DisputasAdmin'
import ModeracaoAdmin from './ModeracaoAdmin'
import ErrosAdmin from './ErrosAdmin'
import FunilAdmin from './FunilAdmin'
import SaudeAdmin from './SaudeAdmin'
import MetricasAdmin from './MetricasAdmin'
import { useToast } from '../../context/useToast'
import { formatarData, formatarValorServico } from '../../utils/formatar'
import styles from './Painel.module.css'

/* Tipos */
interface Resumo {
  usuarios: Record<string, number>
  contas: Record<string, number>
  servicos: Record<string, number>
  candidaturas: Record<string, number>
  avaliacoes: number
}

interface UsuarioAdmin {
  usu_id: number
  usu_nome: string
  usu_email: string
  usu_cid: string
  usu_est: string
  usu_foto: string | null
  tipo_usuario: 'freelancer' | 'contratante' | 'administrador'
  status_conta: 'ativa' | 'suspensa' | 'banida' | 'pendente'
  data_criacao: string
  /* Só vem depois da migração do supremo */
  usu_supremo?: boolean | number
}

interface ServicoAdmin {
  serv_id: number
  serv_titulo: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_status: string
  serv_data_criacao: string
  categoria: string
  contratante_nome: string
}

type Aba = 'usuarios' | 'projetos' | 'denuncias' | 'disputas' | 'revisao' | 'erros' | 'funil' | 'saude' | 'supremo' | 'registro'
type Acao =
  | { tipo: 'conta'; id: number; status: string }
  | { tipo: 'projeto'; id: number }
  | { tipo: 'papel'; id: number; papel: Papel }
  | { tipo: 'excluir'; id: number }

const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: 'freelancer', rotulo: 'Freelancer' },
  { valor: 'contratante', rotulo: 'Contratante' },
  { valor: 'administrador', rotulo: 'Administrador' },
]

/* Chave da confirmação em dois cliques */
const chaveDe = (a: Acao) =>
  a.tipo === 'conta' ? `conta:${a.id}:${a.status}` : a.tipo === 'papel' ? `papel:${a.id}:${a.papel}` : `${a.tipo}:${a.id}`

const ROTULO_STATUS: Record<string, string> = {
  rascunho: 'Rascunho',
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  finalizado: 'Concluído',
  cancelado: 'Cancelado',
  ativa: 'Ativa',
  suspensa: 'Suspensa',
  banida: 'Banida',
  pendente: 'Pendente',
}

const soma = (obj: Record<string, number>) => Object.values(obj).reduce((a, b) => a + b, 0)

export default function PainelAdmin() {
  const toast = useToast()
  const { setRole } = useRole()
  const navigate = useNavigate()
  /* Quem está usando o painel: o supremo ganha a aba e as ações extras */
  const [eu, setEu] = useState<{ usu_id: number; usu_supremo?: boolean } | null>(null)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [servicos, setServicos] = useState<ServicoAdmin[]>([])
  const [aba, setAba] = useState<Aba>('usuarios')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  /* Confirmação em dois cliques */
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [emAcao, setEmAcao] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [r, u, s, e] = await Promise.all([
        api<Resumo>('/admin/resumo'),
        api<{ usuarios: UsuarioAdmin[] }>('/admin/usuarios'),
        api<{ servicos: ServicoAdmin[] }>('/admin/servicos'),
        api<{ usu_id: number; usu_supremo?: boolean }>('/usuarios/eu'),
      ])
      setEu(e)
      setResumo(r)
      setUsuarios(u.usuarios)
      setServicos(s.servicos)
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

  async function executar(acao: Acao, jaConfirmado = false) {
    const chave = chaveDe(acao)

    /* Pede confirmação */
    if (!jaConfirmado && confirmando !== chave) {
      setConfirmando(chave)
      return
    }

    setEmAcao(chave)

    try {
      const dados =
        acao.tipo === 'conta'
          ? await api<{ mensagem: string }>(`/admin/usuarios/${acao.id}/status`, {
              metodo: 'PUT',
              corpo: { status: acao.status },
            })
          : acao.tipo === 'papel'
            ? await api<{ mensagem: string }>(`/admin/usuarios/${acao.id}/papel`, { metodo: 'PUT', corpo: { tipo: acao.papel } })
            : acao.tipo === 'excluir'
              ? await api<{ mensagem: string }>(`/admin/usuarios/${acao.id}`, { metodo: 'DELETE' })
              : await api<{ mensagem: string }>(`/admin/servicos/${acao.id}/cancelar`, { metodo: 'PUT' })

      toast.mostrar(dados.mensagem)
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível concluir a ação.', 'erro')
    } finally {
      setEmAcao(null)
      setConfirmando(null)
    }
  }

  /* Supremo: abre o site na conta escolhida (a faixa no topo leva de volta) */
  async function entrarComo(u: UsuarioAdmin) {
    setEmAcao(`entrar:${u.usu_id}`)
    try {
      const dados = await api<{ token: string; tipo: Papel; mensagem: string }>(`/admin/usuarios/${u.usu_id}/entrar`, { metodo: 'POST' })
      const papel = entrarComoOutraConta(dados.token, dados.tipo, u.usu_nome)
      if (!papel) throw new Error()
      setRole(papel)
      toast.mostrar(dados.mensagem)
      navigate(`/${papel}`, { viewTransition: true })
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível entrar na conta.', 'erro')
      setEmAcao(null)
    }
  }

  if (carregando) return <Carregando variante="lista" />
  if (erro || !resumo) {
    return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setCarregando(true); carregar() }} />
  }

  const supremo = Boolean(eu?.usu_supremo)
  const termo = busca.trim().toLowerCase()
  const usuariosVisiveis = usuarios.filter(
    (u) => !termo || `${u.usu_nome} ${u.usu_email}`.toLowerCase().includes(termo)
  )
  const servicosVisiveis = servicos.filter(
    (s) => !termo || `${s.serv_titulo} ${s.contratante_nome}`.toLowerCase().includes(termo)
  )

  const numeros = [
    { icone: Users, valor: soma(resumo.usuarios), rotulo: 'Usuários', detalhe: `${resumo.usuarios.freelancer ?? 0} freelancers · ${resumo.usuarios.contratante ?? 0} contratantes` },
    { icone: FolderOpen, valor: soma(resumo.servicos), rotulo: 'Projetos', detalhe: `${resumo.servicos.aberto ?? 0} abertos · ${resumo.servicos.em_andamento ?? 0} em andamento` },
    { icone: Star, valor: resumo.avaliacoes, rotulo: 'Avaliações', detalhe: `${resumo.candidaturas.aceita ?? 0} contratações feitas` },
    { icone: ShieldAlert, valor: (resumo.contas.suspensa ?? 0) + (resumo.contas.banida ?? 0), rotulo: 'Contas bloqueadas', detalhe: `${resumo.contas.suspensa ?? 0} suspensas · ${resumo.contas.banida ?? 0} banidas` },
  ]

  const botaoConfirmavel = (chave: string, rotulo: string, icone: React.ReactNode, classe: string, acao: Acao) => (
    <button
      type="button"
      className={`${styles.acao} ${classe} ${confirmando === chave ? styles.confirmar : ''}`}
      onClick={() => executar(acao)}
      onBlur={() => setConfirmando((c) => (c === chave ? null : c))}
      disabled={emAcao === chave}
    >
      {emAcao === chave ? <span className="spinner" /> : icone}
      {confirmando === chave ? 'Confirmar?' : rotulo}
    </button>
  )

  return (
    <div className={styles.pagina}>
      <h1 className="titulo-magico esquerda placa">
        {supremo && <Crown className={styles.coroa} size={34} strokeWidth={2.4} aria-hidden />}
        {supremo ? 'Painel do administrador supremo' : 'Painel do administrador'}
      </h1>
      <p className={`${styles.subtitulo} placa`}>
        {supremo
          ? 'Você pode tudo: moderar e excluir contas (até de outros admins), mudar papéis, entrar como qualquer pessoa e controlar o cenário de todo mundo.'
          : 'Acompanhe a plataforma e modere contas e projetos que violem os Termos de Uso.'}
      </p>

      <div className={`${styles.numeros} cascata`}>
        {numeros.map(({ icone: Icone, valor, rotulo, detalhe }) => (
          <div key={rotulo} className={styles.numero}>
            <Icone size={20} strokeWidth={2.2} />
            <strong>{valor}</strong>
            <span>{rotulo}</span>
            <small>{detalhe}</small>
          </div>
        ))}
      </div>

      <MetricasAdmin />

      <div className={styles.barra}>
        <div className={styles.abas} role="tablist">
          {(supremo ? (['usuarios', 'projetos', 'denuncias', 'disputas', 'revisao', 'erros', 'funil', 'saude', 'supremo', 'registro'] as Aba[]) : (['usuarios', 'projetos', 'denuncias', 'disputas', 'revisao', 'erros', 'funil', 'saude'] as Aba[])).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              className={aba === a ? styles.abaAtiva : ''}
              onClick={() => setAba(a)}
            >
              {a === 'usuarios' ? `Usuários (${usuarios.length})` : a === 'projetos' ? `Projetos (${servicos.length})` : a === 'denuncias' ? 'Denúncias' : a === 'disputas' ? 'Disputas' : a === 'revisao' ? 'Revisão de projetos' : a === 'erros' ? 'Erros' : a === 'funil' ? 'Funil' : a === 'saude' ? 'Saúde do servidor' : a === 'supremo' ? 'Poderes supremos' : 'Registro'}
            </button>
          ))}
        </div>

        {(aba === 'usuarios' || aba === 'projetos') && (
        <div className={styles.ferramentas}>
        <label className={styles.busca}>
          <Search size={16} strokeWidth={2.2} />
          <input
            type="search"
            placeholder={aba === 'usuarios' ? 'Nome ou e-mail' : 'Título ou contratante'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar"
          />
        </label>
        <button
          type="button"
          className={styles.planilha}
          onClick={() =>
            aba === 'usuarios'
              ? baixarCsv(
                  'usuarios-contrateja',
                  ['ID', 'Nome', 'E-mail', 'Papel', 'Situação', 'Cidade', 'Estado', 'Desde'],
                  usuariosVisiveis.map((u) => [u.usu_id, u.usu_nome, u.usu_email, ROTULO_STATUS[u.tipo_usuario] ?? u.tipo_usuario, ROTULO_STATUS[u.status_conta] ?? u.status_conta, u.usu_cid, u.usu_est, dataCsv(u.data_criacao)])
                )
              : baixarCsv(
                  'projetos-contrateja',
                  ['ID', 'Título', 'Categoria', 'Contratante', 'Valor', 'Cobrança', 'Situação', 'Publicado em'],
                  servicosVisiveis.map((s) => [s.serv_id, s.serv_titulo, s.categoria, s.contratante_nome, Number(s.serv_valor), s.serv_tipo_valor === 'hora' ? 'por hora' : 'fixo', ROTULO_STATUS[s.serv_status] ?? s.serv_status, dataCsv(s.serv_data_criacao)])
                )
          }
          title="Baixar a lista (com o filtro da busca) para abrir no Excel"
        >
          <FileSpreadsheet size={16} strokeWidth={2.2} /> Baixar planilha
        </button>
        </div>
        )}
      </div>

      {aba === 'supremo' ? (
        <PoderesSupremos />
      ) : aba === 'registro' ? (
        <RegistroAdmin />
      ) : aba === 'denuncias' ? (
        <DenunciasAdmin aoAgir={carregar} />
      ) : aba === 'disputas' ? (
        <DisputasAdmin aoAgir={carregar} />
      ) : aba === 'revisao' ? (
        <ModeracaoAdmin aoAgir={carregar} />
      ) : aba === 'erros' ? (
        <ErrosAdmin />
      ) : aba === 'funil' ? (
        <FunilAdmin />
      ) : aba === 'saude' ? (
        <SaudeAdmin />
      ) : aba === 'usuarios' ? (
        <ul key="usuarios" className={`${styles.lista} cascata`}>
          {usuariosVisiveis.map((u) => {
            const admin = u.tipo_usuario === 'administrador'
            const outroSupremo = Boolean(u.usu_supremo)
            /* Admin comum só modera quem não é admin; o supremo modera todos, menos a si mesmo e outro supremo */
            const podeModerar = supremo ? !outroSupremo && u.usu_id !== eu?.usu_id : !admin

            return (
              <li key={u.usu_id} className={styles.linha}>
                <Avatar nome={u.usu_nome} size={42} foto={u.usu_foto} />
                <div className={styles.info}>
                  <strong>
                    {u.usu_nome} {outroSupremo && <Crown className={styles.coroaPequena} size={14} strokeWidth={2.4} aria-label="supremo" />}
                  </strong>
                  <span>{u.usu_email}</span>
                  <small>
                    {ROTULO_STATUS[u.tipo_usuario] ?? u.tipo_usuario} · desde {formatarData(u.data_criacao)}
                  </small>
                </div>
                <span className={`${styles.etiqueta} ${styles[u.status_conta] ?? ''}`}>
                  {ROTULO_STATUS[u.status_conta] ?? u.status_conta}
                </span>
                {podeModerar && (
                  <div className={styles.acoes}>
                    {supremo && (
                      <>
                        <button type="button" className={`${styles.acao} ${styles.entrar}`} disabled={emAcao === `entrar:${u.usu_id}`} onClick={() => entrarComo(u)}>
                          {emAcao === `entrar:${u.usu_id}` ? <span className="spinner" /> : <LogIn size={15} />} Entrar como
                        </button>
                        <select
                          className={styles.acao}
                          value={u.tipo_usuario}
                          aria-label={`Papel de ${u.usu_nome}`}
                          onChange={(e) => {
                            const papel = e.target.value as Papel
                            const acao: Acao = { tipo: 'papel', id: u.usu_id, papel }
                            /* Trocar de papel é sério: confirma pelo navegador antes */
                            if (window.confirm(`Mudar ${u.usu_nome} para ${papel}?`)) {
                              void executar(acao, true)
                            }
                          }}
                        >
                          {PAPEIS.map((p) => (
                            <option key={p.valor} value={p.valor}>{p.rotulo}</option>
                          ))}
                        </select>
                      </>
                    )}
                    {u.status_conta !== 'ativa' &&
                      botaoConfirmavel(`conta:${u.usu_id}:ativa`, 'Reativar', <PlayCircle size={15} />, styles.reativar, { tipo: 'conta', id: u.usu_id, status: 'ativa' })}
                    {u.status_conta === 'ativa' &&
                      botaoConfirmavel(`conta:${u.usu_id}:suspensa`, 'Suspender', <PauseCircle size={15} />, styles.suspender, { tipo: 'conta', id: u.usu_id, status: 'suspensa' })}
                    {u.status_conta !== 'banida' &&
                      botaoConfirmavel(`conta:${u.usu_id}:banida`, 'Banir', <Ban size={15} />, styles.banir, { tipo: 'conta', id: u.usu_id, status: 'banida' })}
                    {supremo &&
                      botaoConfirmavel(`excluir:${u.usu_id}`, 'Excluir', <Trash2 size={15} />, styles.banir, { tipo: 'excluir', id: u.usu_id })}
                  </div>
                )}
              </li>
            )
          })}
          {usuariosVisiveis.length === 0 && <p className={styles.vazio}>Nenhum usuário encontrado.</p>}
        </ul>
      ) : (
        <ul key="projetos" className={`${styles.lista} cascata`}>
          {servicosVisiveis.map((s) => {
            const encerrado = s.serv_status === 'finalizado' || s.serv_status === 'cancelado'

            return (
              <li key={s.serv_id} className={styles.linha}>
                <div className={styles.info}>
                  <small className={styles.categoria}>{s.categoria}</small>
                  <strong>{s.serv_titulo}</strong>
                  <span>
                    por {s.contratante_nome} · {formatarValorServico(s.serv_valor, s.serv_tipo_valor)} · {formatarData(s.serv_data_criacao)}
                  </span>
                </div>
                <span className={`${styles.etiqueta} ${styles[s.serv_status] ?? ''}`}>
                  {ROTULO_STATUS[s.serv_status] ?? s.serv_status}
                </span>
                {!encerrado && (
                  <div className={styles.acoes}>
                    {botaoConfirmavel(`projeto:${s.serv_id}`, 'Cancelar projeto', <XCircle size={15} />, styles.banir, { tipo: 'projeto', id: s.serv_id })}
                  </div>
                )}
              </li>
            )
          })}
          {servicosVisiveis.length === 0 && <p className={styles.vazio}>Nenhum projeto encontrado.</p>}
        </ul>
      )}
    </div>
  )
}
