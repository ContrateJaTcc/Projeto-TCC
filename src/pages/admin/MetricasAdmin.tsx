import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { api } from '../../services/api'
import styles from './MetricasAdmin.module.css'

interface Metricas {
  semanas: { inicio: string; freelancer: number; contratante: number }[]
  categorias: { categoria: string; total: number }[]
  conclusao: { concluidos: number; cancelados: number; emAndamento: number; taxa: number | null }
}

/* Séries do gráfico de cadastros: a cor segue o papel, nunca a posição */
const SERIES = [
  { chave: 'freelancer', rotulo: 'Freelancers', classe: styles.serieFreelancer },
  { chave: 'contratante', rotulo: 'Contratantes', classe: styles.serieContratante },
] as const

const diaMes = (iso: string) => {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

/* Escala "redonda" e par para o eixo (o meio também é inteiro): 2, 4, 10, 20, 40, 100... */
function topoDaEscala(maximo: number) {
  if (maximo <= 4) return maximo <= 2 ? 2 : 4
  const base = 10 ** Math.floor(Math.log10(maximo))
  return [1, 2, 4, 10].map((m) => m * base).find((v) => v >= maximo) ?? maximo
}

interface Dica {
  x: number
  y: number
  titulo: string
  linhas: [string, string, string?][]
}

/* Métricas do painel: cadastros por semana, projetos por categoria e taxa de conclusão */
export default function MetricasAdmin() {
  const [dados, setDados] = useState<Metricas | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [dica, setDica] = useState<Dica | null>(null)
  const [tabela, setTabela] = useState(false)

  useEffect(() => {
    let ativo = true
    api<Metricas>('/admin/metricas', { silencioso: true })
      .then((d) => ativo && setDados(d))
      .catch(() => ativo && setFalhou(true))
    return () => {
      ativo = false
    }
  }, [])

  /* Servidor antigo (sem a rota): a seção só não aparece */
  if (falhou) return null
  if (!dados) return <div className={`skeleton ${styles.esqueleto}`} />

  const totais = dados.semanas.map((s) => s.freelancer + s.contratante)
  const topo = topoDaEscala(Math.max(...totais, 1))
  const marcas = [topo, topo / 2, 0]
  const somaSemanas = totais.reduce((a, b) => a + b, 0)
  const maiorCategoria = Math.max(...dados.categorias.map((c) => c.total), 1)
  const { conclusao } = dados

  function mostrar(e: React.MouseEvent | React.FocusEvent, titulo: string, linhas: Dica['linhas']) {
    const alvo = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const area = (e.currentTarget as HTMLElement).closest(`.${styles.painel}`)!.getBoundingClientRect()
    setDica({ x: alvo.left - area.left + alvo.width / 2, y: alvo.top - area.top, titulo, linhas })
  }

  return (
    <section className={styles.metricas} aria-labelledby="titulo-metricas">
      <div className={styles.cabeca}>
        <h2 id="titulo-metricas" className="placa">Métricas</h2>
        <div className={styles.botoesCabeca}>
          <button type="button" className={styles.alternar} onClick={() => setTabela((t) => !t)} aria-pressed={tabela}>
            {tabela ? 'Ver gráficos' : 'Ver como tabela'}
          </button>
          <Link to="/administrador/relatorio" className={styles.alternar} viewTransition>
            <FileDown size={15} strokeWidth={2.2} />
            Relatório em PDF
          </Link>
        </div>
      </div>

      {tabela ? (
        <div className={styles.tabelas}>
          <table className={styles.tabela}>
            <caption>Cadastros por semana</caption>
            <thead>
              <tr><th>Semana de</th><th>Freelancers</th><th>Contratantes</th><th>Total</th></tr>
            </thead>
            <tbody>
              {dados.semanas.map((s, i) => (
                <tr key={s.inicio}><td>{diaMes(s.inicio)}</td><td>{s.freelancer}</td><td>{s.contratante}</td><td>{totais[i]}</td></tr>
              ))}
            </tbody>
          </table>
          <table className={styles.tabela}>
            <caption>Projetos publicados por categoria</caption>
            <thead><tr><th>Categoria</th><th>Projetos</th></tr></thead>
            <tbody>
              {dados.categorias.map((c) => <tr key={c.categoria}><td>{c.categoria}</td><td>{c.total}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.grade}>
          {/* Cadastros por semana: colunas empilhadas, freelancer embaixo */}
          <article className={`${styles.painel} ${styles.largo}`} onMouseLeave={() => setDica(null)}>
            <header>
              <h3>Cadastros por semana</h3>
              <p>{somaSemanas} {somaSemanas === 1 ? 'conta nova' : 'contas novas'} nas últimas 8 semanas</p>
            </header>
            <ul className={styles.legenda}>
              {SERIES.map((s) => (
                <li key={s.chave}><span className={`${styles.amostra} ${s.classe}`} />{s.rotulo}</li>
              ))}
            </ul>
            <div className={styles.colunasArea}>
              <div className={styles.eixo} aria-hidden="true">
                {marcas.map((m) => <span key={m}>{m}</span>)}
              </div>
              <div className={styles.colunas} role="list" aria-label="Cadastros por semana">
                {marcas.map((m) => (
                  <span key={m} className={styles.grade1} style={{ bottom: `${(m / topo) * 100}%` }} aria-hidden="true" />
                ))}
                {dados.semanas.map((s, i) => {
                  const rotulo = `Semana de ${diaMes(s.inicio)}: ${s.freelancer} freelancers e ${s.contratante} contratantes`
                  const abrir = (e: React.MouseEvent | React.FocusEvent) =>
                    mostrar(e, `Semana de ${diaMes(s.inicio)}`, [
                      ['Freelancers', String(s.freelancer), styles.serieFreelancer],
                      ['Contratantes', String(s.contratante), styles.serieContratante],
                      ['Total', String(totais[i])],
                    ])
                  return (
                    <div
                      key={s.inicio}
                      className={styles.coluna}
                      role="listitem"
                      tabIndex={0}
                      aria-label={rotulo}
                      onMouseEnter={abrir}
                      onFocus={abrir}
                      onBlur={() => setDica(null)}
                    >
                      <div className={styles.pilha} style={{ height: `${(totais[i] / topo) * 100}%` }}>
                        {s.contratante > 0 && <span className={styles.serieContratante} style={{ flexGrow: s.contratante }} />}
                        {s.freelancer > 0 && <span className={styles.serieFreelancer} style={{ flexGrow: s.freelancer }} />}
                      </div>
                      <span className={styles.rotuloSemana}>{diaMes(s.inicio)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {dica && (
              <div className={styles.dica} style={{ left: dica.x, top: dica.y }} role="status">
                <strong>{dica.titulo}</strong>
                {dica.linhas.map(([nome, valor, classe]) => (
                  <span key={nome}>
                    {classe ? <i className={`${styles.amostra} ${classe}`} /> : <i className={styles.amostraVazia} />}
                    {nome}
                    <b>{valor}</b>
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* Taxa de conclusão: um número só, com o que ele resume embaixo */}
          <article className={`${styles.painel} ${styles.destaque}`}>
            <header>
              <h3>Taxa de conclusão</h3>
              <p>Projetos concluídos entre os que terminaram</p>
            </header>
            <strong className={styles.numero}>{conclusao.taxa === null ? '—' : `${conclusao.taxa}%`}</strong>
            <ul className={styles.resumo}>
              <li><b>{conclusao.concluidos}</b> concluídos</li>
              <li><b>{conclusao.cancelados}</b> cancelados</li>
              <li><b>{conclusao.emAndamento}</b> em andamento</li>
            </ul>
          </article>

          {/* Projetos por categoria: barras deitadas, da maior para a menor */}
          <article className={`${styles.painel} ${styles.largo}`}>
            <header>
              <h3>Projetos por categoria</h3>
              <p>Publicados (sem contar rascunhos)</p>
            </header>
            {dados.categorias.length === 0 ? (
              <p className={styles.vazio}>Nenhum projeto publicado ainda.</p>
            ) : (
              <ul className={styles.barras}>
                {dados.categorias.map((c) => (
                  <li key={c.categoria} title={`${c.categoria}: ${c.total} ${c.total === 1 ? 'projeto' : 'projetos'}`}>
                    <span className={styles.nomeBarra}>{c.categoria}</span>
                    <span className={styles.trilhoBarra}>
                      <span className={styles.serieFreelancer} style={{ width: `${(c.total / maiorCategoria) * 100}%` }} />
                    </span>
                    <span className={styles.valorBarra}>{c.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
