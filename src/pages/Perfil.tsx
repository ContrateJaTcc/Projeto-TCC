import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Pencil, KeyRound, Share2, ExternalLink, Wand2, IdCard, Wallet, ChartColumn, Store, Map as IconeMapa, Shield, GraduationCap, Award, Heart, CalendarDays, PartyPopper, Gift, LifeBuoy, Swords, ReceiptText, TreePine, FileUser } from 'lucide-react'
import EditarDisponibilidade from '../components/perfil/disponibilidade'
import EditorHorarios from '../components/perfil/horarios'
import EditorAvatar from '../components/perfil/editoravatar'
import CartaoVisita from '../components/perfil/cartaovisita'
import IconeEvento from '../components/evento/iconeevento'
import { NomeColorido } from '../components/aparencia/aparencia'
import { useSituacaoEvento } from '../utils/eventoprogresso'
import type { CodigoEvento } from '../utils/eventos'
import type { Disponibilidade } from '../utils/aparencia'
import perfilCss from '../components/perfil/perfil.module.css'
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
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { mascararTelefone, somenteDigitos } from '../utils/mascaras'
import styles from './Perfil.module.css'
import CampoSenha from '../components/camposenha/camposenha'
import { ESTADOS, analisarTelefone, erroNome, erroSenha } from '../utils/validacao'
import { nomeOficial, useNomesCidades } from '../utils/cidades'
import { ChecklistVerificado } from '../components/confianca/selos'
import ConquistasSecretas from '../components/gamificacao/conquistassecretas'
import { compartilharPerfil, linkPerfilPublico } from '../utils/perfilpublico'

/* Perfil */
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
  /* Aparência (servidor novo) */
  moldura?: string | null
  cor_nome?: string | null
  disponibilidade?: Disponibilidade
}

interface Tipo {
  tipo_id: number
  tipo_nome: string
}



export default function Perfil({ papel }: { papel: 'freelancer' | 'contratante' }) {
  const ehFreelancer = papel === 'freelancer'

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [gamificacao, setGamificacao] = useState<PerfilFreelancer | null>(null)
  const [painel, setPainel] = useState<PerfilContratante | null>(null)
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [areas, setAreas] = useState<Tipo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [erroGamificacao, setErroGamificacao] = useState('')
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
  const nomesCidades = useNomesCidades(campos.usu_est)
  /* Foto */
  const [foto, setFoto] = useState<string | null>(null)
  const [selecionadas, setSelecionadas] = useState<number[]>([])

  const [senhaAberta, setSenhaAberta] = useState(false)
  const [montandoAvatar, setMontandoAvatar] = useState(false)
  const [cartaoAberto, setCartaoAberto] = useState(false)
  const situacaoEvento = useSituacaoEvento(true)
  const [senha, setSenha] = useState({ atual: '', nova: '', confirma: '' })
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  
const carregar = useCallback(async () => {
  setErro('')
  setErroGamificacao('')

  try {
    if (ehFreelancer) {
      // Perfil
      const [dadosPerfil, dadosAreas, dadosTipos] = await Promise.all([
        api<PerfilCompleto>('/usuarios/eu'),
        api<{ areas: Tipo[] }>('/usuarios/eu/areas'),
        api<{ tipos: Tipo[] }>('/tipos-servico'),
      ])

      setPerfil(dadosPerfil)
      setAreas(dadosAreas.areas)
      setTipos(dadosTipos.tipos)

      try {
        const dadosGamificacao =
          await api<PerfilFreelancer>('/perfil/freelancer/eu')

        setGamificacao(dadosGamificacao)
      } catch (e) {
        console.error('Erro ao carregar conquistas:', e)
        setGamificacao(null)
        setErroGamificacao(
          e instanceof ErroApi
            ? e.message
            : 'Não foi possível carregar suas conquistas.'
        )
      }
    } else {
      const [dadosPerfil, dadosPainel] = await Promise.all([
        api<PerfilCompleto>('/usuarios/eu'),
        api<PerfilContratante>('/perfil/contratante/eu'),
      ])

      setPerfil(dadosPerfil)
      setPainel(dadosPainel)
    }
  } catch (e) {
    setErro(
      e instanceof ErroApi
        ? e.message
        : 'Não foi possível conectar ao servidor.'
    )
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

    /* As mesmas regras do cadastro (o servidor confere de novo) */
    const cidade = campos.usu_cid.trim()
    const oficial = nomesCidades && cidade ? nomeOficial(nomesCidades, cidade) : null
    const problema =
      erroNome(campos.usu_nome, 'nome') ||
      analisarTelefone(campos.usu_tel).erro ||
      (!campos.usu_est ? 'Escolha o estado.' : '') ||
      (!cidade ? 'Informe a cidade.' : '') ||
      (cidade && nomesCidades && !oficial ? `Não achamos "${cidade}" em ${campos.usu_est}. Escolha uma cidade da lista.` : '')
    if (problema) {
      setErro(problema)
      return
    }

    setSalvando(true)

    try {
      await api(`/usuarios/${perfil.usu_id}`, {
        metodo: 'PUT',
        corpo: { ...campos, usu_nome: campos.usu_nome.trim(), usu_cid: oficial ?? cidade, usu_foto: foto },
      })

      if (ehFreelancer) {
        await api('/usuarios/eu/areas', {
          metodo: 'PUT',
          corpo: { tipos: selecionadas },
        })
      }

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

    if (erroSenha(senha.nova)) {
      setErro(erroSenha(senha.nova))
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
        corpo: { usu_senha: senha.nova, senha_atual: senha.atual },
      })

      setSenha({ atual: '', nova: '', confirma: '' })
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

  /* Link do perfil público: no celular abre o menu de compartilhar; no computador, copia */
  async function compartilhar() {
    if (!perfil) return
    const resultado = await compartilharPerfil(perfil.usu_id, perfil.usu_nome)
    if (resultado === 'copiado') toast.mostrar('Link do seu perfil público copiado!')
    else if (resultado === 'erro') toast.mostrar('Não deu para copiar o link.', 'erro')
  }

  return (
    <div className={styles.pagina}>
      <h1 className="placa">Meu perfil</h1>

      {erro && <p className="msg-erro">{erro}</p>}

      {!editando ? (
        <section className={styles.cartao}>
          <Avatar nome={perfil.usu_nome} size={96} foto={perfil.usu_foto} nivel={gamificacao?.resumo.nivel} especial={perfil.moldura} />

          <div className={styles.dados}>
            <strong className={styles.nome}><NomeColorido nome={perfil.usu_nome} cor={perfil.cor_nome} /></strong>

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
            {ehFreelancer && (
              <>
                <button type="button" className={styles.senhaBtn} onClick={compartilhar}>
                  <Share2 size={15} strokeWidth={2.2} />
                  Compartilhar perfil
                </button>
                <button type="button" className={styles.senhaBtn} onClick={() => setCartaoAberto(true)}>
                  <IdCard size={15} strokeWidth={2.2} />
                  Cartão de visita
                </button>
                <a
                  className={styles.linkPublico}
                  href={linkPerfilPublico(perfil.usu_id, perfil.usu_nome)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={13} strokeWidth={2.2} />
                  Ver como os outros veem
                </a>
              </>
            )}
          </div>
        </section>
      ) : (
        <form className={styles.form} onSubmit={salvar}>
          <SeletorAvatar nome={campos.usu_nome || perfil.usu_nome} foto={foto} onMudar={setFoto} />
          {montandoAvatar ? (
            <EditorAvatar aoFechar={() => setMontandoAvatar(false)} aoUsar={(f) => { setFoto(f); setMontandoAvatar(false) }} />
          ) : (
            <button type="button" className={styles.senhaBtn} onClick={() => setMontandoAvatar(true)}>
              <Wand2 size={15} strokeWidth={2.2} />
              Montar avatar em pixel
            </button>
          )}

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
                onBlur={() => {
                  const oficial = nomesCidades && nomeOficial(nomesCidades, campos.usu_cid)
                  if (oficial) alterar('usu_cid', oficial)
                }}
                list={nomesCidades ? 'perfil-lista-cidades' : undefined}
                placeholder={campos.usu_est ? 'Comece a digitar' : 'Escolha o estado'}
                autoComplete="address-level2"
                maxLength={100}
              />
              {nomesCidades && (
                <datalist id="perfil-lista-cidades">
                  {nomesCidades.map((n) => <option key={n} value={n} />)}
                </datalist>
              )}
            </label>

            <label className={styles.uf}>
              Estado
              <select value={campos.usu_est} onChange={(e) => alterar('usu_est', e.target.value)}>
                <option value="">--</option>
                {ESTADOS.map(([uf, nome]) => (
                  <option key={uf} value={uf} title={nome}>{uf}</option>
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

          {/* Campos fixos */}
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

          <label>
            Senha atual
            <CampoSenha
              autoComplete="current-password"
              required
              value={senha.atual}
              onChange={(e) => setSenha((s) => ({ ...s, atual: e.target.value }))}
            />
            <small>Entrou com o Google e nunca criou senha? Use <Link to="/esqueci-senha">Esqueci minha senha</Link>.</small>
          </label>

          <div className={`${styles.linha} ${styles.linhaDupla}`}>
            <label>
              Nova senha
              <CampoSenha
                value={senha.nova}
                onChange={(e) => setSenha((s) => ({ ...s, nova: e.target.value }))}
                minLength={6}
                required
              />
            </label>

            <label>
              Confirmar nova senha
              <CampoSenha
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
              onClick={() => { setSenhaAberta(false); setSenha({ atual: '', nova: '', confirma: '' }) }}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvandoSenha}>
              {salvandoSenha ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      )}

{ehFreelancer && erroGamificacao && (
  <section className={secoes.secao}>
    <h2>Conquistas</h2>
    <p className="msg-erro">{erroGamificacao}</p>
    <button
      type="button"
      className={styles.editar}
      onClick={async () => {
  setCarregando(true)
  await carregar()
}}
    >
      Tentar carregar conquistas novamente
    </button>
  </section>
)}

      {!editando && ehFreelancer && (
        <EditarDisponibilidade
          key={`${perfil.disponibilidade?.status}:${perfil.disponibilidade?.ate}`}
          atual={perfil.disponibilidade}
          aoMudar={(d) => setPerfil((p) => (p ? { ...p, disponibilidade: d } : p))}
        />
      )}

      {!editando && ehFreelancer && <EditorHorarios />}

      {!editando && (
        <nav className={perfilCss.atalhos} aria-label="Atalhos">
          <Link to={`/${papel}/carteira`} className={perfilCss.atalho} viewTransition>
            <Wallet size={22} strokeWidth={2.2} />
            <span><strong>Carteira</strong>Pagamentos com garantia (simulação)</span>
          </Link>
          {ehFreelancer && (
            <>
              <Link to="/freelancer/ganhos" className={perfilCss.atalho} viewTransition>
                <ChartColumn size={22} strokeWidth={2.2} />
                <span><strong>Meus ganhos</strong>Quanto você recebeu por mês</span>
              </Link>
              <Link to="/freelancer/loja" className={perfilCss.atalho} viewTransition>
                <Store size={22} strokeWidth={2.2} />
                <span><strong>Loja do castelo</strong>Molduras, cores e cenários com XP</span>
              </Link>
              <Link to="/freelancer/reino" className={perfilCss.atalho} viewTransition>
                <IconeMapa size={22} strokeWidth={2.2} />
                <span><strong>Mapa do reino</strong>Sua jornada por regiões e o mascote</span>
              </Link>
              <Link to="/freelancer/guildas" className={perfilCss.atalho} viewTransition>
                <Shield size={22} strokeWidth={2.2} />
                <span><strong>Guildas</strong>Times de até 6 freelancers</span>
              </Link>
              <Link to="/freelancer/testes" className={perfilCss.atalho} viewTransition>
                <GraduationCap size={22} strokeWidth={2.2} />
                <span><strong>Testes de habilidade</strong>Ganhe o selo da sua área</span>
              </Link>
              <Link to="/freelancer/insignias" className={perfilCss.atalho} viewTransition>
                <Award size={22} strokeWidth={2.2} />
                <span><strong>Álbum de insígnias</strong>Todas as insígnias e as mais raras</span>
              </Link>
            </>
          )}
          {!ehFreelancer && (
            <Link to="/contratante/freelancers?favoritos=1" className={perfilCss.atalho} viewTransition>
              <Heart size={22} strokeWidth={2.2} />
              <span><strong>Freelancers favoritos</strong>Quem você guardou para chamar de novo</span>
            </Link>
          )}
          <Link to={`/${papel}/agenda`} className={perfilCss.atalho} viewTransition>
            <CalendarDays size={22} strokeWidth={2.2} />
            <span><strong>Agenda</strong>Prazos, reuniões e etapas do mês</span>
          </Link>
          <Link to={`/${papel}/retrospectiva`} className={perfilCss.atalho} viewTransition>
            <PartyPopper size={22} strokeWidth={2.2} />
            <span><strong>Retrospectiva</strong>Seu ano no castelo e os marcos da conta</span>
          </Link>
          <Link to={`/${papel}/convidar`} className={perfilCss.atalho} viewTransition>
            <Gift size={22} strokeWidth={2.2} />
            <span><strong>Convide um amigo</strong>Os dois ganham XP no primeiro projeto</span>
          </Link>
          <Link to="/ajuda" className={perfilCss.atalho} viewTransition>
            <LifeBuoy size={22} strokeWidth={2.2} />
            <span><strong>Central de ajuda</strong>Dúvidas frequentes com busca</span>
          </Link>
          <Link to={`/${papel}/arena`} className={perfilCss.atalho} viewTransition>
            <Swords size={22} strokeWidth={2.2} />
            <span><strong>Arena</strong>Chefão do mês e desafio da semana</span>
          </Link>
          <Link to={`/${papel}/orcamentos`} className={perfilCss.atalho} viewTransition>
            <ReceiptText size={22} strokeWidth={2.2} />
            <span><strong>Orçamentos</strong>{ehFreelancer ? 'Contratantes perguntando seu preço' : 'Pergunte o preço a até 3 freelancers'}</span>
          </Link>
          {ehFreelancer && (
            <>
              <Link to="/freelancer/habilidades" className={perfilCss.atalho} viewTransition>
                <TreePine size={22} strokeWidth={2.2} />
                <span><strong>Árvore de habilidades</strong>Galhos que acendem por área</span>
              </Link>
              <Link to="/freelancer/curriculo" className={perfilCss.atalho} viewTransition>
                <FileUser size={22} strokeWidth={2.2} />
                <span><strong>Meu currículo</strong>Gerado sozinho, para baixar em PDF</span>
              </Link>
            </>
          )}
        </nav>
      )}

      {cartaoAberto && (
        <CartaoVisita
          usuId={perfil.usu_id}
          nome={perfil.usu_nome}
          foto={perfil.usu_foto}
          nivel={gamificacao?.resumo.nivel}
          nota={gamificacao?.resumo.totalAvaliacoes ? gamificacao.resumo.media : undefined}
          areas={areas.map((a) => a.tipo_nome)}
          aoFechar={() => setCartaoAberto(false)}
        />
      )}

      {ehFreelancer && gamificacao && (
        <>
          <PainelNivel resumo={gamificacao.resumo} />
          {gamificacao.verificacao && <ChecklistVerificado verificacao={gamificacao.verificacao} />}

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

      {situacaoEvento && situacaoEvento.insignias.length > 0 && (
        <section className={secoes.secao}>
          <h2>Insígnias de eventos</h2>
          <ul className={perfilCss.eventos}>
            {situacaoEvento.insignias.map((i) => (
              <li key={`${i.codigo}-${i.ano}`}>
                <IconeEvento codigo={i.codigo as CodigoEvento} tamanho={26} />
                <span><strong>{i.nome}</strong>{i.ano}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConquistasSecretas />
    </div>
  )
}
