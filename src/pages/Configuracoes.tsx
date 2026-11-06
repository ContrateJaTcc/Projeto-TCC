import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun, Clock, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, MapPin, Leaf, Compass, Palette, Bell, UserRound, ShieldCheck, Download, Volume2, LogOut, Trash2, Eye, Accessibility, Mail, Presentation, Navigation, Keyboard, Gift, Eraser, LifeBuoy } from 'lucide-react'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import { api, ErroApi } from '../services/api'
import PreviaFundo from '../components/fundo/previafundo'
import { useClimaEfetivo, estacaoDe, NOME_ESTACAO } from '../utils/climareal'
import { registrarClima } from '../utils/conquistas'
import { abrirTour } from '../utils/tour'
import { useCenarioGlobal } from '../utils/cenarioglobal'
import { emSilencio, lerPreferencias, movimentoLigado, salvarPreferencias, temaAtual, transicaoLigada, verSoFundo, type EscolhaClima, type EscolhaTema, type PaginaInicial, type Preferencias, type TamanhoFonte } from '../utils/preferencias'
import PainelSeguranca from '../components/configuracoes/seguranca'
import Chave from '../components/configuracoes/chave'
import AvisosPorTipo from '../components/configuracoes/avisos'
import OpcoesPrivacidade from '../components/configuracoes/privacidade'
import PainelCartas from '../components/configuracoes/cartas'
import ListaBloqueados from '../components/configuracoes/bloqueados'
import { demoAtivo } from '../services/demoflag'
import { abrirApresentacao } from '../utils/apresentacao'
import { tocarPlim } from '../utils/som'
import styles from './Configuracoes.module.css'
import CampoSenha from '../components/camposenha/camposenha'
import { erroSenha } from '../utils/validacao'
import { t, useIdioma } from '../utils/idioma'

interface Conta {
  usu_id: number
  usu_nome: string
  usu_email: string
  usu_resumo_email?: boolean
}

interface Resumo {
  nome: string
  itens: { titulo: string; detalhes: string[]; link: string }[]
}

const TAMANHOS: { valor: TamanhoFonte; rotulo: string }[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'grande', rotulo: 'Grande' },
  { valor: 'maior', rotulo: 'Maior' },
]

const TEMAS: { valor: EscolhaTema; rotulo: string; icone: typeof Sun }[] = [
  { valor: 'escuro', rotulo: 'Dark', icone: Moon },
  { valor: 'claro', rotulo: 'Light', icone: Sun },
  { valor: 'auto', rotulo: 'Auto', icone: Clock },
]

const CLIMAS: { valor: EscolhaClima; rotulo: string; icone: typeof Sun }[] = [
  { valor: 'limpo', rotulo: 'Limpo', icone: Cloud },
  { valor: 'chuva', rotulo: 'Chuva', icone: CloudRain },
  { valor: 'tempestade', rotulo: 'Tempestade', icone: CloudLightning },
  { valor: 'neve', rotulo: 'Neve', icone: Snowflake },
  { valor: 'neblina', rotulo: 'Neblina', icone: CloudFog },
  { valor: 'real', rotulo: 'Real', icone: MapPin },
  { valor: 'estacao', rotulo: 'Estação', icone: Leaf },
]

/* Palavra que confirma a exclusão */
const CONFIRMACAO = 'EXCLUIR'

const PAGINAS_INICIAIS: { valor: PaginaInicial; rotulo: string }[] = [
  { valor: 'painel', rotulo: 'Painel' },
  { valor: 'mensagens', rotulo: 'Mensagens' },
  { valor: 'historico', rotulo: 'Histórico' },
  { valor: 'agenda', rotulo: 'Agenda' },
]

const HORAS = Array.from({ length: 24 }, (_, h) => h)

/* Atalhos de teclado que o site tem */
const ATALHOS: [teclas: string, oQueFaz: string][] = [
  ['Ctrl + K', 'Busca rápida: abre qualquer página pelo nome'],
  ['Esc', 'Fecha a busca, as janelas e o "ver só o fundo"'],
  ['Tab / Shift + Tab', 'Anda pelos botões e campos da página'],
  ['Ctrl + Shift + A', 'Modo apresentação (no modo demonstração)'],
  ['← →', 'Passa os cartões da Retrospectiva'],
]

/* Seções da página, para o índice do topo */
const SECOES: [id: string, rotulo: string][] = [
  ['aparencia', 'Aparência'],
  ['acessibilidade', 'Acessibilidade'],
  ['notificacoes', 'Notificações'],
  ['navegacao', 'Navegação'],
  ['seguranca', 'Segurança'],
  ['conta', 'Conta'],
  ['privacidade', 'Privacidade'],
]

export default function Configuracoes() {
  const { role, sair } = useRole()
  useIdioma()
  const { mostrar } = useToast()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias)
  const cenario = useCenarioGlobal()
  /* O tema também muda pelo botão do cabeçalho */
  useEffect(() => {
    const aoMudar = (e: Event) => setPrefs((e as CustomEvent<Preferencias>).detail)
    window.addEventListener('preferencias', aoMudar)
    return () => window.removeEventListener('preferencias', aoMudar)
  }, [])
  const climaAgora = useClimaEfetivo(cenario.clima ?? prefs.clima)

  const [conta, setConta] = useState<Conta | null>(null)
  const [senha, setSenha] = useState({ atual: '', nova: '', confirma: '' })
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [previa, setPrevia] = useState<Resumo | null>(null)

  useEffect(() => {
    api<Conta>('/usuarios/eu')
      .then(setConta)
      .catch((e) => setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar sua conta.'))
  }, [])

  function mudar(mudanca: Partial<Preferencias>) {
    setPrefs(salvarPreferencias(mudanca))
  }

  async function marcarLidas() {
    try {
      await api('/notificacoes/lidas', { metodo: 'PUT' })
      mostrar('Todas as notificações foram marcadas como lidas.', 'sucesso')
    } catch (e) {
      mostrar(e instanceof ErroApi ? e.message : 'Não foi possível marcar as notificações.', 'erro')
    }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!conta) return
    if (erroSenha(senha.nova)) return setErro(erroSenha(senha.nova))
    if (senha.nova !== senha.confirma) return setErro('As senhas não conferem.')

    setErro('')
    setSalvandoSenha(true)
    try {
      await api(`/usuarios/${conta.usu_id}`, { metodo: 'PUT', corpo: { usu_senha: senha.nova, senha_atual: senha.atual } })
      setSenha({ atual: '', nova: '', confirma: '' })
      mostrar('Senha alterada!', 'sucesso')
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  async function mudarResumo(ativo: boolean) {
    try {
      const r = await api<{ mensagem: string }>('/usuarios/eu/resumo', { metodo: 'PUT', corpo: { ativo } })
      setConta((c) => (c ? { ...c, usu_resumo_email: ativo } : c))
      mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar.', 'erro')
    }
  }

  async function verPrevia() {
    try {
      setPrevia((await api<{ resumo: Resumo }>('/usuarios/eu/resumo-previa')).resumo)
    } catch (e) {
      mostrar(e instanceof ErroApi ? e.message : 'Não foi possível montar a prévia.', 'erro')
    }
  }

  /* Cópia de tudo o que a plataforma guarda sobre a conta (LGPD); servidor antigo: só o perfil e as áreas */
  async function baixarDados() {
    try {
      let dados: unknown
      try {
        dados = await api('/usuarios/eu/dados')
      } catch {
        const perfil = await api('/usuarios/eu')
        const areas = role === 'administrador' ? null : await api('/usuarios/eu/areas').catch(() => null)
        dados = { exportado_em: new Date().toISOString(), perfil, areas }
      }
      const arquivo = new Blob([JSON.stringify(dados, null, 2)], {
        type: 'application/json',
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(arquivo)
      link.download = 'meus-dados-contrateja.json'
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      mostrar(e instanceof ErroApi ? e.message : 'Não foi possível baixar seus dados.', 'erro')
    }
  }

  async function excluirConta() {
    if (!conta || confirmacao !== CONFIRMACAO) return
    try {
      await api(`/usuarios/${conta.usu_id}`, { metodo: 'DELETE' })
      sair()
      mostrar('Sua conta foi excluída.', 'info')
      navigate('/', { viewTransition: true })
    } catch (e) {
      mostrar(e instanceof ErroApi ? e.message : 'Não foi possível excluir a conta.', 'erro')
    }
  }

  function sairDaConta() {
    sair()
    navigate('/', { viewTransition: true })
  }

  /* Volta o site ao padrão neste navegador (a conta e o que está no servidor não mudam) */
  function limparNavegador() {
    try {
      for (const chave of Object.keys(localStorage)) {
        if (!['token', 'tipo', 'contrateja:role', 'demo'].includes(chave) && !chave.startsWith('supremo')) localStorage.removeItem(chave)
      }
      sessionStorage.clear()
    } catch {
      /* Sem armazenamento */
    }
    setPrefs(salvarPreferencias({}))
    mostrar('Preferências deste navegador voltaram ao padrão.', 'sucesso')
  }

  return (
    <div className={styles.pagina}>
      <h1 className="placa">{t('Configurações')}</h1>

      <nav className={styles.indice} aria-label="Seções das configurações">
        {[...SECOES, ...(role === 'freelancer' ? [['cartas', 'Cartas'] as [string, string]] : []), ['atalhos', 'Atalhos'] as [string, string]].map(([id, rotulo]) => (
          <a key={id} href={`#${id}`}>{t(rotulo)}</a>
        ))}
      </nav>

      {erro && <p className="msg-erro">{erro}</p>}

      <div className={`${styles.grade} cascata`}>
        <section className={styles.painel} id="aparencia">
          <h2><Palette size={18} strokeWidth={2.2} /> {t('Aparência')}</h2>

          <PreviaFundo tema={temaAtual(prefs)} clima={climaAgora} animar={movimentoLigado(prefs)} />
          {(cenario.tema || cenario.clima) && (
            <p className={styles.texto}>
              A administração definiu {cenario.tema ? (cenario.tema === 'claro' ? 'o pôr do sol' : 'a noite') : ''}
              {cenario.tema && cenario.clima ? ' e ' : ''}
              {cenario.clima ? `o clima (${cenario.clima})` : ''} para todo mundo agora. Suas escolhas abaixo voltam a valer quando ela liberar.
            </p>
          )}

          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>Tema</strong>
              <span>Noite de lua cheia, pôr do sol ou Auto, que segue a hora do dia (pôr do sol das 6h às 18h).</span>
            </div>
            <div className={styles.temas} role="group" aria-label="Tema">
              {TEMAS.map(({ valor, rotulo, icone: Icone }) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={prefs.tema === valor}
                  className={prefs.tema === valor ? styles.temaAtivo : ''}
                  onClick={() => mudar({ tema: valor })}
                >
                  <Icone size={16} strokeWidth={2.4} /> {rotulo}
                </button>
              ))}
            </div>
          </div>

          <Chave
            rotulo="Tela de transição"
            dica="Mostra a passagem pelo portal da floresta ao trocar de página e ao enviar algo. Ligada, aparece mesmo com as outras animações desligadas."
            ligada={transicaoLigada(prefs)}
            aoMudar={(v) => mudar({ transicao: v })}
          />
          <div className={`${styles.opcao} ${styles.opcaoColuna}`}>
            <div className={styles.opcaoTexto}>
              <strong>Clima</strong>
              <span>
                O tempo que faz sobre o castelo. Real segue o tempo de agora na cidade do seu perfil; Estação muda sozinho a cada
                poucas horas, com o tempo típico {estacaoDe(new Date()) === 'primavera' ? 'da' : 'do'} {NOME_ESTACAO[estacaoDe(new Date())]}.
              </span>
            </div>
            <div className={`${styles.temas} ${styles.climas}`} role="group" aria-label="Clima">
              {CLIMAS.map(({ valor, rotulo, icone: Icone }) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={prefs.clima === valor}
                  className={prefs.clima === valor ? styles.temaAtivo : ''}
                  onClick={() => {
                    mudar({ clima: valor })
                    registrarClima(valor)
                  }}
                >
                  <Icone size={16} strokeWidth={2.4} /> {rotulo}
                </button>
              ))}
            </div>
          </div>
          <Chave
            rotulo="Som do ambiente"
            dica="Vento, corvos e tochas no tempo limpo; chuva e trovões quando o clima muda. Tudo baixinho, começa no primeiro clique na página."
            ligada={prefs.somAmbiente}
            aoMudar={(v) => mudar({ somAmbiente: v })}
          />
          <Chave
            rotulo="Animações"
            dica={
              prefs.animacoes === null
                ? 'Seguindo o seu sistema. Ligue ou desligue aqui para escolher só para este site (estrelas, chuva, brilhos e efeitos).'
                : 'Desligue para deixar o site parado (estrelas, chuva, brilhos e efeitos).'
            }
            ligada={movimentoLigado(prefs)}
            aoMudar={(v) => mudar({ animacoes: v })}
          />
          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>Ver só o fundo</strong>
              <span>Esconde o site para admirar o cenário. Clique ou aperte Esc para voltar.</span>
            </div>
            <button type="button" className={styles.botao} onClick={verSoFundo}>
              <Eye size={16} strokeWidth={2.2} /> Ver fundo
            </button>
          </div>
          {role !== 'administrador' && (
            <div className={styles.opcao}>
              <div className={styles.opcaoTexto}>
                <strong>Tour de boas-vindas</strong>
                <span>Os balões que mostram o que é cada parte do site.</span>
              </div>
              <button type="button" className={styles.botao} onClick={abrirTour}>
                <Compass size={16} strokeWidth={2.2} /> Rever o tour
              </button>
            </div>
          )}
          {demoAtivo() && (
            <div className={styles.opcao}>
              <div className={styles.opcaoTexto}>
                <strong>Modo apresentação</strong>
                <span>Um roteiro que passa pelas telas principais, troca de freelancer para contratante sozinho e no fim restaura os dados. Atalho: Ctrl+Shift+A.</span>
              </div>
              <button type="button" className={styles.botao} onClick={abrirApresentacao}>
                <Presentation size={16} strokeWidth={2.2} /> Começar
              </button>
            </div>
          )}
        </section>

        <section className={styles.painel} id="acessibilidade">
          <h2><Accessibility size={18} strokeWidth={2.2} /> {t('Acessibilidade')}</h2>

          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>Tamanho da letra</strong>
              <span>Aumenta o texto do site inteiro.</span>
            </div>
            <div className={styles.temas} role="group" aria-label="Tamanho da letra">
              {TAMANHOS.map(({ valor, rotulo }) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={prefs.fonte === valor}
                  className={prefs.fonte === valor ? styles.temaAtivo : ''}
                  onClick={() => mudar({ fonte: valor })}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          <Chave
            rotulo="Alto contraste"
            dica="Fundo liso, texto e bordas bem fortes e o cenário mais apagado atrás."
            ligada={prefs.contraste}
            aoMudar={(v) => mudar({ contraste: v })}
          />
          <Chave
            rotulo="Fonte simples"
            dica="Troca as letras pixeladas por uma fonte comum, mais fácil de ler."
            ligada={prefs.fonteSimples}
            aoMudar={(v) => mudar({ fonteSimples: v })}
          />
          <Chave
            rotulo="Sublinhar os links"
            dica="Todo link fica sublinhado, sem depender só da cor para ser achado."
            ligada={prefs.sublinharLinks}
            aoMudar={(v) => mudar({ sublinharLinks: v })}
          />
          <Chave
            rotulo="Foco bem visível"
            dica="Contorno grosso em volta do botão ou campo que está com o foco ao usar o teclado (Tab)."
            ligada={prefs.focoForte}
            aoMudar={(v) => mudar({ focoForte: v })}
          />
        </section>

        <section className={styles.painel} id="notificacoes">
          <h2><Bell size={18} strokeWidth={2.2} /> {t('Notificações')}</h2>

          <Chave
            rotulo="Som de mensagem"
            dica="Toca um plim quando chega mensagem nova no chat."
            ligada={prefs.som}
            aoMudar={(v) => mudar({ som: v })}
          />
          <div className={styles.acoes}>
            <button type="button" className={styles.botao} onClick={tocarPlim} disabled={!prefs.som}>
              <Volume2 size={16} strokeWidth={2.2} /> Testar som
            </button>
            <button type="button" className={styles.botao} onClick={marcarLidas}>
              Marcar todas como lidas
            </button>
          </div>
          <Chave
            rotulo="Horário silencioso"
            dica={`Sem plim e sem som de ambiente no horário escolhido${prefs.silencio && emSilencio(prefs) ? ' (está valendo agora)' : ''}. Os avisos continuam chegando no sino.`}
            ligada={prefs.silencio}
            aoMudar={(v) => mudar({ silencio: v })}
          />
          {prefs.silencio && (
            <div className={styles.horario}>
              <label>
                Das
                <select value={prefs.silencioDe} onChange={(e) => mudar({ silencioDe: Number(e.target.value) })}>
                  {HORAS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
                </select>
              </label>
              <label>
                às
                <select value={prefs.silencioAte} onChange={(e) => mudar({ silencioAte: Number(e.target.value) })}>
                  {HORAS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
                </select>
              </label>
            </div>
          )}
          <AvisosPorTipo />
          {role !== 'administrador' && conta && conta.usu_resumo_email !== undefined && (
            <>
              <Chave
                rotulo="Resumo semanal por e-mail"
                dica="Toda segunda de manhã: projetos novos na sua área, candidaturas, avaliações pendentes e mensagens não lidas. Sem novidade, sem e-mail."
                ligada={conta.usu_resumo_email}
                aoMudar={mudarResumo}
              />
              <button type="button" className={styles.botao} onClick={verPrevia}>
                <Mail size={16} strokeWidth={2.2} /> Ver como fica o desta semana
              </button>
              {previa && (
                <div className={styles.previaEmail} aria-label="Prévia do resumo por e-mail">
                  <strong>Oi, {previa.nome}! Seu resumo da semana:</strong>
                  {previa.itens.length === 0 ? (
                    <p>Nada de novo nesta semana: nesse caso o e-mail nem sai.</p>
                  ) : (
                    <ul>
                      {previa.itens.map((i) => (
                        <li key={i.titulo}>
                          <Link to={i.link} viewTransition>{i.titulo}</Link>
                          {i.detalhes.length > 0 && <small>{i.detalhes.join(' · ')}</small>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section className={styles.painel} id="navegacao">
          <h2><Navigation size={18} strokeWidth={2.2} /> {t('Navegação')}</h2>
          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>{t('Idioma')}</strong>
              <span>{t('O texto dos menus, rodapés, login, cadastro e das seções das Configurações. O resto do site continua em português.')}</span>
            </div>
            <div className={styles.temas} role="group" aria-label="Idioma / Language">
              {([['pt', 'Português'], ['en', 'English']] as const).map(([valor, rotulo]) => (
                <button key={valor} type="button" lang={valor === 'en' ? 'en' : 'pt-BR'} aria-pressed={prefs.idioma === valor} className={prefs.idioma === valor ? styles.temaAtivo : ''} onClick={() => mudar({ idioma: valor })}>
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          {role !== 'administrador' && (
            <div className={`${styles.opcao} ${styles.opcaoColuna}`}>
              <div className={styles.opcaoTexto}>
                <strong>Página inicial</strong>
                <span>Para onde o site leva depois do login.</span>
              </div>
              <div className={`${styles.temas} ${styles.climas}`} role="group" aria-label="Página inicial">
                {PAGINAS_INICIAIS.map(({ valor, rotulo }) => (
                  <button key={valor} type="button" aria-pressed={prefs.paginaInicial === valor} className={prefs.paginaInicial === valor ? styles.temaAtivo : ''} onClick={() => mudar({ paginaInicial: valor })}>
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>Central de ajuda</strong>
              <span>Dúvidas frequentes com busca, cada uma levando para a página certa.</span>
            </div>
            <Link to="/ajuda" className={styles.botao} viewTransition>
              <LifeBuoy size={16} strokeWidth={2.2} /> Abrir
            </Link>
          </div>
          <div className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <strong>Limpar este navegador</strong>
              <span>Volta tema, clima, sons e as outras escolhas daqui ao padrão. Sua conta não muda.</span>
            </div>
            <button type="button" className={styles.botao} onClick={limparNavegador}>
              <Eraser size={16} strokeWidth={2.2} /> Limpar
            </button>
          </div>
        </section>

        <div id="seguranca" className={styles.ancora}>
          <PainelSeguranca />
        </div>

        <section className={styles.painel} id="conta">
          <h2><UserRound size={18} strokeWidth={2.2} /> {t('Conta')}</h2>

          <div className={styles.conta}>
            <strong>{conta?.usu_nome ?? '...'}</strong>
            <span>{conta?.usu_email}</span>
          </div>
          {role !== 'administrador' && (
            <>
              <Link to={`/${role}/perfil`} className={styles.link} viewTransition>Editar meu perfil</Link>
              <Link to={`/${role}/convidar`} className={styles.link} viewTransition>
                <Gift size={15} strokeWidth={2.2} aria-hidden="true" /> Convide um amigo (os dois ganham XP)
              </Link>
            </>
          )}

          <form className={styles.form} onSubmit={trocarSenha}>
            <strong>Alterar senha</strong>
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
            <label>
              Nova senha
              <CampoSenha
                autoComplete="new-password"
                minLength={6}
                required
                value={senha.nova}
                onChange={(e) => setSenha((s) => ({ ...s, nova: e.target.value }))}
              />
            </label>
            <label>
              Confirmar nova senha
              <CampoSenha
                autoComplete="new-password"
                minLength={6}
                required
                value={senha.confirma}
                onChange={(e) => setSenha((s) => ({ ...s, confirma: e.target.value }))}
              />
            </label>
            <button type="submit" className={styles.botaoOuro} disabled={salvandoSenha || !conta}>
              {salvandoSenha ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>

          <button type="button" className={styles.botao} onClick={sairDaConta}>
            <LogOut size={16} strokeWidth={2.2} /> Sair da conta
          </button>
        </section>

        <section className={styles.painel} id="privacidade">
          <h2><ShieldCheck size={18} strokeWidth={2.2} /> {t('Privacidade e dados')}</h2>

          <OpcoesPrivacidade papel={role} />
          {role !== 'administrador' && <ListaBloqueados />}
          <p className={styles.texto}>
            Seus dados são tratados conforme a LGPD. Veja os <Link to="/termos" viewTransition>Termos e condições</Link>.
          </p>
          <button type="button" className={styles.botao} onClick={baixarDados}>
            <Download size={16} strokeWidth={2.2} /> Baixar meus dados
          </button>

          <div className={styles.perigo}>
            <strong>Excluir conta</strong>
            <span>Apaga sua conta para sempre. Não dá para desfazer.</span>
            {!excluindo ? (
              <button type="button" className={styles.botaoPerigo} onClick={() => setExcluindo(true)}>
                <Trash2 size={16} strokeWidth={2.2} /> Quero excluir minha conta
              </button>
            ) : (
              <>
                <label>
                  Digite {CONFIRMACAO} para confirmar
                  <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value.toUpperCase())} />
                </label>
                <div className={styles.acoes}>
                  <button type="button" className={styles.botao} onClick={() => { setExcluindo(false); setConfirmacao('') }}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.botaoPerigo}
                    disabled={confirmacao !== CONFIRMACAO}
                    onClick={excluirConta}
                  >
                    Excluir para sempre
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {role === 'freelancer' && <PainelCartas />}

        <section className={styles.painel} id="atalhos">
          <h2><Keyboard size={18} strokeWidth={2.2} /> {t('Atalhos de teclado')}</h2>
          <dl className={styles.atalhos}>
            {ATALHOS.map(([teclas, texto]) => (
              <div key={teclas}>
                <dt><kbd>{teclas}</kbd></dt>
                <dd>{texto}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
