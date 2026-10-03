import { useCallback, useEffect, useState } from 'react'
import { MapPin, Phone, Mail, Pencil, KeyRound } from 'lucide-react'
import SeletorAvatar from '../components/avatar/seletoravatar'
import Avatar from '../components/avatar/avatar'
import GerenciarPortfolio from '../components/portfolio/gerenciarportfolio'
import PainelNivel from '../components/gamificacao/painelnivel'
import QuadroInsignias from '../components/gamificacao/insignias'
import ListaAvaliacoes from '../components/gamificacao/listaavaliacoes'
import PainelContratante, { type PerfilContratante } from '../components/gamificacao/painelcontratante'
import type { PerfilFreelancer } from '../components/gamificacao/tipos'
import secoes from '../components/gamificacao/gamificacao.module.css'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { mascararTelefone, somenteDigitos } from '../utils/mascaras'
import styles from './Perfil.module.css'

/* GET /usuarios/eu devolve o cadastro completo, só para o dono da conta. */
interface PerfilCompleto {
  usu_id: number
  usu_nome: string
  usu_email: string
  usu_cpf: string
  usu_tel: string
  usu_cid: string
  usu_est: string
  usu_desc: string | null
  usu_foto: string | null
  data_criacao: string
}

interface Tipo {
  tipo_id: number
  tipo_nome: string
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

/*
 * Mesma página para os dois papéis: os dados cadastrais e a edição são iguais.
 * Muda o que vem embaixo — o freelancer vê nível, insígnias, avaliações e
 * portfólio; o contratante, os números dos projetos, a reputação e quem já
 * contratou. Áreas de atuação só existem para o freelancer.
 */
export default function Perfil({ papel }: { papel: 'freelancer' | 'contratante' }) {
  const ehFreelancer = papel === 'freelancer'

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [gamificacao, setGamificacao] = useState<PerfilFreelancer | null>(null)
  const [painel, setPainel] = useState<PerfilContratante | null>(null)
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [areas, setAreas] = useState<Tipo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const toast = useToast()

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [campos, setCampos] = useState({
    usu_nome: '',
    usu_tel: '',
    usu_cid: '',
    usu_est: '',
    usu_desc: '',
  })
  /* A foto fica fora de "campos" porque é um data URI grande e pode ser
     removida (null), enquanto os demais campos são sempre texto. */
  const [foto, setFoto] = useState<string | null>(null)
  const [selecionadas, setSelecionadas] = useState<number[]>([])

  const [senhaAberta, setSenhaAberta] = useState(false)
  const [senha, setSenha] = useState({ nova: '', confirma: '' })
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const carregar = useCallback(async () => {
    try {
      if (ehFreelancer) {
        const [dadosPerfil, dadosAreas, dadosTipos, dadosGamificacao] = await Promise.all([
          api<PerfilCompleto>('/usuarios/eu'),
          api<{ areas: Tipo[] }>('/usuarios/eu/areas'),
          api<{ tipos: Tipo[] }>('/tipos-servico'),
          api<PerfilFreelancer>('/perfil/freelancer/eu'),
        ])

        setPerfil(dadosPerfil)
        setAreas(dadosAreas.areas)
        setTipos(dadosTipos.tipos)
        setGamificacao(dadosGamificacao)
      } else {
        const [dadosPerfil, dadosPainel] = await Promise.all([
          api<PerfilCompleto>('/usuarios/eu'),
          api<PerfilContratante>('/perfil/contratante/eu'),
        ])

        setPerfil(dadosPerfil)
        setPainel(dadosPainel)
      }
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }, [ehFreelancer])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  function abrirEdicao() {
    if (!perfil) return

    setCampos({
      usu_nome: perfil.usu_nome,
      usu_tel: perfil.usu_tel ?? '',
      usu_cid: perfil.usu_cid ?? '',
      usu_est: perfil.usu_est ?? '',
      usu_desc: perfil.usu_desc ?? '',
    })
    setFoto(perfil.usu_foto)
    setSelecionadas(areas.map((a) => a.tipo_id))
    setEditando(true)
    setErro('')
  }

  const alterar = (campo: keyof typeof campos, valor: string) =>
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))

  const alternarArea = (tipo_id: number) =>
    setSelecionadas((atuais) =>
      atuais.includes(tipo_id) ? atuais.filter((t) => t !== tipo_id) : [...atuais, tipo_id]
    )

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!perfil) return

    setErro('')
    setSalvando(true)

    try {
      /* Dados pessoais e áreas vivem em tabelas diferentes, então são duas
         requisições. A do perfil vem primeiro: se ela falhar, não faz sentido
         gravar as áreas. */
      await api(`/usuarios/${perfil.usu_id}`, {
        metodo: 'PUT',
        corpo: { ...campos, usu_foto: foto },
      })

      if (ehFreelancer) {
        await api('/usuarios/eu/areas', {
          metodo: 'PUT',
          corpo: { tipos: selecionadas },
        })
      }

      /* Recarregar também atualiza as insígnias: foto, descrição e áreas
         contam para "Perfil Completo". */
      await carregar()
      setEditando(false)
      toast.mostrar('Perfil atualizado!')
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível salvar o perfil.')
    } finally {
      setSalvando(false)
    }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!perfil) return

    setErro('')

    if (senha.nova.length < 6) {
      setErro('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (senha.nova !== senha.confirma) {
      setErro('As senhas não conferem.')
      return
    }

    setSalvandoSenha(true)

    try {
      await api(`/usuarios/${perfil.usu_id}`, {
        metodo: 'PUT',
        corpo: { usu_senha: senha.nova },
      })

      setSenha({ nova: '', confirma: '' })
      setSenhaAberta(false)
      toast.mostrar('Senha alterada!')
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  if (carregando) {
    return <Carregando variante="perfil" />
  }

  if (!perfil) {
    return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); setCarregando(true); carregar() }} />
  }

  const local = [perfil.usu_cid, perfil.usu_est].filter(Boolean).join(' - ')

  return (
    <div className={styles.pagina}>
      <h1>Meu perfil</h1>

      {erro && <p className="msg-erro">{erro}</p>}

      {!editando ? (
        <section className={styles.cartao}>
          <Avatar nome={perfil.usu_nome} size={96} foto={perfil.usu_foto} />

          <div className={styles.dados}>
            <strong className={styles.nome}>{perfil.usu_nome}</strong>

            <div className={styles.contatos}>
              {local && (
                <span><MapPin size={14} strokeWidth={2.2} />{local}</span>
              )}
              {perfil.usu_tel && (
                <span><Phone size={14} strokeWidth={2.2} />{mascararTelefone(perfil.usu_tel)}</span>
              )}
              <span><Mail size={14} strokeWidth={2.2} />{perfil.usu_email}</span>
            </div>

            <p className={styles.bio}>
              {perfil.usu_desc ||
                (ehFreelancer
                  ? 'Você ainda não escreveu uma descrição. Conte em que você é bom.'
                  : 'Você ainda não escreveu uma descrição. Conte sobre você ou sua empresa e o tipo de projeto que costuma contratar.')}
            </p>

            {ehFreelancer && (
              <div className={styles.areas}>
                {areas.length === 0 ? (
                  <span className={styles.semAreas}>Nenhuma área de atuação definida</span>
                ) : (
                  areas.map((a) => (
                    <span key={a.tipo_id} className={styles.area}>{a.tipo_nome}</span>
                  ))
                )}
              </div>
            )}
          </div>

          <div className={styles.botoes}>
            <button type="button" className={styles.editar} onClick={abrirEdicao}>
              <Pencil size={15} strokeWidth={2.2} />
              Editar perfil
            </button>
            <button
              type="button"
              className={styles.senhaBtn}
              onClick={() => setSenhaAberta((v) => !v)}
            >
              <KeyRound size={15} strokeWidth={2.2} />
              Alterar senha
            </button>
          </div>
        </section>
      ) : (
        <form className={styles.form} onSubmit={salvar}>
          <SeletorAvatar nome={campos.usu_nome || perfil.usu_nome} foto={foto} onMudar={setFoto} />

          <label>
            Nome completo
            <input
              type="text"
              value={campos.usu_nome}
              onChange={(e) => alterar('usu_nome', e.target.value)}
              maxLength={150}
              required
            />
          </label>

          <div className={styles.linha}>
            <label>
              Telefone
              <input
                type="tel"
                inputMode="numeric"
                value={mascararTelefone(campos.usu_tel)}
                onChange={(e) => alterar('usu_tel', somenteDigitos(e.target.value).slice(0, 11))}
                maxLength={15}
                placeholder="(00) 00000-0000"
              />
            </label>

            <label>
              Cidade
              <input
                type="text"
                value={campos.usu_cid}
                onChange={(e) => alterar('usu_cid', e.target.value)}
                maxLength={100}
              />
            </label>

            <label className={styles.uf}>
              Estado
              <select value={campos.usu_est} onChange={(e) => alterar('usu_est', e.target.value)}>
                <option value="">--</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Descrição
            <textarea
              value={campos.usu_desc}
              onChange={(e) => alterar('usu_desc', e.target.value)}
              rows={4}
              placeholder={
                ehFreelancer
                  ? 'Conte sua experiência, suas ferramentas e o tipo de trabalho que procura.'
                  : 'Conte sobre você ou sua empresa e o tipo de projeto que costuma contratar.'
              }
            />
          </label>

          {ehFreelancer && (
          <fieldset className={styles.fieldset}>
            <legend>Áreas de atuação</legend>
            <div className={styles.areas}>
              {tipos.map((t) => (
                <label
                  key={t.tipo_id}
                  className={`${styles.chip} ${selecionadas.includes(t.tipo_id) ? styles.chipAtivo : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selecionadas.includes(t.tipo_id)}
                    onChange={() => alternarArea(t.tipo_id)}
                  />
                  {t.tipo_nome}
                </label>
              ))}
            </div>
          </fieldset>
          )}

          {/* E-mail e CPF identificam a conta e têm restrição de unicidade no
              banco; alterá-los exigiria um fluxo de confirmação próprio. */}
          <p className={styles.fixos}>
            E-mail e CPF não podem ser alterados por aqui.
          </p>

          <div className={styles.formAcoes}>
            <button type="button" className={styles.cancelar} onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      )}

      {senhaAberta && (
        <form className={styles.form} onSubmit={trocarSenha}>
          <strong className={styles.tituloForm}>Alterar senha</strong>

          <div className={`${styles.linha} ${styles.linhaDupla}`}>
            <label>
              Nova senha
              <input
                type="password"
                value={senha.nova}
                onChange={(e) => setSenha((s) => ({ ...s, nova: e.target.value }))}
                minLength={6}
                required
              />
            </label>

            <label>
              Confirmar nova senha
              <input
                type="password"
                value={senha.confirma}
                onChange={(e) => setSenha((s) => ({ ...s, confirma: e.target.value }))}
                minLength={6}
                required
              />
            </label>
          </div>

          <div className={styles.formAcoes}>
            <button
              type="button"
              className={styles.cancelar}
              onClick={() => { setSenhaAberta(false); setSenha({ nova: '', confirma: '' }) }}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvandoSenha}>
              {salvandoSenha ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      )}

      {ehFreelancer && gamificacao && (
        <>
          <PainelNivel resumo={gamificacao.resumo} />

          <section className={secoes.secao}>
            <h2>Insígnias</h2>
            <QuadroInsignias insignias={gamificacao.insignias} />
          </section>

          <section className={secoes.secao}>
            <h2>Avaliações recebidas</h2>
            <ListaAvaliacoes
              avaliacoes={gamificacao.avaliacoes}
              vazio="Você ainda não recebeu avaliações. Elas chegam quando um contratante finaliza um projeto com você."
            />
          </section>
        </>
      )}

      {ehFreelancer && <GerenciarPortfolio />}

      {!ehFreelancer && painel && <PainelContratante dados={painel} />}
    </div>
  )
}
