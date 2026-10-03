import { Link } from 'react-router-dom'
import { FolderOpen, Hourglass, CircleCheckBig, Users, FilePen } from 'lucide-react'
import Avatar from '../avatar/avatar'
import Estrelas from './estrelas'
import ListaAvaliacoes from './listaavaliacoes'
import type { Avaliacao } from './tipos'
import styles from './gamificacao.module.css'

export interface PerfilContratante {
  estatisticas: {
    publicados: number
    abertos: number
    emAndamento: number
    concluidos: number
    rascunhos: number
    freelancersContratados: number
  }
  reputacao: { media: number; total: number }
  avaliacoes: Avaliacao[]
  contratados: {
    usu_id: number
    usu_nome: string
    usu_foto: string | null
    free_nivel: number
    free_rank: number
    projetos: number
  }[]
}

/*
 * Área do contratante no perfil: números dos projetos, a reputação que os
 * freelancers dão a ele e quem ele já contratou, para recontratar.
 */
export default function PainelContratante({ dados }: { dados: PerfilContratante }) {
  const { estatisticas: e, reputacao, avaliacoes, contratados } = dados

  const numeros = [
    { icone: FolderOpen, valor: e.abertos, rotulo: 'Abertos para candidatura' },
    { icone: Hourglass, valor: e.emAndamento, rotulo: 'Em andamento' },
    { icone: CircleCheckBig, valor: e.concluidos, rotulo: 'Concluídos' },
    { icone: Users, valor: e.freelancersContratados, rotulo: 'Freelancers contratados' },
    { icone: FilePen, valor: e.rascunhos, rotulo: 'Rascunhos' },
  ]

  return (
    <>
      <div className={styles.gradeNumeros}>
        {numeros.map(({ icone: Icone, valor, rotulo }) => (
          <div key={rotulo} className={styles.cartaoNumero}>
            <Icone size={18} strokeWidth={2.2} />
            <strong>{valor}</strong>
            <span>{rotulo}</span>
          </div>
        ))}
      </div>

      <section className={styles.secao}>
        <h2>Sua reputação</h2>
        <div className={styles.reputacao}>
          <strong className={styles.reputacaoNota}>
            {reputacao.total > 0 ? reputacao.media.toLocaleString('pt-BR') : '—'}
          </strong>
          <div>
            <Estrelas nota={reputacao.media} tamanho={18} />
            <span className={styles.suave}>
              {reputacao.total === 0
                ? 'Você ainda não foi avaliado. Ao finalizar um projeto, o freelancer pode avaliar você.'
                : `${reputacao.total} ${reputacao.total === 1 ? 'avaliação' : 'avaliações'} de freelancers`}
            </span>
          </div>
        </div>
        <p className={styles.dica}>
          Freelancers veem sua nota antes de se candidatar. Pagar em dia e dar retornos claros
          ajuda a atrair os melhores candidatos.
        </p>
      </section>

      <section className={styles.secao}>
        <h2>Freelancers que você já contratou</h2>
        {contratados.length === 0 ? (
          <p className={styles.vazioTexto}>
            Quando você aceitar uma candidatura, o freelancer aparece aqui para você recontratar depois.{' '}
            <Link to="/contratante/criar-projeto">Publicar um projeto</Link>
          </p>
        ) : (
          <div className={styles.gradeContratados}>
            {contratados.map((c) => (
              <Link key={c.usu_id} to={`/contratante/freelancer/${c.usu_id}`} className={styles.contratado}>
                <Avatar nome={c.usu_nome} size={48} foto={c.usu_foto} />
                <strong>{c.usu_nome}</strong>
                <span className={styles.suave}>
                  Nível {c.free_nivel}
                  {c.free_rank > 0 && ` · ${c.free_rank.toLocaleString('pt-BR')} ★`}
                </span>
                <span className={styles.suave}>
                  {c.projetos} {c.projetos === 1 ? 'projeto juntos' : 'projetos juntos'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.secao}>
        <h2>O que os freelancers dizem</h2>
        <ListaAvaliacoes avaliacoes={avaliacoes} vazio="Nenhuma avaliação recebida ainda." />
      </section>
    </>
  )
}
