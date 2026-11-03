import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Star, BadgeCheck, CalendarDays, Bookmark, Hourglass, History } from 'lucide-react'
import { useSalvos, prazoCandidaturas } from '../utils/salvos'
import { useToast } from '../context/useToast'
import { useRole } from '../context/useRole'
import Avatar from '../components/avatar/avatar'
import Carregando from '../components/carregando/carregando'
import { api, ErroApi } from '../services/api'
import RecadoCandidatura from '../components/candidatura/recado'
import styles from './ProjetoDetalhe.module.css'
import Denunciar from '../components/denuncia/denunciar'
import Brasao from '../components/reino/brasao'
import type { GuildaResumo } from '../utils/aparencia'
import { useCidades } from '../utils/cidades'

const Mapa = lazy(() => import('../components/mapa/mapa'))

/* Mapinha da cidade do projeto presencial ou híbrido (some se a cidade não for reconhecida) */
function MapaDaCidade({ cidade, estado }: { cidade: string; estado: string }) {
  const { achar } = useCidades()
  const ponto = achar?.(cidade, estado)
  if (!ponto) return null
  return (
    <div className={styles.mapaCidade}>
      <Suspense fallback={null}>
        <Mapa pontos={[{ chave: 'cidade', ponto, quantidade: 0, rotulo: `${cidade}/${estado}` }]} altura={200} descricao={`Mapa de ${cidade}/${estado}, a cidade do projeto`} />
      </Suspense>
    </div>
  )
}

interface Projeto {
  id: string
  titulo: string
  descricao: string
  categoria: string
  orcamento: string
  prazo: string
  /* Para a contraproposta */
  valorNumero: number
  tipoValor: 'hora' | 'fixo'
  prazoDias: number | null
  candidaturasAte: string | null
  modalidade: string
  cidade: string
  estado: string
  habilidades: string
  vagas: number
  formaPagamento: string
  postadoEm: string
  autor: {
    nome: string
    bio: string
    membroDesde: string
    numeroVerificado: boolean
    pagamentoVerificado: boolean
    servicosPostados: number
    nota: number
    totalAvaliacoes: number
    /* Do histórico do contratante: paga em dia, aprova rápido, avalia sempre */
    reputacao: ReputacaoContratante | null
  }
  /* O que mudou no anúncio depois da sua candidatura */
  mudancas: { campo: string; antes: string; depois: string; data: string }[]
}

interface ReputacaoContratante {
  projetos_concluidos: number
  pagamento_em_dia: number | null
  dias_para_aprovar: number | null
  avalia: number | null
  selos: { codigo: string; texto: string }[]
}

interface Servico {
  serv_id: number
  serv_titulo: string
  serv_desc: string
  categoria: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias: number | null
  serv_local: 'remoto' | 'hibrido' | 'presencial'
  serv_cidade: string | null
  serv_estado: string | null
  serv_habilidades: string | null
  serv_forma_pagamento: string | null
  serv_vagas: number | null
  serv_data_criacao: string
  serv_candidaturas_ate?: string | null
  contratante_nome: string
  contratante_desc: string | null
  contratante_foto: string | null
  contratante_data_criacao: string
  contratante_servicos_postados: number
  contratante_nota: number | null
  contratante_total_avaliacoes: number
  contratante_reputacao?: ReputacaoContratante | null
  mudancas?: { campo: string; antes: string; depois: string; data: string }[]
}

interface OutroProjeto {
  serv_id: number
  serv_titulo: string
  serv_desc: string
  categoria: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias: number | null
  serv_data_criacao: string
  contratante_nome?: string
}

function formatarData(data: string) {
  if (!data) return ''

  return new Date(data).toLocaleDateString('pt-BR')
}

function resumoNota(nota: number, total: number) {
  if (!total) return 'Ainda sem avaliações'
  return `${nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${total} ${total === 1 ? 'avaliação' : 'avaliações'}`
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const { role } = useRole()

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [outrosProjetos, setOutrosProjetos] = useState<OutroProjeto[]>([])
  const [parecidos, setParecidos] = useState<OutroProjeto[]>([])
  const toast = useToast()
  const { ids: salvos, alternar: alternarSalvo } = useSalvos(role === 'freelancer', (m) => toast.mostrar(m, 'erro'))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [statusCandidatura, setStatusCandidatura] = useState<string | null>(null)
  const [processandoCandidatura, setProcessandoCandidatura] = useState(false)
  const [mensagemCandidatura, setMensagemCandidatura] = useState('')

  /* Contraproposta (opcional): outro valor e/ou prazo, com um recado */
  const [propondo, setPropondo] = useState(false)
  const [valorProposto, setValorProposto] = useState('')
  const [prazoProposto, setPrazoProposto] = useState('')
  const [recado, setRecado] = useState('')
  const [minhaProposta, setMinhaProposta] = useState<{ valor: number | null; prazo: number | null } | null>(null)
  /* Freelancer numa guilda pode se candidatar com o time */
  const [minhaGuilda, setMinhaGuilda] = useState<GuildaResumo | null>(null)
  const [comGuilda, setComGuilda] = useState(false)
  /* Confirmação */
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  const base = role === 'contratante' ? '/contratante' : '/freelancer'

  useEffect(() => {
    async function carregarProjeto() {
      try {
        setCarregando(true)
        setErro('')

        const dados = await api<{ projeto: Servico }>(`/servicos/${id}`)
        const servico = dados.projeto

        const projetoFormatado: Projeto = {
          id: String(servico.serv_id),
          titulo: servico.serv_titulo,
          descricao: servico.serv_desc,
          categoria: servico.categoria,

          orcamento:
            servico.serv_tipo_valor === 'hora'
              ? `${formatarMoeda(servico.serv_valor)}/hora`
              : formatarMoeda(servico.serv_valor),

          prazo: servico.serv_qtd_dias
            ? `${servico.serv_qtd_dias} dias`
            : 'Não informado',

          valorNumero: Number(servico.serv_valor),
          tipoValor: servico.serv_tipo_valor,
          prazoDias: servico.serv_qtd_dias,
          candidaturasAte: servico.serv_candidaturas_ate ?? null,

          modalidade:
            servico.serv_local === 'remoto'
              ? 'Remoto'
              : servico.serv_local === 'hibrido'
                ? 'Híbrido'
                : 'Presencial',

          cidade: servico.serv_cidade || '',
          estado: servico.serv_estado || '',
          habilidades: servico.serv_habilidades || '',
          vagas: servico.serv_vagas || 1,
          formaPagamento: servico.serv_forma_pagamento || '',

          postadoEm: formatarData(servico.serv_data_criacao),

          autor: {
            nome: servico.contratante_nome || 'Contratante',
            bio: servico.contratante_desc || 'Contratante',
            membroDesde: formatarData(servico.contratante_data_criacao),
            numeroVerificado: false,
            pagamentoVerificado: false,
            servicosPostados:
              servico.contratante_servicos_postados || 0,
            nota: Number(servico.contratante_nota ?? 0),
            totalAvaliacoes: Number(servico.contratante_total_avaliacoes ?? 0),
            reputacao: servico.contratante_reputacao ?? null,
          },
          mudancas: servico.mudancas ?? [],
        }

        setProjeto(projetoFormatado)

        // Status
        if (role === 'freelancer') {
          const dadosCandidaturas = await api<{
            candidaturas: { serv_id: number; cand_status: string; cand_valor_proposto?: number | string | null; cand_prazo_proposto?: number | null }[]
          }>(
            '/candidaturas/minhas'
          ).catch(() => null)

          if (dadosCandidaturas) {
            const candidaturaAtual = dadosCandidaturas.candidaturas.find(
              (candidatura) => String(candidatura.serv_id) === String(id)
            )

            // Cancelada
            setStatusCandidatura(
              candidaturaAtual?.cand_status === 'cancelada'
                ? null
                : candidaturaAtual?.cand_status ?? null
            )

            const valor = candidaturaAtual?.cand_valor_proposto != null ? Number(candidaturaAtual.cand_valor_proposto) : null
            const prazo = candidaturaAtual?.cand_prazo_proposto ?? null
            setMinhaProposta(valor !== null || prazo !== null ? { valor, prazo } : null)
          }

          const eu = await api<{ guilda?: GuildaResumo | null }>('/usuarios/eu', { silencioso: true }).catch(() => null)
          setMinhaGuilda(eu?.guilda ?? null)
        }

        const dadosOutros = await api<{ projetos: OutroProjeto[] }>(`/servicos/${id}/outros`).catch(() => null)
        setOutrosProjetos(dadosOutros?.projetos ?? [])

        /* Mesma categoria, de outros contratantes */
        const dadosParecidos = await api<{ projetos: OutroProjeto[] }>(`/servicos/${id}/parecidos`, { silencioso: true }).catch(() => null)
        setParecidos(dadosParecidos?.projetos ?? [])
      } catch (erro) {
        console.error('erro ao carregar o projeto:', erro)
        setErro(erro instanceof ErroApi ? erro.message : 'Não foi possível carregar o projeto.')
      } finally {
        setCarregando(false)
      }
    }

    if (id) {
      carregarProjeto()
    }
  }, [id, role])

  async function candidatarSe() {
    if (!id || processandoCandidatura) return

    setProcessandoCandidatura(true)
    setMensagemCandidatura('')

    try {
      const proposta = {
        ...(propondo ? { valor_proposto: valorProposto.replace(',', '.'), prazo_proposto: prazoProposto } : {}),
        ...(recado.trim() ? { mensagem: recado.trim() } : {}),
        ...(minhaGuilda && comGuilda ? { com_guilda: true } : {}),
      }
      const dados = await api<{ mensagem: string }>(`/servicos/${id}/candidaturas`, { metodo: 'POST', corpo: proposta })
      setStatusCandidatura('pendente')
      setMinhaProposta(
        propondo && (valorProposto || prazoProposto)
          ? { valor: valorProposto ? Number(valorProposto.replace(',', '.')) : null, prazo: prazoProposto ? Number(prazoProposto) : null }
          : null
      )
      setPropondo(false)
      setMensagemCandidatura(dados.mensagem || 'Candidatura enviada com sucesso!')
    } catch (erro) {
      setMensagemCandidatura(
        erro instanceof Error ? erro.message : 'Erro ao enviar candidatura.'
      )
    } finally {
      setProcessandoCandidatura(false)
    }
  }

  async function cancelarCandidatura() {
    if (!id || processandoCandidatura) return

    /* Segundo clique confirma */
    if (!confirmandoCancelar) {
      setConfirmandoCancelar(true)
      return
    }

    setConfirmandoCancelar(false)
    setProcessandoCandidatura(true)
    setMensagemCandidatura('')

    try {
      const dados = await api<{ mensagem: string }>(`/servicos/${id}/candidaturas`, { metodo: 'DELETE' })

      setStatusCandidatura('cancelada')
      setMensagemCandidatura(dados.mensagem || 'Candidatura cancelada.')
    } catch (erro) {
      setMensagemCandidatura(
        erro instanceof Error ? erro.message : 'Erro ao cancelar candidatura.'
      )
    } finally {
      setProcessandoCandidatura(false)
    }
  }

  if (carregando) {
    return <Carregando variante="detalhe" />
  }

  if (erro || !projeto) {
    return (
      <div className={styles.pagina}>
        <p>{erro || 'Projeto não encontrado.'}</p>

        <Link
          to={base}
          className={styles.voltar}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} strokeWidth={2.2} />
        </Link>
      </div>
    )
  }

  const inscricoes = prazoCandidaturas(projeto.candidaturasAte)

  return (
    <div className={styles.pagina}>
      <div className={styles.principal}>
        <Link
          to={base}
          className={styles.voltar}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} strokeWidth={2.2} />
        </Link>

        <header className={styles.capa}>
          <div className={styles.cabecalho}>
            <span className={styles.categoriaCapa}>{projeto.categoria}</span>
            <span className={styles.metaDireita}>
              <span className={styles.meta}>
                <CalendarDays size={14} strokeWidth={2.2} />
                Postado em {projeto.postadoEm}
              </span>
              {salvos && (
                <button
                  type="button"
                  className={`${styles.salvar} ${salvos.has(projeto.id) ? styles.salvo : ''}`}
                  onClick={() => alternarSalvo(projeto.id)}
                  aria-pressed={salvos.has(projeto.id)}
                >
                  <Bookmark size={15} strokeWidth={2.2} fill={salvos.has(projeto.id) ? 'currentColor' : 'none'} />
                  {salvos.has(projeto.id) ? 'Salvo' : 'Salvar'}
                </button>
              )}
            </span>
          </div>
          <h1 className={styles.titulo}>{projeto.titulo}</h1>
          <p className={styles.descricao}>{projeto.descricao}</p>
          {projeto.mudancas.length > 0 && (
            <div className={styles.mudancas} role="note">
              <strong><History size={15} strokeWidth={2.4} aria-hidden="true" /> {role === 'freelancer' ? 'Mudou depois da sua candidatura' : 'Histórico do anúncio'}</strong>
              <ul>
                {projeto.mudancas.map((m, i) => (
                  <li key={i}>
                    {m.campo}: <s>{m.antes}</s> → <b>{m.depois}</b> <span>({formatarData(m.data)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {inscricoes && (
            <span className={`${styles.inscricoes} ${inscricoes.urgente ? styles.inscricoesUrgente : ''}`}>
              <Hourglass size={14} strokeWidth={2.2} />
              {inscricoes.texto}
            </span>
          )}
        </header>

        <div className={styles.info}>
          <div>
            <strong>Categoria</strong>
            <span>{projeto.categoria}</span>
          </div>

          <div>
            <strong>Prazo</strong>
            <span>{projeto.prazo}</span>
          </div>

          <div>
            <strong>Profissionais</strong>
            <span>{projeto.vagas}</span>
          </div>

          <div>
            <strong>Modalidade</strong>
            <span>{projeto.modalidade}</span>
          </div>

          {(projeto.cidade || projeto.estado) && (
            <div className={styles.localizacao}>
              <strong>Localização</strong>

              <span>
                {projeto.cidade && projeto.estado
                  ? `${projeto.cidade} - ${projeto.estado}`
                  : projeto.cidade || projeto.estado}
              </span>
            </div>
          )}
        </div>

        {projeto.modalidade !== 'Remoto' && projeto.cidade && projeto.estado && <MapaDaCidade cidade={projeto.cidade} estado={projeto.estado} />}

        <div className={styles.habilidades}>
          <strong>Habilidades necessárias</strong>

          {projeto.habilidades ? (
            <div className={styles.etiquetas}>
              {projeto.habilidades.split(/[,;]/).map((h) => h.trim()).filter(Boolean).map((h) => <span key={h}>{h}</span>)}
            </div>
          ) : (
            <span>Nenhuma informada</span>
          )}
        </div>
        {parecidos.length > 0 && (
          <section className={styles.parecidos} aria-labelledby="titulo-parecidos">
            <h2 id="titulo-parecidos" className={styles.parecidosTitulo}>Projetos parecidos</h2>
            <div className={styles.parecidosLista}>
              {parecidos.map((p) => (
                <Link key={p.serv_id} to={`${base}/projetos/${p.serv_id}`} className={styles.outroCard}>
                  <span className={styles.outroCategoria}>{p.categoria}</span>
                  <h3>{p.serv_titulo}</h3>
                  <p>{p.serv_desc}</p>
                  <strong>
                    {p.serv_tipo_valor === 'hora' ? `${formatarMoeda(p.serv_valor)}/hora` : formatarMoeda(p.serv_valor)}
                  </strong>
                  <span>{p.contratante_nome ? `por ${p.contratante_nome}` : p.serv_qtd_dias ? `${p.serv_qtd_dias} dias` : ''}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside>
        <div className={styles.autorCard}>
          <div className={styles.autorTopo}>
            <Avatar
              nome={projeto.autor.nome}
              size={58}
            />

            <div>
              <div className={styles.autorNome}>
                {projeto.autor.nome}
              </div>

              <div className={styles.autorNota}>
                <Star
                  size={13}
                  strokeWidth={2.2}
                  fill="currentColor"
                />

                {resumoNota(projeto.autor.nota, projeto.autor.totalAvaliacoes)}
              </div>
            </div>
          </div>

          <p className={styles.autorBio}>
            {projeto.autor.bio}
          </p>

          <div className={styles.autorStats}>
            <span>
              Membro desde {projeto.autor.membroDesde}
            </span>

            {projeto.autor.numeroVerificado && (
              <span className={styles.verificado}>
                <BadgeCheck size={15} strokeWidth={2.2} />
                Número verificado
              </span>
            )}

            {projeto.autor.pagamentoVerificado && (
              <span className={styles.verificado}>
                <BadgeCheck size={15} strokeWidth={2.2} />
                Método de pagamento verificado
              </span>
            )}

            <span>
              {projeto.autor.servicosPostados} serviços postados
            </span>
            {projeto.autor.reputacao?.selos.map((selo) => (
              <span key={selo.codigo} className={styles.seloReputacao}>
                <BadgeCheck size={15} strokeWidth={2.2} />
                {selo.texto}
              </span>
            ))}
            {projeto.autor.reputacao && projeto.autor.reputacao.dias_para_aprovar !== null && (
              <span>Aprova a entrega em ~{projeto.autor.reputacao.dias_para_aprovar.toLocaleString('pt-BR')} {projeto.autor.reputacao.dias_para_aprovar === 1 ? 'dia' : 'dias'}</span>
            )}
          </div>
        </div>

        <div className={styles.contratacaoCard}>
          <h2>Contratação</h2>

          <div className={styles.contratacaoItem}>
            <strong>Preço do serviço</strong>
            <span>{projeto.orcamento}</span>
          </div>

          <div className={styles.contratacaoItem}>
            <strong>Forma de pagamento</strong>

            <span>
              {projeto.formaPagamento || 'Não informado'}
            </span>
          </div>
        </div>

        {role === 'freelancer' && (
          <div className={styles.candidatura}>
            {statusCandidatura === 'pendente' ? (
              <button
                type="button"
                className={`${styles.botaoCandidatura} ${styles.candidaturaEnviada}`}
                onClick={cancelarCandidatura}
                onBlur={() => setConfirmandoCancelar(false)}
                disabled={processandoCandidatura}
              >
                {processandoCandidatura
                  ? 'Processando...'
                  : confirmandoCancelar
                    ? 'Clique de novo para confirmar'
                    : 'Cancelar candidatura'}
              </button>
            ) : statusCandidatura === 'aceita' || statusCandidatura === 'recusada' ? (
              <button
                type="button"
                className={`${styles.botaoCandidatura} ${styles.candidaturaEnviada}`}
                disabled
              >
                {statusCandidatura === 'aceita'
                  ? 'Candidatura aceita'
                  : 'Candidatura recusada'}
              </button>
            ) : (
              <>
                {propondo && (
                  <div className={styles.proposta}>
                    <strong>Sua contraproposta</strong>
                    <p>Deixe em branco o que não quiser mudar. Se o contratante aceitar sua candidatura, o projeto passa a valer o que você propôs.</p>
                    <div className={styles.propostaCampos}>
                      <label>
                        {projeto.tipoValor === 'hora' ? 'Valor por hora (R$)' : 'Valor (R$)'}
                        <input
                          inputMode="decimal"
                          value={valorProposto}
                          onChange={(e) => setValorProposto(e.target.value.replace(/[^\d,.]/g, ''))}
                          placeholder={String(projeto.valorNumero)}
                        />
                      </label>
                      <label>
                        Prazo (dias)
                        <input
                          inputMode="numeric"
                          value={prazoProposto}
                          onChange={(e) => setPrazoProposto(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder={projeto.prazoDias ? String(projeto.prazoDias) : '—'}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {/* Recado com as cartas salvas (vai junto com ou sem contraproposta) */}
                <RecadoCandidatura valor={recado} aoMudar={setRecado} />
                {minhaGuilda && (
                  <label className={styles.comGuilda}>
                    <input type="checkbox" checked={comGuilda} onChange={(e) => setComGuilda(e.target.checked)} />
                    <Brasao brasao={minhaGuilda.brasao} cor={minhaGuilda.cor} tamanho={20} />
                    <span>
                      Candidatar com a guilda <strong>{minhaGuilda.nome}</strong>
                      <small>O contratante vê que você tem um time para projetos maiores.</small>
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  className={styles.botaoCandidatura}
                  onClick={candidatarSe}
                  disabled={processandoCandidatura || Boolean(inscricoes?.encerrado)}
                >
                  {inscricoes?.encerrado
                    ? 'Inscrições encerradas'
                    : processandoCandidatura
                    ? 'Enviando candidatura...'
                    : propondo
                      ? 'Candidatar-se com a contraproposta'
                      : 'Candidatar-se ao projeto'}
                </button>
                <button type="button" className={styles.botaoProposta} onClick={() => setPropondo((v) => !v)}>
                  {propondo ? 'Candidatar-se pelo valor e prazo do projeto' : 'Propor outro valor ou prazo'}
                </button>
              </>
            )}

            {statusCandidatura === 'pendente' && minhaProposta && (
              <p className={styles.minhaProposta}>
                Sua contraproposta:{' '}
                {[
                  minhaProposta.valor !== null ? formatarMoeda(minhaProposta.valor) : null,
                  minhaProposta.prazo !== null ? `${minhaProposta.prazo} ${minhaProposta.prazo === 1 ? 'dia' : 'dias'}` : null,
                ].filter(Boolean).join(' · ')}
              </p>
            )}

            {mensagemCandidatura && (
              <p className={styles.mensagemCandidatura}>
                {mensagemCandidatura}
              </p>
            )}
          </div>
        )}

        {outrosProjetos.length > 0 && (
          <section className={styles.outrosProjetos}>
            <h2 className="placa">Outros trabalhos deste contratante</h2>

            <div className={styles.outrosLista}>
              {outrosProjetos.map((outro) => (
                <Link
                  key={outro.serv_id}
                  to={`${base}/projetos/${outro.serv_id}`}
                  className={styles.outroCard}
                >
                  <span className={styles.outroCategoria}>
                    {outro.categoria}
                  </span>

                  <h3>{outro.serv_titulo}</h3>

                  <p>{outro.serv_desc}</p>

                  <strong>
                    {outro.serv_tipo_valor === 'hora'
                      ? `${formatarMoeda(outro.serv_valor)}/hora`
                      : formatarMoeda(outro.serv_valor)}
                  </strong>

                  <span>
                    {outro.serv_qtd_dias
                      ? `${outro.serv_qtd_dias} dias`
                      : 'Prazo não informado'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {/* Freelancer vendo o projeto de outra pessoa: pode denunciar */}
        {role === 'freelancer' && id && (
          <div className={styles.denunciar}>
            <Denunciar alvoTipo="servico" alvoId={id} rotulo="Denunciar projeto" />
          </div>
        )}
      </aside>
    </div>
  )
}