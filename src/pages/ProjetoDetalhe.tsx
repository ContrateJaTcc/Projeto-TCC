import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Star, BadgeCheck } from 'lucide-react'
import { useRole } from '../context/useRole'
import Avatar from '../components/avatar/avatar'
import styles from './ProjetoDetalhe.module.css'

interface Projeto {
  id: string
  titulo: string
  descricao: string
  categoria: string
  orcamento: string
  prazo: string
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
    totalPago: string
    servicosPostados: number
    nota: number
    totalAvaliacoes: number
  }
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
  contratante_nome: string
  contratante_desc: string | null
  contratante_foto: string | null
  contratante_data_criacao: string
  contratante_servicos_postados: number
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
}

function formatarData(data: string) {
  if (!data) return ''

  return new Date(data).toLocaleDateString('pt-BR')
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
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  

  const base = role === 'contratante' ? '/contratante' : '/freelancer'

  useEffect(() => {
    async function carregarProjeto() {
      try {
        const token = localStorage.getItem('token')

        if (!token) {
          setErro('Você precisa estar logado.')
          return
        }

        const resposta = await fetch(
          `https://backendtcc-zeta.vercel.app/servicos/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
          setErro(dados.erro || 'Projeto não encontrado.')
          return
        }

        const servico: Servico = dados.projeto

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
    totalPago: 'R$ 0,00',
    servicosPostados: servico.contratante_servicos_postados || 0,
    nota: 0,
    totalAvaliacoes: 0,
  },
}

        setProjeto(projetoFormatado)
        const respostaOutros = await fetch(
  `https://backendtcc-zeta.vercel.app/servicos/${id}/outros`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
)

const dadosOutros = await respostaOutros.json()

if (respostaOutros.ok) {
  setOutrosProjetos(dadosOutros.projetos)
}
      } catch (erro) {
  console.error('erro ao carregar o projwto:', erro)
  setErro('Não foi possível carregar o projeto.')
} finally {
        setCarregando(false)
      }
    }

    if (id) {
      carregarProjeto()
    }
  }, [id, role])

  if (carregando) {
    return (
      <div className={styles.pagina}>
        <p>Carregando projeto...</p>
      </div>
    )
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

      <div className={styles.cabecalho}>
        <h1 className={styles.titulo}>{projeto.titulo}</h1>

        <div className={styles.meta}>
          <div>Postado em {projeto.postadoEm}</div>

          <div className={styles.estrelas}>
            <Star
              size={14}
              strokeWidth={2.2}
              fill="currentColor"
            />
            {projeto.autor.nota} de {projeto.autor.totalAvaliacoes} avaliações
          </div>
        </div>
      </div>

      <p className={styles.descricao}>
        {projeto.descricao}
      </p>

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
      </div>

      <div className={styles.habilidades}>
        <strong>Habilidades necessárias</strong>
        <span>
          {projeto.habilidades || 'Nenhuma informada'}
        </span>
      </div>
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
              {projeto.autor.nota} de {projeto.autor.totalAvaliacoes} avaliações
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

          <span>{projeto.autor.totalPago}</span>

          <span>
            {projeto.autor.servicosPostados} serviços postados
          </span>
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

      {outrosProjetos.length > 0 && (
        <section className={styles.outrosProjetos}>
          <h2>Outros trabalhos deste contratante</h2>

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
    </aside>
  </div>
)
}
