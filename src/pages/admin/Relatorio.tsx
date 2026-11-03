import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import styles from './Relatorio.module.css'

interface Resumo {
  usuarios: Record<string, number>
  contas: Record<string, number>
  servicos: Record<string, number>
  candidaturas: Record<string, number>
  avaliacoes: number
}

interface Metricas {
  semanas: { inicio: string; freelancer: number; contratante: number }[]
  categorias: { categoria: string; total: number }[]
  conclusao: { concluidos: number; cancelados: number; emAndamento: number; taxa: number | null }
}

const soma = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)
const diaMes = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

const STATUS: [string, string][] = [
  ['rascunho', 'Rascunhos'],
  ['aberto', 'Abertos'],
  ['em_andamento', 'Em andamento'],
  ['finalizado', 'Concluídos'],
  ['cancelado', 'Cancelados'],
]

/* Relatório do painel em página limpa: "Salvar PDF" usa a impressão do navegador */
export default function Relatorio() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    Promise.all([api<Resumo>('/admin/resumo'), api<Metricas>('/admin/metricas')])
      .then(([r, m]) => {
        if (!vivo) return
        setResumo(r)
        setMetricas(m)
      })
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o relatório.'))
    return () => {
      vivo = false
    }
  }, [])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!resumo || !metricas) return <Carregando variante="lista" />

  const emitido = new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
  const cadastros = metricas.semanas.reduce((s, w) => s + w.freelancer + w.contratante, 0)

  return (
    <div className={styles.pagina}>
      <div className={styles.barra}>
        <Link to="/administrador" className={styles.voltar} viewTransition>
          <ArrowLeft size={16} strokeWidth={2.4} />
          Voltar ao painel
        </Link>
        <button type="button" className={styles.imprimir} onClick={() => window.print()}>
          <Printer size={16} strokeWidth={2.2} />
          Imprimir ou salvar PDF
        </button>
      </div>

      <article className={styles.folha}>
        <header className={styles.cabecalho}>
          <div>
            <span className={styles.marca}>ContrateJá</span>
            <h1>Relatório da plataforma</h1>
          </div>
          <p>Emitido em {emitido}</p>
        </header>

        <section>
          <h2>Visão geral</h2>
          <div className={styles.numeros}>
            <div><strong>{soma(resumo.usuarios)}</strong><span>usuários ({resumo.usuarios.freelancer ?? 0} freelancers, {resumo.usuarios.contratante ?? 0} contratantes)</span></div>
            <div><strong>{soma(resumo.servicos)}</strong><span>projetos cadastrados</span></div>
            <div><strong>{resumo.candidaturas.aceita ?? 0}</strong><span>contratações feitas</span></div>
            <div><strong>{resumo.avaliacoes}</strong><span>avaliações</span></div>
            <div><strong>{metricas.conclusao.taxa === null ? '—' : `${metricas.conclusao.taxa}%`}</strong><span>taxa de conclusão</span></div>
            <div><strong>{(resumo.contas.suspensa ?? 0) + (resumo.contas.banida ?? 0)}</strong><span>contas bloqueadas</span></div>
          </div>
        </section>

        <section>
          <h2>Projetos por situação</h2>
          <table>
            <thead><tr><th>Situação</th><th>Projetos</th></tr></thead>
            <tbody>
              {STATUS.map(([chave, rotulo]) => <tr key={chave}><td>{rotulo}</td><td>{resumo.servicos[chave] ?? 0}</td></tr>)}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Cadastros por semana</h2>
          <p className={styles.nota}>{cadastros} {cadastros === 1 ? 'conta nova' : 'contas novas'} nas últimas 8 semanas.</p>
          <table>
            <thead><tr><th>Semana de</th><th>Freelancers</th><th>Contratantes</th><th>Total</th></tr></thead>
            <tbody>
              {metricas.semanas.map((w) => (
                <tr key={w.inicio}><td>{diaMes(w.inicio)}</td><td>{w.freelancer}</td><td>{w.contratante}</td><td>{w.freelancer + w.contratante}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Projetos publicados por categoria</h2>
          <table>
            <thead><tr><th>Categoria</th><th>Projetos</th><th>Parte</th></tr></thead>
            <tbody>
              {metricas.categorias.map((c) => {
                const total = metricas.categorias.reduce((s, x) => s + x.total, 0)
                return (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td>
                    <td>{c.total}</td>
                    <td>
                      <span className={styles.barraTabela}><span style={{ width: `${(c.total / total) * 100}%` }} /></span>
                      {Math.round((c.total / total) * 100)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <footer className={styles.rodape}>ContrateJá · Trabalho de Conclusão de Curso · dados da própria plataforma</footer>
      </article>
    </div>
  )
}
