import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BriefcaseBusiness, EyeOff, MailCheck } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Avatar from '../components/avatar/avatar'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import FormAvaliacao from '../components/gamificacao/formavaliacao'
import Ilustracao from '../components/ilustracao/ilustracao'
import type { AvaliacaoPendente } from '../components/gamificacao/tipos'
import { avisarAvaliacoesMudaram } from '../utils/avaliacoespendentes'
import styles from './Avaliacoes.module.css'

/* Avaliações pendentes: uma página só para avaliar quem trabalhou com você */
export default function Avaliacoes() {
  const { role } = useRole()
  const ehContratante = role === 'contratante'
  const toast = useToast()

  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      const dados = await api<{ pendentes: AvaliacaoPendente[] }>('/avaliacoes/pendentes')
      setPendentes(dados.pendentes)
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

  function enviada(p: AvaliacaoPendente) {
    const nome = p.usu_nome.split(' ')[0]
    toast.mostrar(
      p.outro_ja_avaliou
        ? `Avaliação de ${nome} enviada. As duas notas já aparecem no perfil de vocês.`
        : `Avaliação de ${nome} enviada. Ela aparece quando ${nome} avaliar você também (ou em 7 dias).`
    )
    /* Sai da lista na hora; o resto continua como está */
    setPendentes((atual) => atual.filter((x) => !(x.serv_id === p.serv_id && x.usu_id === p.usu_id)))
    avisarAvaliacoesMudaram()
  }

  function tentarDeNovo() {
    setErro('')
    setCarregando(true)
    carregar()
  }

  if (carregando) return <Carregando variante="lista" />
  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={tentarDeNovo} />

  return (
    <div className={styles.pagina}>
      <Link to={`/${role}/historico`} className={styles.voltar}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        Voltar ao histórico
      </Link>

      <h1 className="placa">Avaliações pendentes</h1>
      <p className={`${styles.subtitulo} placa`}>
        {ehContratante
          ? 'Sua nota dá XP ao freelancer e ajuda outros contratantes a escolher.'
          : 'Avaliar o contratante ajuda outros freelancers a escolherem bem.'}
      </p>

      <p className={styles.cega}>
        <EyeOff size={16} strokeWidth={2.2} aria-hidden="true" />
        <span>
          <strong>Avaliação às cegas:</strong> ninguém vê a nota do outro antes de avaliar. As duas aparecem juntas quando os dois
          avaliam, ou 7 dias depois. Assim cada um avalia com sinceridade, sem responder à nota do outro.
        </span>
      </p>

      {pendentes.length === 0 ? (
        <div className={`${styles.vazio} entrada`}>
          <Ilustracao tipo="coruja" />
          <strong>Tudo avaliado!</strong>
          <p>Quando um projeto for concluído, quem trabalhou com você aparece aqui.</p>
          <Link to={`/${role}/historico`} className={styles.btnHistorico}>Ver histórico</Link>
        </div>
      ) : (
        <div className={`${styles.grade} cascata`}>
          {pendentes.map((p) => (
            <article key={`${p.serv_id}-${p.usu_id}`} className={styles.cartao}>
              <header className={styles.topo}>
                <Avatar nome={p.usu_nome} size={56} foto={p.usu_foto} />
                <div>
                  <span className={styles.pergunta}>Como foi trabalhar com</span>
                  <strong className={styles.nome}>{p.usu_nome}</strong>
                </div>
              </header>
              <p className={styles.projeto}>
                <BriefcaseBusiness size={15} strokeWidth={2.2} />
                {p.serv_titulo}
              </p>
              {p.outro_ja_avaliou && (
                <p className={styles.jaAvaliou}>
                  <MailCheck size={15} strokeWidth={2.2} aria-hidden="true" />
                  {p.usu_nome.split(' ')[0]} já avaliou você. A nota aparece assim que você avaliar também.
                </p>
              )}
              <FormAvaliacao pendente={p} onEnviada={() => enviada(p)} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
