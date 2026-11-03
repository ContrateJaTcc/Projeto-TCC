import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { formatarData, formatarMoeda, formatarValorServico } from '../utils/formatar'
import comum from './comum.module.css'
import folha from './Acordo.module.css'
import styles from './Recibo.module.css'

interface Pessoa {
  usu_id: number
  nome: string
  email: string
  cidade: string | null
  estado: string | null
}

interface DadosRecibo {
  recibo: {
    numero: string
    codigo: string
    projeto: { serv_id: number; serv_titulo: string; categoria: string; serv_valor: number; serv_tipo_valor: 'hora' | 'fixo'; serv_forma_pagamento: string | null }
    contratante: Pessoa
    freelancer: Pessoa
    contratado_em: string | null
    entregue_em: string | null
    finalizado_em: string | null
    etapas: { eta_id: number; eta_titulo: string; eta_concluida_em: string | null }[]
    pagamentos: { mov_tipo: string; mov_valor: number; mov_desc: string; mov_data: string }[]
    total_pago: number
    bonus: number | null
  }
  meu_papel: 'contratante' | 'freelancer'
}

const TIPO: Record<string, string> = { recebido: 'Pagamento final', etapa: 'Etapa aprovada', bonus: 'Bônus' }

const lugar = (p: Pessoa) => [p.cidade, p.estado].filter(Boolean).join('/')

/* Recibo do projeto concluído: quem, quando e tudo o que passou pela carteira fictícia (dá para salvar em PDF) */
export default function Recibo() {
  const { id } = useParams()
  const { role } = useRole()
  const [dados, setDados] = useState<DadosRecibo | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      setDados(await api<DadosRecibo>(`/servicos/${id}/recibo`))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível montar o recibo.')
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!dados) return <Carregando variante="lista" />

  const r = dados.recibo
  const p = r.projeto

  return (
    <div className={`${comum.pagina} ${comum.estreita}`}>
      <div className={folha.barra}>
        <Link to={`/${role}/historico`} className={comum.voltar} viewTransition>
          <ArrowLeft size={16} strokeWidth={2.4} /> Voltar ao histórico
        </Link>
        <button type="button" className={comum.botao} onClick={() => window.print()}>
          <Printer size={16} strokeWidth={2.2} /> Imprimir ou salvar PDF
        </button>
      </div>

      <article className={folha.folha} aria-labelledby="titulo-recibo">
        <header className={folha.cabecalho}>
          <span className={folha.marca}>ContrateJá</span>
          <h1 id="titulo-recibo">Recibo do projeto</h1>
          <p>
            Nº {r.numero} · {p.serv_titulo}
          </p>
        </header>

        <section>
          <h2>Partes</h2>
          <dl className={styles.partes}>
            <div>
              <dt>Contratante</dt>
              <dd>
                {r.contratante.nome}
                {lugar(r.contratante) && <small>{lugar(r.contratante)}</small>}
              </dd>
            </div>
            <div>
              <dt>Freelancer</dt>
              <dd>
                {r.freelancer.nome}
                {lugar(r.freelancer) && <small>{lugar(r.freelancer)}</small>}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>Projeto</h2>
          <p>
            <strong>{p.serv_titulo}</strong> ({p.categoria}). Valor combinado: {formatarValorServico(p.serv_valor, p.serv_tipo_valor)}
            {p.serv_forma_pagamento ? `, por ${p.serv_forma_pagamento}` : ''}.
          </p>
          <ul className={styles.datas}>
            {r.contratado_em && <li>Contratado em {formatarData(r.contratado_em)}</li>}
            {r.entregue_em && <li>Entregue em {formatarData(r.entregue_em)}</li>}
            {r.finalizado_em && <li>Concluído em {formatarData(r.finalizado_em)}</li>}
          </ul>
          {r.etapas.length > 0 && <p>Etapas entregues: {r.etapas.map((e) => e.eta_titulo).join(', ')}.</p>}
        </section>

        <section>
          <h2>Pagamentos ao freelancer</h2>
          {r.pagamentos.length === 0 ? (
            <p>Nenhum pagamento passou pela carteira do site (o valor foi combinado direto entre as partes).</p>
          ) : (
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Descrição</th>
                  <th scope="col" className={styles.valor}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.pagamentos.map((m, i) => (
                  <tr key={i}>
                    <td>{formatarData(m.mov_data)}</td>
                    <td>
                      <span className={styles.tipo}>{TIPO[m.mov_tipo] ?? m.mov_tipo}</span> {m.mov_desc}
                    </td>
                    <td className={styles.valor}>{formatarMoeda(m.mov_valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2}>Total recebido</th>
                  <td className={styles.valor}>{formatarMoeda(r.total_pago)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <footer className={folha.rodape}>
          Código de conferência: <strong>{r.codigo}</strong>. Documento gerado pelo ContrateJá em {formatarData(new Date().toISOString())}.
          <br />
          Simulação para o TCC: nenhum dinheiro de verdade foi movimentado e este recibo não tem valor fiscal.
        </footer>
      </article>
    </div>
  )
}
