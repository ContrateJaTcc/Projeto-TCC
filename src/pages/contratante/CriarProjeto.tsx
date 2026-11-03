import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, History, X, Repeat, Lightbulb, Gauge } from 'lucide-react'
import styles from './CriarProjeto.module.css'
import { api, ErroApi } from '../../services/api'
import { MODELOS, type ModeloProjeto } from './modelosprojeto'
import { qualidadeDoAnuncio } from './qualidadeprojeto'
import { formatarMoeda } from '../../utils/formatar'
import { useToast } from '../../context/useToast'
import { motivosDeSpam } from '../../utils/moderacao'

/* Rascunho automático: o que foi digitado num projeto novo fica guardado neste navegador */
const CHAVE_RASCUNHO = 'criar-projeto:rascunho'

interface Rascunho {
  titulo: string
  descricao: string
  categoria: string
  tipoValor: string
  valor: string
  qtdDias: string
  local: string
  cidade: string
  estado: string
  habilidades: string
  vagas: string
  formaPagamento: string
  candidaturasAte: string
}

function lerRascunho(): Rascunho | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) ?? 'null')
    return salvo && typeof salvo === 'object' ? salvo : null
  } catch {
    return null
  }
}

function apagarRascunho() {
  try {
    localStorage.removeItem(CHAVE_RASCUNHO)
  } catch {
    /* Sem armazenamento */
  }
}

const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface TipoServico {
  tipo_id: number
  tipo_nome: string
  tipo_desc: string | null
}

/* Serviço */
interface ServicoCarregado {
  serv_titulo: string | null
  serv_desc: string | null
  categoria: string | null
  serv_tipo_valor: 'hora' | 'fixo' | null
  serv_valor: number | string | null
  serv_qtd_dias: number | null
  serv_local: 'remoto' | 'hibrido' | 'presencial' | null
  serv_cidade: string | null
  serv_estado: string | null
  serv_habilidades: string | null
  serv_forma_pagamento: string | null
  serv_vagas: number | null
  serv_candidaturas_ate?: string | null
}


function CriarProjeto() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projetoId = searchParams.get('id')
  /* "Trabalhar de novo": projeto novo copiado de um antigo, com convite para o mesmo freelancer */
  const baseadoEm = projetoId ? null : searchParams.get('baseado')
  const convidar = baseadoEm ? Number(searchParams.get('convidar')) || null : null
  const nomeConvidado = searchParams.get('nome') ?? ''
  const toast = useToast()

  const [etapa, setEtapa] = useState(1)

  /* Projeto novo: os campos começam do rascunho guardado, se houver */
  const [inicial] = useState(() => {
    const r = projetoId || baseadoEm ? null : lerRascunho()
    return r && (r.titulo || r.descricao) ? r : null
  })

  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao || '')
  const [categoria, setCategoria] = useState(inicial?.categoria || '')
  const [tipoValor, setTipoValor] = useState(inicial?.tipoValor || 'fixo')
  const [valor, setValor] = useState(inicial?.valor || '')
  const [qtdDias, setQtdDias] = useState(inicial?.qtdDias || '')
  const [local, setLocal] = useState(inicial?.local || 'remoto')
  const [cidade, setCidade] = useState(inicial?.cidade || '')
  const [estado, setEstado] = useState(inicial?.estado || '')
  const [habilidades, setHabilidades] = useState(inicial?.habilidades || '')
  const [vagas, setVagas] = useState(inicial?.vagas || '1')
  const [formaPagamento, setFormaPagamento] = useState(inicial?.formaPagamento || '')
  const [candidaturasAte, setCandidaturasAte] = useState(inicial?.candidaturasAte ?? '')

  const [recuperado, setRecuperado] = useState(Boolean(inicial))

  /* Guarda a cada mudança (só em projeto novo; editar um existente não mexe no rascunho) */
  useEffect(() => {
    if (projetoId) return
    const r: Rascunho = { titulo, descricao, categoria, tipoValor, valor, qtdDias, local, cidade, estado, habilidades, vagas, formaPagamento, candidaturasAte }
    const vazio = !titulo && !descricao && !valor && !habilidades
    try {
      if (vazio) localStorage.removeItem(CHAVE_RASCUNHO)
      else localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(r))
    } catch {
      /* Sem armazenamento: só não guarda */
    }
  }, [projetoId, titulo, descricao, categoria, tipoValor, valor, qtdDias, local, cidade, estado, habilidades, vagas, formaPagamento, candidaturasAte])

  function descartarRascunho() {
    apagarRascunho()
    setTitulo('')
    setDescricao('')
    setCategoria('')
    setTipoValor('fixo')
    setValor('')
    setQtdDias('')
    setLocal('remoto')
    setCidade('')
    setEstado('')
    setHabilidades('')
    setVagas('1')
    setFormaPagamento('')
    setCandidaturasAte('')
    setRecuperado(false)
  }

  /* Modelo pronto: preenche o que estiver vazio (não apaga o que a pessoa já escreveu) */
  function usarModelo(m: ModeloProjeto) {
    setTitulo((v) => v || m.titulo)
    setDescricao((v) => v || m.descricao)
    if (tiposServico.some((t) => t.tipo_nome === m.categoria)) setCategoria((v) => v || m.categoria)
    setTipoValor(m.tipoValor)
    setValor((v) => v || String(m.valor))
    setQtdDias((v) => v || String(m.dias))
    setHabilidades((v) => v || m.habilidades)
    setLocal(m.local)
  }

  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')

  /* Categorias */
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([])

  useEffect(() => {
    api<{ tipos: TipoServico[] }>('/tipos-servico')
      .then((d) => setTiposServico(d.tipos))
      .catch(() => setErro('Não foi possível carregar as categorias.'))
  }, [])

  useEffect(() => {
  const fonte = projetoId ?? baseadoEm
  if (!fonte) {
    return
  }

  async function carregarProjeto() {
    try {
      const dados = await api<{ projeto: ServicoCarregado }>(`/servicos/${fonte}`)

      const projeto = dados.projeto

      setTitulo(projeto.serv_titulo || '')
      setDescricao(projeto.serv_desc || '')
      setCategoria(projeto.categoria || '')
      setTipoValor(projeto.serv_tipo_valor || 'fixo')
      setValor(String(projeto.serv_valor || ''))
      setQtdDias(
        projeto.serv_qtd_dias !== null
          ? String(projeto.serv_qtd_dias)
          : ''
      )
      setLocal(projeto.serv_local || 'remoto')
      setCidade(projeto.serv_cidade || '')
      setEstado(projeto.serv_estado || '')
      setHabilidades(projeto.serv_habilidades || '')
      setVagas(String(projeto.serv_vagas || 1))
      setFormaPagamento(projeto.serv_forma_pagamento || '')
      /* Copiado de um antigo: a data limite antiga já passou */
      setCandidaturasAte(projetoId && projeto.serv_candidaturas_ate ? String(projeto.serv_candidaturas_ate).slice(0, 10) : '')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o projeto.')
    }
  }

  carregarProjeto()
}, [projetoId, baseadoEm])

  /* Sugestão de preço: a faixa do meio dos projetos parecidos (mesma categoria e tipo de valor) */
  const [sugestao, setSugestao] = useState<{ min: number; max: number; mediana: number; total: number } | null>(null)
  const tipoIdEscolhido = tiposServico.find((t) => t.tipo_nome === categoria)?.tipo_id
  useEffect(() => {
    if (!tipoIdEscolhido) return
    let vivo = true
    api<{ sugestao: { min: number; max: number; mediana: number } | null; total: number }>(`/servicos/precos?tipo_id=${tipoIdEscolhido}&tipo_valor=${tipoValor}`, { silencioso: true })
      .then((d) => vivo && setSugestao(d.sugestao ? { ...d.sugestao, total: d.total } : null))
      .catch(() => vivo && setSugestao(null))
    return () => {
      vivo = false
    }
  }, [tipoIdEscolhido, tipoValor])

  const qualidade = qualidadeDoAnuncio({ titulo, descricao, categoria, valor, qtdDias, habilidades, formaPagamento, local, cidade, candidaturasAte })

  function continuar() {
    setErro('')
    setEtapa(2)
  }

  function editarProjeto() {
    setErro('')
    setEtapa(1)
  }

  async function publicarProjeto(statusProjeto: 'aberto' | 'rascunho') {
    setErro('')
    setPublicando(true)

    try {
      const token = localStorage.getItem('token')

      if (!token) {
        setErro('Você precisa estar logado para publicar um projeto.')
        return
      }

      const tipo_id = tiposServico.find((t) => t.tipo_nome === categoria)?.tipo_id

      if (!tipo_id) {
        setErro('Escolha uma categoria da lista.')
        return
      }

      const resposta = await api<{ projeto?: { serv_id: number }; em_revisao?: boolean; mensagem?: string }>(projetoId ? `/servicos/${projetoId}` : '/servicos', {
        metodo: projetoId ? 'PUT' : 'POST',
        corpo: {
          titulo,
          descricao,
          tipo_id,
          valor: Number(valor),
          tipo_valor: tipoValor,
          qtd_dias: Number(qtdDias),
          local,
          cidade: cidade || null,
          estado: estado || null,
          habilidades: habilidades || null,
          forma_pagamento: formaPagamento || null,
          vagas: Number(vagas),
          status: statusProjeto,
          candidaturas_ate: candidaturasAte || null,
        },
      })

      if (!projetoId && !baseadoEm) apagarRascunho()

      /* "Trabalhar de novo": convida o mesmo freelancer para o projeto novo */
      if (convidar && statusProjeto === 'aberto' && resposta?.projeto?.serv_id) {
        try {
          await api('/convites', {
            metodo: 'POST',
            corpo: { serv_id: resposta.projeto.serv_id, usu_id: convidar, mensagem: `Gostei muito de trabalhar com você! Quer pegar este projeto também?` },
          })
          toast.mostrar(`Projeto publicado e ${nomeConvidado.split(' ')[0] || 'o freelancer'} foi convidado.`, 'sucesso')
        } catch (e) {
          toast.mostrar(e instanceof ErroApi ? `Projeto publicado, mas o convite não foi: ${e.message}` : 'Projeto publicado, mas o convite não foi enviado.', 'info')
        }
      }
      /* Filtro de spam: o projeto foi salvo, mas espera a revisão antes de aparecer */
      if (resposta?.em_revisao) toast.mostrar(resposta.mensagem ?? 'O projeto passa por uma revisão antes de aparecer.', 'info')
      navigate('/contratante')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setPublicando(false)
    }
  }

  /* Mesmo filtro do servidor: avisa antes de publicar */
  const spam = motivosDeSpam({ titulo, descricao, valor, tipo_valor: tipoValor })

  if (etapa === 2) {
    return (
      <main className={styles.pagina}>
        <div className={`${styles.cabecalho} placa`}>
          <span className={styles.etapa}>2 de 2</span>

          <h1>Revise seu projeto</h1>

          <p>
            Confira as informações antes de publicar seu projeto.
          </p>
        </div>

        <div className={styles.revisao}>
          <section className={styles.secao}>
            <h2>Informações do projeto</h2>

            <div className={styles.informacao}>
              <span>Título</span>
              <strong>{titulo || 'Não informado'}</strong>
            </div>

            <div className={styles.informacao}>
              <span>Descrição</span>
              <p>{descricao || 'Não informado'}</p>
            </div>

            <div className={styles.informacao}>
              <span>Categoria</span>
              <strong>{categoria || 'Não informado'}</strong>
            </div>
          </section>

          <section className={styles.secao}>
            <h2>Orçamento e prazo</h2>

            <div className={styles.informacao}>
              <span>Tipo de orçamento</span>
              <strong>
                {tipoValor === 'fixo' ? 'Valor fixo' : 'Por hora'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Valor</span>
              <strong>
                {valor ? `R$ ${valor}` : 'Não informado'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Prazo</span>
              <strong>
                {qtdDias ? `${qtdDias} dias` : 'Não informado'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Candidaturas até</span>
              <strong>
                {candidaturasAte ? candidaturasAte.split('-').reverse().join('/') : 'Sem data limite'}
              </strong>
            </div>
          </section>

          <section className={styles.secao}>
            <h2>Local do trabalho</h2>

            <div className={styles.informacao}>
              <span>Modalidade</span>
              <strong>{local}</strong>
            </div>

            {(local === 'hibrido' || local === 'presencial') && (
              <div className={styles.informacao}>
                <span>Localização</span>
                <strong>
                  {cidade && estado
                    ? `${cidade} - ${estado}`
                    : 'Não informado'}
                </strong>
              </div>
            )}
          </section>

          <section className={styles.secao}>
            <h2>Profissionais e pagamento</h2>

            <div className={styles.informacao}>
              <span>Quantidade de profissionais</span>
              <strong>{vagas}</strong>
            </div>

            <div className={styles.informacao}>
              <span>Forma de pagamento</span>
              <strong>
                {formaPagamento || 'Não informado'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Habilidades necessárias</span>
              <p>{habilidades || 'Nenhuma informada'}</p>
            </div>
          </section>

          {spam.length > 0 && (
            <p className="msg-erro" role="status">
              Este anúncio vai passar por uma revisão rápida da administração antes de aparecer para os freelancers ({spam.join(', ')}).
              Se não for o que você quis dizer, edite o texto.
            </p>
          )}

          {erro && (
            <p className="msg-erro">
              {erro}
            </p>
          )}

          <div className={styles.acoes}>
            <button
              type="button"
              onClick={editarProjeto}
              disabled={publicando}
            >
              Editar projeto
            </button>

            <button
              type="button"
              onClick={() => publicarProjeto('aberto')}
              disabled={publicando}
            >
              {publicando ? 'Publicando...' : 'Publicar projeto'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.pagina}>
      <div className={`${styles.cabecalho} placa`}>
        <span className={styles.etapa}>1 de 2</span>

        <h1>Crie seu projeto</h1>

        <p>
          Encontre o profissional ideal para realizar seu trabalho.
        </p>
      </div>

      {baseadoEm && (
        <div className={styles.recuperado} role="status">
          <Repeat size={16} strokeWidth={2.2} />
          <span>
            Trabalhar de novo{nomeConvidado ? ` com ${nomeConvidado.split(' ')[0]}` : ''}: o projeto novo já vem com os dados do anterior.
            {convidar ? ' Quando publicar, mandamos um convite para a mesma pessoa.' : ''}
          </span>
        </div>
      )}

      {!projetoId && !baseadoEm && (
        <section className={styles.modelos} aria-labelledby="titulo-modelos">
          <div className={styles.modelosTopo}>
            <Sparkles size={16} strokeWidth={2.2} />
            <strong id="titulo-modelos">Comece por um modelo</strong>
            <span>Preenche o que estiver vazio; depois é só ajustar.</span>
          </div>
          <div className={styles.modelosLista}>
            {MODELOS.map((m) => (
              <button key={m.nome} type="button" onClick={() => usarModelo(m)}>
                <m.icone size={16} strokeWidth={2.2} />
                {m.nome}
              </button>
            ))}
          </div>
        </section>
      )}

      {recuperado && (
        <div className={styles.recuperado} role="status">
          <History size={16} strokeWidth={2.2} />
          <span>Recuperamos o que você estava escrevendo.</span>
          <button type="button" onClick={descartarRascunho}>
            <X size={14} strokeWidth={2.4} />
            Começar do zero
          </button>
        </div>
      )}

      <form
        className={styles.formulario}
        onSubmit={(event) => {
          event.preventDefault()
          continuar()
        }}
      >
        <section className={styles.secao}>
          <h2>Informações do projeto</h2>

          <label>
            Título do projeto
            <input
              type="text"
              placeholder="Ex: Criar site para minha empresa"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
          </label>

          <label>
            Descrição
            <textarea
              placeholder="Descreva o que você precisa..."
              rows={6}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </label>

          <label>
            Categoria
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>

              {tiposServico.map((tipo) => (
                <option key={tipo.tipo_id} value={tipo.tipo_nome}>
                  {tipo.tipo_nome}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className={styles.secao}>
          <h2>Orçamento e prazo</h2>

          <div className={styles.linha}>
            <label>
              Tipo de orçamento
              <select
                value={tipoValor}
                onChange={(event) =>
                  setTipoValor(event.target.value)
                }
              >
                <option value="fixo">Valor fixo</option>
                <option value="hora">Por hora</option>
              </select>
            </label>

            <label>
              Valor
              <input
                type="number"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(event) =>
                  setValor(event.target.value)
                }
              />
            </label>
          </div>

          {sugestao && tipoIdEscolhido && (
            <p className={styles.sugestao} role="note">
              <Lightbulb size={15} strokeWidth={2.2} aria-hidden="true" />
              <span>
                Projetos de {categoria} {tipoValor === 'hora' ? 'por hora ' : ''}costumam pagar entre{' '}
                <strong>{formatarMoeda(sugestao.min)}</strong> e <strong>{formatarMoeda(sugestao.max)}</strong>
                {tipoValor === 'hora' ? ' a hora' : ''} ({sugestao.total} projetos na plataforma).
              </span>
              <button type="button" onClick={() => setValor(String(sugestao.mediana))}>
                Usar {formatarMoeda(sugestao.mediana)}
              </button>
            </p>
          )}

          <div className={styles.linha}>
            <label>
              Prazo em dias
              <input
                type="number"
                min="1"
                placeholder="Ex: 15"
                value={qtdDias}
                onChange={(event) =>
                  setQtdDias(event.target.value)
                }
              />
            </label>

            <label>
              Aceitar candidaturas até (opcional)
              <input
                type="date"
                min={hojeISO()}
                value={candidaturasAte}
                onChange={(event) => setCandidaturasAte(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className={styles.secao}>
          <h2>Local do trabalho</h2>

          <label>
            Modalidade
            <select
              value={local}
              onChange={(event) =>
                setLocal(event.target.value)
              }
            >
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
              <option value="presencial">Presencial</option>
            </select>
          </label>

          {(local === 'hibrido' || local === 'presencial') && (
            <div className={styles.linha}>
              <label>
                Cidade
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={cidade}
                  onChange={(event) =>
                    setCidade(event.target.value)
                  }
                />
              </label>

              <label>
                Estado
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Ex: SP"
                  value={estado}
                  onChange={(event) =>
                    setEstado(event.target.value.toUpperCase())
                  }
                />
              </label>
            </div>
          )}
        </section>

        <section className={styles.secao}>
          <h2>Profissionais e pagamento</h2>

          <label>
            Quantidade de profissionais
            <input
              type="number"
              min="1"
              value={vagas}
              onChange={(event) =>
                setVagas(event.target.value)
              }
            />
          </label>

          <label>
            Forma de pagamento
            <input
              type="text"
              placeholder="Ex: Pix, transferência..."
              value={formaPagamento}
              onChange={(event) =>
                setFormaPagamento(event.target.value)
              }
            />
          </label>

          <label>
            Habilidades necessárias
            <textarea
              placeholder="Ex: React, JavaScript, CSS..."
              rows={3}
              value={habilidades}
              onChange={(event) =>
                setHabilidades(event.target.value)
              }
            />
          </label>
        </section>

        <section className={styles.qualidade} aria-labelledby="titulo-qualidade">
          <div className={styles.qualidadeTopo}>
            <Gauge size={18} strokeWidth={2.2} aria-hidden="true" />
            <strong id="titulo-qualidade">Seu anúncio está {qualidade.porcento}% completo</strong>
          </div>
          <div className={styles.qualidadeBarra} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={qualidade.porcento} aria-label="Qualidade do anúncio">
            <span style={{ width: `${qualidade.porcento}%` }} data-nivel={qualidade.porcento >= 80 ? 'bom' : qualidade.porcento >= 50 ? 'medio' : 'fraco'} />
          </div>
          {qualidade.dicas.length > 0 ? (
            <ul>
              {qualidade.dicas.slice(0, 3).map((d) => <li key={d}>{d}</li>)}
            </ul>
          ) : (
            <p>Anúncio completinho: projetos assim recebem mais candidaturas e mais rápido.</p>
          )}
        </section>

        <div className={styles.acoes}>
          <button
            type="button"
            onClick={() => navigate('/contratante')}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => publicarProjeto('rascunho')}
          >
            Salvar rascunho
          </button>

          <button type="submit">
            Continuar
          </button>
        </div>
      </form>
    </main>
  )
}

export default CriarProjeto