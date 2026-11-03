import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Coins, Target, Info } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { formatarMoeda } from '../utils/formatar'
import { baixarCsv } from '../utils/csv'
import { FileSpreadsheet } from 'lucide-react'
import comum from './comum.module.css'
import graf from './admin/MetricasAdmin.module.css'
import styles from './Ganhos.module.css'

interface DadosGanhos {
  meses: { mes: string; total: number; projetos: number }[]
  total: number
  projetos: number
  sem_valor: number
  media_por_projeto: number | null
  candidaturas: { aceitas: number; recusadas: number; pendentes: number }
  taxa_aceite: number | null
  categorias: { categoria: string; total: number; projetos: number }[]
}

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const nomeMes = (aaaamm: string) => {
  const [ano, mes] = aaaamm.split('-').map(Number)
  return `${NOMES_MES[mes - 1]}/${String(ano).slice(2)}`
}

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const eixoMoeda = (v: number) => (v === 0 ? 'R$ 0' : `R$ ${compacto.format(v)}`)

/* Escala redonda para dinheiro: 100, 200, 400, 1.000, 2.000... */
function topoDaEscala(maximo: number) {
  if (maximo <= 0) return 100
  const base = 10 ** Math.floor(Math.log10(maximo))
  return [1, 2, 4, 5, 10].map((m) => m * base).find((v) => v >= maximo) ?? maximo
}

/* Painel de ganhos do freelancer: quanto entrou por mês, de onde vem e como andam as candidaturas */
export default function Ganhos() {
  const [dados, setDados] = useState<DadosGanhos | null>(null)
  const [erro, setErro] = useState('')
  const [tabela, setTabela] = useState(false)
  const [dica, setDica] = useState<{ x: number; y: number; mes: string; total: number; projetos: number } | null>(null)

  useEffect(() => {
    let ativo = true
    api<DadosGanhos>('/usuarios/eu/ganhos')
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os ganhos.'))
    return () => {
      ativo = false
    }
  }, [])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!dados) return <Carregando variante="lista" />

  const topo = topoDaEscala(Math.max(...dados.meses.map((m) => m.total), 1))
  const marcas = [topo, topo / 2, 0]
  const maiorMes = dados.meses.reduce((m, x) => (x.total > m.total ? x : m), dados.meses[0])
  const noPeriodo = dados.meses.reduce((t, m) => t + m.total, 0)
  const maiorCategoria = Math.max(...dados.categorias.map((c) => c.total), 1)

  function abrir(e: React.MouseEvent | React.FocusEvent, m: DadosGanhos['meses'][number]) {
    const alvo = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const area = (e.currentTarget as HTMLElement).closest(`.${graf.painel}`)!.getBoundingClientRect()
    setDica({ x: alvo.left - area.left + alvo.width / 2, y: alvo.top - area.top, mes: m.mes, total: m.total, projetos: m.projetos })
  }

  return (
    <div className={`${comum.pagina} ${styles.cores}`}>
      <h1 className="placa">Meus ganhos</h1>
      <p className={`${comum.subtitulo} placa`}>Quanto os seus projetos concluídos renderam nos últimos 6 meses.</p>

      <div className={styles.numeros}>
        <section className={`${comum.painel} ${styles.numero}`}>
          <span className={styles.rotulo}><Wallet size={16} strokeWidth={2.2} /> Total recebido</span>
          <strong>{formatarMoeda(dados.total)}</strong>
          <span className={comum.nota}>{dados.projetos} {dados.projetos === 1 ? 'projeto concluído' : 'projetos concluídos'}</span>
        </section>
        <section className={`${comum.painel} ${styles.numero}`}>
          <span className={styles.rotulo}><Coins size={16} strokeWidth={2.2} /> Média por projeto</span>
          <strong>{dados.media_por_projeto === null ? '—' : formatarMoeda(dados.media_por_projeto)}</strong>
          <span className={comum.nota}>{dados.categorias[0] ? `Rende mais: ${dados.categorias[0].categoria}` : 'Ainda sem projetos concluídos'}</span>
        </section>
        <section className={`${comum.painel} ${styles.numero}`}>
          <span className={styles.rotulo}><Target size={16} strokeWidth={2.2} /> Taxa de aceite</span>
          <strong>{dados.taxa_aceite === null ? '—' : `${dados.taxa_aceite}%`}</strong>
          <span className={comum.nota}>
            {dados.candidaturas.aceitas} {dados.candidaturas.aceitas === 1 ? 'aceita' : 'aceitas'} · {dados.candidaturas.recusadas}{' '}
            {dados.candidaturas.recusadas === 1 ? 'recusada' : 'recusadas'} · {dados.candidaturas.pendentes} em análise
          </span>
        </section>
      </div>

      <div className={styles.alternar}>
        <button
          type="button"
          className={graf.alternar}
          onClick={() =>
            baixarCsv('ganhos-contrateja', ['Mês', 'Projetos', 'Valor (R$)'], [
              ...dados.meses.map((m) => [nomeMes(m.mes), m.projetos, m.total]),
              [],
              ['Categoria', 'Projetos', 'Valor (R$)'],
              ...dados.categorias.map((c) => [c.categoria, c.projetos, c.total]),
            ])
          }
        >
          <FileSpreadsheet size={14} strokeWidth={2.2} aria-hidden="true" /> Baixar planilha
        </button>
        <button type="button" className={graf.alternar} onClick={() => setTabela((t) => !t)} aria-pressed={tabela}>
          {tabela ? 'Ver gráficos' : 'Ver como tabela'}
        </button>
      </div>

      {tabela ? (
        <div className={graf.tabelas}>
          <table className={graf.tabela}>
            <caption>Ganhos por mês</caption>
            <thead><tr><th>Mês</th><th>Projetos</th><th>Valor</th></tr></thead>
            <tbody>
              {dados.meses.map((m) => <tr key={m.mes}><td>{nomeMes(m.mes)}</td><td>{m.projetos}</td><td>{formatarMoeda(m.total)}</td></tr>)}
            </tbody>
          </table>
          <table className={graf.tabela}>
            <caption>Por categoria</caption>
            <thead><tr><th>Categoria</th><th>Projetos</th><th>Valor</th></tr></thead>
            <tbody>
              {dados.categorias.map((c) => <tr key={c.categoria}><td>{c.categoria}</td><td>{c.projetos}</td><td>{formatarMoeda(c.total)}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.grade}>
          <article className={graf.painel} onMouseLeave={() => setDica(null)}>
            <header>
              <h3>Ganhos por mês</h3>
              <p>{formatarMoeda(noPeriodo)} nos últimos 6 meses{maiorMes.total > 0 ? ` · melhor mês: ${nomeMes(maiorMes.mes)}` : ''}</p>
            </header>
            <div className={graf.colunasArea}>
              <div className={`${graf.eixo} ${styles.eixoLargo}`} aria-hidden="true">
                {marcas.map((m) => <span key={m}>{eixoMoeda(m)}</span>)}
              </div>
              <div className={`${graf.colunas} ${styles.seisColunas}`} role="list" aria-label="Ganhos por mês">
                {marcas.map((m) => (
                  <span key={m} className={graf.grade1} style={{ bottom: `${(m / topo) * 100}%` }} aria-hidden="true" />
                ))}
                {dados.meses.map((m) => (
                  <div
                    key={m.mes}
                    className={graf.coluna}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${nomeMes(m.mes)}: ${formatarMoeda(m.total)} em ${m.projetos} ${m.projetos === 1 ? 'projeto' : 'projetos'}`}
                    onMouseEnter={(e) => abrir(e, m)}
                    onFocus={(e) => abrir(e, m)}
                    onBlur={() => setDica(null)}
                  >
                    {/* Rótulo direto só no melhor mês */}
                    {m === maiorMes && m.total > 0 && (
                      <span className={styles.rotuloTopo} style={{ bottom: `calc(${(m.total / topo) * 100}% + 4px)` }}>
                        {eixoMoeda(m.total)}
                      </span>
                    )}
                    <div className={graf.pilha} style={{ height: `${(m.total / topo) * 100}%` }}>
                      {m.total > 0 && <span className={graf.serieFreelancer} style={{ flexGrow: 1 }} />}
                    </div>
                    <span className={graf.rotuloSemana}>{nomeMes(m.mes)}</span>
                  </div>
                ))}
              </div>
            </div>
            {dica && (
              <div className={graf.dica} style={{ left: dica.x, top: dica.y }} role="status">
                <strong>{nomeMes(dica.mes)}</strong>
                <span><i className={`${graf.amostra} ${graf.serieFreelancer}`} />Recebido<b>{formatarMoeda(dica.total)}</b></span>
                <span><i className={graf.amostraVazia} />Projetos<b>{dica.projetos}</b></span>
              </div>
            )}
          </article>

          <article className={graf.painel}>
            <header>
              <h3>Por categoria</h3>
              <p>De onde vem o que você ganhou</p>
            </header>
            {dados.categorias.length === 0 ? (
              <p className={graf.vazio}>Quando um projeto seu for concluído, ele aparece aqui.</p>
            ) : (
              <ul className={graf.barras}>
                {dados.categorias.map((c) => (
                  <li key={c.categoria} title={`${c.categoria}: ${formatarMoeda(c.total)} em ${c.projetos} ${c.projetos === 1 ? 'projeto' : 'projetos'}`}>
                    <span className={graf.nomeBarra}>{c.categoria}</span>
                    <span className={graf.trilhoBarra}>
                      <span className={graf.serieFreelancer} style={{ width: `${(c.total / maiorCategoria) * 100}%` }} />
                    </span>
                    <span className={`${graf.valorBarra} ${styles.valorBarra}`}>{eixoMoeda(c.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}

      {dados.sem_valor > 0 && (
        <p className={styles.obs}>
          <Info size={15} strokeWidth={2.2} aria-hidden="true" />
          {dados.sem_valor} {dados.sem_valor === 1 ? 'projeto por hora ficou de fora' : 'projetos por hora ficaram de fora'}: eles entram aqui quando o pagamento passa pela garantia.
        </p>
      )}

      <Link to="/freelancer/carteira" className={comum.botao} viewTransition>
        <Wallet size={16} strokeWidth={2.2} /> Ver minha carteira
      </Link>
    </div>
  )
}
