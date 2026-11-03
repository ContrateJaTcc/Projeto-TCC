import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, FileSignature, Check, Hourglass } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { formatarData, formatarMoeda, formatarValorServico } from '../utils/formatar'
import comum from './comum.module.css'
import styles from './Acordo.module.css'

interface Pessoa {
  usu_id: number
  nome: string
  email: string
  cidade: string | null
  estado: string | null
}

interface DadosAcordo {
  disponivel: boolean
  projeto: {
    serv_id: number
    serv_titulo: string
    serv_desc: string
    categoria: string
    serv_valor: number
    serv_tipo_valor: 'hora' | 'fixo'
    serv_qtd_dias: number | null
    serv_local: 'remoto' | 'hibrido' | 'presencial'
    serv_cidade: string | null
    serv_estado: string | null
    serv_habilidades: string | null
    serv_forma_pagamento: string | null
    serv_status: string
    serv_contratado_em: string | null
    serv_garantia_valor: number | null
  }
  contratante: Pessoa
  freelancer: Pessoa
  etapas: { eta_id: number; eta_titulo: string }[]
  aceites: { contratante: string | null; freelancer: string | null }
  meu_papel: 'contratante' | 'freelancer'
}

const LOCAL: Record<string, string> = { remoto: 'remoto (à distância)', hibrido: 'híbrido', presencial: 'presencial' }

const lugar = (p: Pessoa) => [p.cidade, p.estado].filter(Boolean).join('/')

/* Termo de acordo do projeto: o combinado por escrito, com o "Li e concordo" dos dois */
export default function Acordo() {
  const { id } = useParams()
  const { role } = useRole()
  const toast = useToast()
  const [dados, setDados] = useState<DadosAcordo | null>(null)
  const [erro, setErro] = useState('')
  const [concordando, setConcordando] = useState(false)
  const [marcado, setMarcado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await api<DadosAcordo>(`/servicos/${id}/acordo`))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o acordo.')
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function concordar() {
    setConcordando(true)
    try {
      const resposta = await api<DadosAcordo & { mensagem: string }>(`/servicos/${id}/acordo`, { metodo: 'PUT' })
      setDados(resposta)
      toast.mostrar(resposta.mensagem)
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível registrar o aceite.', 'erro')
    } finally {
      setConcordando(false)
    }
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!dados) return <Carregando variante="lista" />

  const { projeto: p, contratante, freelancer, aceites } = dados
  const meuAceite = aceites[dados.meu_papel]
  const podeConcordar = dados.disponivel && !meuAceite && p.serv_status === 'em_andamento'
  const previsao = p.serv_contratado_em && p.serv_qtd_dias ? new Date(new Date(p.serv_contratado_em).getTime() + p.serv_qtd_dias * 86_400_000).toISOString() : null

  return (
    <div className={`${comum.pagina} ${comum.estreita}`}>
      <div className={styles.barra}>
        <Link to={`/${role}/historico`} className={comum.voltar} viewTransition>
          <ArrowLeft size={16} strokeWidth={2.4} /> Voltar ao histórico
        </Link>
        <button type="button" className={comum.botao} onClick={() => window.print()}>
          <Printer size={16} strokeWidth={2.2} /> Imprimir ou salvar PDF
        </button>
      </div>

      <article className={styles.folha} aria-labelledby="titulo-acordo">
        <header className={styles.cabecalho}>
          <span className={styles.marca}>ContrateJá</span>
          <h1 id="titulo-acordo">Termo de acordo</h1>
          <p>Projeto nº {p.serv_id} · {p.serv_titulo}</p>
        </header>

        <section>
          <h2>1. Quem combina</h2>
          <p>
            <strong>Contratante:</strong> {contratante.nome}
            {lugar(contratante) && `, de ${lugar(contratante)}`} ({contratante.email}).
          </p>
          <p>
            <strong>Freelancer:</strong> {freelancer.nome}
            {lugar(freelancer) && `, de ${lugar(freelancer)}`} ({freelancer.email}).
          </p>
        </section>

        <section>
          <h2>2. O trabalho</h2>
          <p>
            <strong>{p.serv_titulo}</strong> ({p.categoria}). {p.serv_desc}
          </p>
          {p.serv_habilidades && <p>Habilidades combinadas: {p.serv_habilidades}.</p>}
          <p>
            Formato: {LOCAL[p.serv_local] ?? p.serv_local}
            {p.serv_local !== 'remoto' && p.serv_cidade ? `, em ${p.serv_cidade}${p.serv_estado ? `/${p.serv_estado}` : ''}` : ''}.
          </p>
          {dados.etapas.length > 0 && (
            <>
              <p>O trabalho é dividido nestas etapas:</p>
              <ol>
                {dados.etapas.map((e) => <li key={e.eta_id}>{e.eta_titulo}</li>)}
              </ol>
            </>
          )}
        </section>

        <section>
          <h2>3. Valor e pagamento</h2>
          <p>
            Valor combinado: <strong>{formatarValorServico(p.serv_valor, p.serv_tipo_valor)}</strong>
            {p.serv_forma_pagamento ? `, pago por ${p.serv_forma_pagamento}` : ''}.
          </p>
          <p>
            {p.serv_garantia_valor !== null
              ? `O contratante guardou ${formatarMoeda(p.serv_garantia_valor)} na garantia da plataforma. O valor vai para o freelancer quando o projeto for finalizado.`
              : 'O contratante pode guardar o pagamento na garantia da plataforma: o valor só vai para o freelancer quando o projeto for finalizado.'}{' '}
            <em className={styles.aviso}>No TCC o pagamento é uma simulação: nenhum dinheiro de verdade é cobrado.</em>
          </p>
        </section>

        <section>
          <h2>4. Prazo</h2>
          <p>
            {p.serv_qtd_dias
              ? `${p.serv_qtd_dias} ${p.serv_qtd_dias === 1 ? 'dia' : 'dias'} a partir da contratação${p.serv_contratado_em ? ` (${formatarData(p.serv_contratado_em)})` : ''}${previsao ? `, com entrega prevista para ${formatarData(previsao)}` : ''}.`
              : 'Sem prazo fixo: combinado entre as partes pelo chat.'}{' '}
            A plataforma avisa os dois quando o prazo estiver chegando ou vencer.
          </p>
        </section>

        <section>
          <h2>5. Entrega, ajustes e conclusão</h2>
          <p>
            O freelancer marca o trabalho como entregue. O contratante confere e finaliza o projeto, ou pede ajustes: são até 3
            pedidos de ajuste por projeto. Com o projeto finalizado, os dois podem se avaliar.
          </p>
        </section>

        <section>
          <h2>6. Se algo der errado</h2>
          <p>
            Os dois tentam resolver pelo chat primeiro. Se não der, qualquer um abre uma disputa no histórico e a administração do
            ContrateJá decide: finalizar o projeto, cancelar e devolver o pagamento guardado, ou encerrar com uma orientação. Valem
            também os <Link to="/termos">Termos e condições</Link> da plataforma.
          </p>
        </section>

        <section className={styles.aceites} aria-label="Quem já concordou">
          {([['contratante', contratante], ['freelancer', freelancer]] as const).map(([papel, pessoa]) => {
            const quando = aceites[papel]
            return (
              <div key={papel} className={quando ? styles.assinado : styles.aguardando}>
                <span className={styles.papel}>{papel === 'contratante' ? 'Contratante' : 'Freelancer'}</span>
                <strong>{pessoa.nome}</strong>
                <span className={styles.situacao}>
                  {quando ? <Check size={15} strokeWidth={3} /> : <Hourglass size={15} strokeWidth={2.4} />}
                  {quando ? `Concordou em ${new Date(quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Ainda não concordou'}
                </span>
              </div>
            )
          })}
        </section>

        {podeConcordar && (
          <div className={styles.concordar}>
            <label className={styles.marcar}>
              <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} />
              Li o termo inteiro e concordo com o que está escrito.
            </label>
            <button type="button" className={comum.botaoOuro} onClick={concordar} disabled={!marcado || concordando}>
              {concordando ? <span className="spinner" /> : <FileSignature size={16} strokeWidth={2.2} />} Li e concordo
            </button>
          </div>
        )}

        {!dados.disponivel && (
          <p className={styles.aviso}>O aceite do termo ainda está sendo preparado no servidor. O texto acima já vale como resumo do combinado.</p>
        )}

        <footer className={styles.rodape}>ContrateJá · termo gerado a partir dos dados do projeto · {new Date().toLocaleDateString('pt-BR')}</footer>
      </article>
    </div>
  )
}
