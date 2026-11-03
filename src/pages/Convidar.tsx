import { useEffect, useState } from 'react'
import { Copy, Gift, Share2, UserPlus, Check, Hourglass } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { formatarData } from '../utils/formatar'
import comum from './comum.module.css'
import styles from './Convidar.module.css'

interface Indicacao {
  disponivel: boolean
  codigo?: string
  link?: string
  xp_por_amigo?: number
  indicados?: { nome: string; tipo: string; premiado: boolean; desde: string }[]
}

/* Convide um amigo: link próprio; quando a pessoa conclui o primeiro projeto, os dois ganham XP */
export default function Convidar() {
  const { mostrar } = useToast()
  const [dados, setDados] = useState<Indicacao | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    api<Indicacao>('/usuarios/eu/indicacao')
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o convite.'))
    return () => {
      vivo = false
    }
  }, [])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!dados) return <Carregando variante="detalhe" />

  if (!dados.disponivel || !dados.link) {
    return (
      <div className={`${comum.pagina} ${comum.estreita}`}>
        <h1 className="placa">Convide um amigo</h1>
        <p className={`${comum.painel} ${comum.nota}`}>O convite ainda não está disponível neste servidor.</p>
      </div>
    )
  }

  const texto = `Vem pro ContrateJá! Lá eu acho projetos e freelancers e ainda subo de nível num castelo em pixel art. Entra pelo meu convite: ${dados.link}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(dados?.link ?? '')
      mostrar('Link copiado!', 'sucesso')
    } catch {
      mostrar('Não deu para copiar. Selecione o link e copie à mão.', 'erro')
    }
  }

  async function compartilhar() {
    try {
      await navigator.share({ title: 'ContrateJá', text: texto, url: dados?.link })
    } catch {
      /* Cancelou */
    }
  }

  const premiados = dados.indicados?.filter((i) => i.premiado).length ?? 0

  return (
    <div className={`${comum.pagina} ${comum.estreita}`}>
      <h1 className="placa">Convide um amigo</h1>
      <p className={`${comum.subtitulo} placa`}>
        Mande o seu link para quem trabalha como freelancer ou precisa contratar alguém. Quando a pessoa concluir o primeiro projeto,
        vocês dois ganham {dados.xp_por_amigo} XP (para contas de freelancer).
      </p>

      <section className={comum.painel}>
        <h2><Gift size={20} strokeWidth={2.2} /> Seu link</h2>
        <div className={styles.link}>
          <input readOnly value={dados.link} aria-label="Seu link de convite" onFocus={(e) => e.target.select()} />
          <button type="button" className={comum.botaoOuro} onClick={copiar}><Copy size={16} strokeWidth={2.2} /> Copiar</button>
          {'share' in navigator && (
            <button type="button" className={comum.botao} onClick={compartilhar}><Share2 size={16} strokeWidth={2.2} /> Compartilhar</button>
          )}
        </div>
        <p className={comum.nota}>
          Código: <strong className={styles.codigo}>{dados.codigo}</strong>. Também dá para digitar o código no cadastro.
        </p>
        <a className={comum.botao} href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
          Mandar pelo WhatsApp
        </a>
      </section>

      <section className={comum.painel} style={{ marginTop: '1.2rem' }}>
        <h2><UserPlus size={20} strokeWidth={2.2} /> Quem entrou pelo seu convite</h2>
        {!dados.indicados?.length ? (
          <p className={comum.nota}>Ninguém ainda. Quando alguém se cadastrar pelo seu link, aparece aqui.</p>
        ) : (
          <>
            <p className={comum.nota}>
              {dados.indicados.length} {dados.indicados.length === 1 ? 'pessoa entrou' : 'pessoas entraram'}; {premiados} já{' '}
              {premiados === 1 ? 'concluiu' : 'concluíram'} o primeiro projeto.
            </p>
            <ul className={styles.lista}>
              {dados.indicados.map((i, n) => (
                <li key={n}>
                  <strong>{i.nome}</strong>
                  <span className={comum.nota}>{i.tipo === 'freelancer' ? 'Freelancer' : 'Contratante'} · desde {formatarData(i.desde)}</span>
                  {i.premiado ? (
                    <span className={`${comum.selo} ${styles.ok}`}><Check size={13} strokeWidth={3} aria-hidden="true" /> +{dados.xp_por_amigo} XP</span>
                  ) : (
                    <span className={comum.selo}><Hourglass size={13} strokeWidth={2.4} aria-hidden="true" /> Falta o 1º projeto</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
