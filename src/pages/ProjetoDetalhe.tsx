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
  serv_data_criacao: string
}

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const { role } = useRole()

  const [projeto, setProjeto] = useState<Projeto | null>(null)
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
              ? `R$ ${Number(servico.serv_valor).toFixed(2)}/hora`
              : `R$ ${Number(servico.serv_valor).toFixed(2)}`,
          prazo: servico.serv_qtd_dias
            ? `${servico.serv_qtd_dias} dias`
            : 'Não informado',
          postadoEm: servico.serv_data_criacao,
          autor: {
            nome: role === 'contratante' ? 'Você' : 'Contratante',
            bio: 'Contratante',
            membroDesde: '',
            numeroVerificado: false,
            pagamentoVerificado: false,
            totalPago: 'R$ 0,00',
            servicosPostados: 0,
            nota: 0,
            totalAvaliacoes: 0,
          },
        }

        setProjeto(projetoFormatado)
      } catch (erro) {
        console.error(erro)
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
            <strong>Preço do serviço</strong>
            <span>{projeto.orcamento}</span>
          </div>

          <div>
            <strong>Prazo</strong>
            <span>{projeto.prazo}</span>
          </div>
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
                <BadgeCheck
                  size={15}
                  strokeWidth={2.2}
                />
                Número verificado
              </span>
            )}

            {projeto.autor.pagamentoVerificado && (
              <span className={styles.verificado}>
                <BadgeCheck
                  size={15}
                  strokeWidth={2.2}
                />
                Método de pagamento verificado
              </span>
            )}

            <span>{projeto.autor.totalPago}</span>

            <span>
              {projeto.autor.servicosPostados} serviços postados
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}