import { useEffect, useState } from 'react'
import { Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { api } from '../../services/api'
import cartao from '../gamificacao/missoes.module.css'
import graf from '../../pages/admin/MetricasAdmin.module.css'
import styles from './visitas.module.css'

interface DadosVisitas {
  disponivel: boolean
  dias: { dia: string; total: number }[]
  semana: number
  semana_passada: number
  contratantes: number
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const nomeDia = (aaaammdd: string) => DIAS_SEMANA[new Date(`${aaaammdd}T12:00:00`).getDay()]
const dataCurta = (aaaammdd: string) => aaaammdd.split('-').reverse().slice(0, 2).join('/')

/* Escala redonda para contagem: 2, 5, 10, 20... */
function topoDaEscala(maximo: number) {
  if (maximo <= 2) return 2
  const base = 10 ** Math.floor(Math.log10(maximo))
  return [1, 2, 5, 10].map((m) => m * base).find((v) => v >= maximo) ?? maximo
}

/* Quantas pessoas abriram o perfil público ou o portfólio do freelancer nos últimos 7 dias */
export default function VisitasPerfil() {
  const [dados, setDados] = useState<DadosVisitas | null>(null)
  const [dica, setDica] = useState<{ x: number; y: number; dia: string; total: number } | null>(null)

  useEffect(() => {
    let vivo = true
    api<DadosVisitas>('/usuarios/eu/visitas', { silencioso: true })
      .then((d) => vivo && setDados(d))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  /* Servidor sem a migração: o cartão não aparece */
  if (!dados?.disponivel) return null

  const topo = topoDaEscala(Math.max(...dados.dias.map((d) => d.total), 1))
  const marcas = [topo, topo / 2, 0]
  const melhor = dados.dias.reduce((m, d) => (d.total > m.total ? d : m), dados.dias[0])
  const diferenca = dados.semana - dados.semana_passada
  const Tendencia = diferenca > 0 ? TrendingUp : diferenca < 0 ? TrendingDown : Minus
  const comparacao =
    dados.semana_passada === 0
      ? dados.semana > 0
        ? 'Primeiras visitas: compartilhe seu perfil para chegar mais gente.'
        : 'Compartilhe o link do seu perfil para receber visitas.'
      : diferenca === 0
        ? 'O mesmo tanto da semana passada.'
        : `${Math.abs(diferenca)} ${Math.abs(diferenca) === 1 ? 'visita' : 'visitas'} a ${diferenca > 0 ? 'mais' : 'menos'} que na semana passada.`

  function abrir(e: React.MouseEvent | React.FocusEvent, d: DadosVisitas['dias'][number]) {
    const alvo = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const area = (e.currentTarget as HTMLElement).closest(`.${styles.grafico}`)!.getBoundingClientRect()
    setDica({ x: alvo.left - area.left + alvo.width / 2, y: alvo.top - area.top, dia: d.dia, total: d.total })
  }

  return (
    <section className={`${cartao.cartao} ${styles.cores}`} aria-labelledby="titulo-visitas">
      <header className={cartao.cabeca}>
        <h2 id="titulo-visitas"><Eye size={20} strokeWidth={2.4} /> Visitas ao perfil</h2>
        <small>últimos 7 dias</small>
      </header>

      <div className={styles.resumo}>
        <strong>{dados.semana}</strong>
        <span>
          {dados.semana === 1 ? 'pessoa viu' : 'pessoas viram'} seu perfil
          {dados.contratantes > 0 && <>, {dados.contratantes} {dados.contratantes === 1 ? 'delas era contratante' : 'delas eram contratantes'}</>}.
        </span>
      </div>
      <p className={styles.comparacao}>
        <Tendencia size={14} strokeWidth={2.4} aria-hidden="true" /> {comparacao}
      </p>

      <div className={styles.grafico} onMouseLeave={() => setDica(null)}>
        <div className={`${graf.colunasArea} ${styles.area}`}>
          <div className={graf.eixo} aria-hidden="true">
            {marcas.map((m) => <span key={m}>{m}</span>)}
          </div>
          <div className={`${graf.colunas} ${styles.seteColunas}`} role="list" aria-label="Visitas por dia">
            {marcas.map((m) => (
              <span key={m} className={graf.grade1} style={{ bottom: `${(m / topo) * 100}%` }} aria-hidden="true" />
            ))}
            {dados.dias.map((d) => (
              <div
                key={d.dia}
                className={graf.coluna}
                role="listitem"
                tabIndex={0}
                aria-label={`${nomeDia(d.dia)}, ${dataCurta(d.dia)}: ${d.total} ${d.total === 1 ? 'visita' : 'visitas'}`}
                onMouseEnter={(e) => abrir(e, d)}
                onFocus={(e) => abrir(e, d)}
                onBlur={() => setDica(null)}
              >
                {/* Rótulo direto só no dia com mais visitas */}
                {d === melhor && d.total > 0 && (
                  <span className={styles.rotuloTopo} style={{ bottom: `calc(${(d.total / topo) * 100}% + 4px)` }}>
                    {d.total}
                  </span>
                )}
                <div className={graf.pilha} style={{ height: `${(d.total / topo) * 100}%` }}>
                  {d.total > 0 && <span className={graf.serieFreelancer} style={{ flexGrow: 1 }} />}
                </div>
                <span className={graf.rotuloSemana}>{nomeDia(d.dia)}</span>
              </div>
            ))}
          </div>
        </div>
        {dica && (
          <div className={graf.dica} style={{ left: dica.x, top: dica.y }} role="status">
            <strong>{nomeDia(dica.dia)}, {dataCurta(dica.dia)}</strong>
            <span><i className={`${graf.amostra} ${graf.serieFreelancer}`} />Visitas<b>{dica.total}</b></span>
          </div>
        )}
      </div>
    </section>
  )
}
