import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer, Link2, UserRound, Star } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import PaginaPublica from '../components/layout/topopublico'
import Carregando from '../components/carregando/carregando'
import Ilustracao from '../components/ilustracao/ilustracao'
import { linkPerfilPublico } from '../utils/perfilpublico'
import styles from './Certificado.module.css'

interface DadosCertificado {
  serv_id: number
  titulo: string
  categoria: string
  freelancer: string
  freelancer_id: number
  nivel: number
  cliente: string
  concluido_em: string
  nota: number | null
  codigo: string
}

/* Certificado de conclusão de um projeto: um pergaminho em pixel que o freelancer pode imprimir ou divulgar */
export default function Certificado() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [dados, setDados] = useState<DadosCertificado | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    api<{ certificado: DadosCertificado }>(`/publico/certificado/${Number(id)}`, { publico: true })
      .then((d) => {
        if (!ativo) return
        setDados(d.certificado)
        document.title = `Certificado · ${d.certificado.titulo} · ContrateJá`
      })
      .catch((e) => ativo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o certificado.'))
    return () => {
      ativo = false
    }
  }, [id])

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.mostrar('Link do certificado copiado!')
    } catch {
      toast.mostrar('Não deu para copiar o link.', 'erro')
    }
  }

  if (erro) {
    return (
      <PaginaPublica>
        <div className={styles.erro}>
          <Ilustracao tipo="coruja" />
          <strong>{erro}</strong>
          <p>O certificado só existe para projetos concluídos na plataforma.</p>
          <Link to="/" className={styles.botao}>Ir para a página inicial</Link>
        </div>
      </PaginaPublica>
    )
  }

  if (!dados) return <PaginaPublica><Carregando variante="lista" /></PaginaPublica>

  const data = new Date(dados.concluido_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PaginaPublica>
      <div className={styles.pagina}>
        <div className={styles.barra}>
          <button type="button" className={styles.botao} onClick={() => window.print()}>
            <Printer size={16} strokeWidth={2.2} /> Imprimir ou salvar PDF
          </button>
          <button type="button" className={styles.botao} onClick={copiarLink}>
            <Link2 size={16} strokeWidth={2.2} /> Copiar link
          </button>
          <a className={styles.botao} href={linkPerfilPublico(dados.freelancer_id, dados.freelancer)}>
            <UserRound size={16} strokeWidth={2.2} /> Ver perfil
          </a>
        </div>

        <article className={styles.pergaminho} aria-labelledby="titulo-certificado">
          <span className={`${styles.canto} ${styles.cantoA}`} />
          <span className={`${styles.canto} ${styles.cantoB}`} />
          <span className={`${styles.canto} ${styles.cantoC}`} />
          <span className={`${styles.canto} ${styles.cantoD}`} />

          <span className={styles.marca}>ContrateJá</span>
          <h1 id="titulo-certificado">Certificado de conclusão</h1>
          <p className={styles.texto}>Certificamos que</p>
          <strong className={styles.nome}>{dados.freelancer}</strong>
          <p className={styles.texto}>
            concluiu o projeto <strong>"{dados.titulo}"</strong> ({dados.categoria}) para {dados.cliente}, em {data}.
          </p>

          {dados.nota !== null && (
            <p className={styles.nota} aria-label={`Nota do cliente: ${dados.nota} de 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={22} strokeWidth={2} className={n <= dados.nota! ? styles.cheia : styles.vazia} />
              ))}
              <span>Nota do cliente: {dados.nota} de 5</span>
            </p>
          )}

          <div className={styles.rodape}>
            <div className={styles.assinatura}>
              <span className={styles.linha} />
              <span>Nível {dados.nivel} no castelo</span>
            </div>
            {/* Selo de cera em pixel */}
            <svg className={styles.selo} viewBox="0 0 16 16" shapeRendering="crispEdges" role="img" aria-label="Selo do ContrateJá">
              <rect x="4" y="1" width="8" height="14" fill="#a8281a" />
              <rect x="1" y="4" width="14" height="8" fill="#a8281a" />
              <rect x="2" y="2" width="12" height="12" fill="#a8281a" />
              <rect x="4" y="4" width="8" height="8" fill="#c8402e" />
              <rect x="6" y="5" width="4" height="1" fill="#f2d3ab" />
              <rect x="5" y="6" width="1" height="4" fill="#f2d3ab" />
              <rect x="6" y="10" width="4" height="1" fill="#f2d3ab" />
              <rect x="10" y="9" width="1" height="1" fill="#f2d3ab" />
              <rect x="10" y="6" width="1" height="1" fill="#f2d3ab" />
              <rect x="3" y="14" width="2" height="2" fill="#7a1c12" />
              <rect x="11" y="14" width="2" height="2" fill="#7a1c12" />
            </svg>
            <div className={styles.assinatura}>
              <span className={styles.codigo}>{dados.codigo}</span>
              <span>Código de verificação</span>
            </div>
          </div>
        </article>
        <p className={`${styles.verificar} placa`}>
          Este certificado fica em <strong>{window.location.host}/certificado/{dados.serv_id}</strong> e pode ser conferido por qualquer pessoa.
        </p>
      </div>
    </PaginaPublica>
  )
}
