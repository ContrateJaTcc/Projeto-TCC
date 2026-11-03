import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, ShieldCheck, Plus, ArrowDownLeft, ArrowUpRight, Undo2, Coins, CircleAlert, Gift, ListChecks, FileSpreadsheet } from 'lucide-react'
import { baixarCsv, dataCsv } from '../utils/csv'
import { api, ErroApi } from '../services/api'
import { useRole } from '../context/useRole'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import Ilustracao from '../components/ilustracao/ilustracao'
import { formatarMoeda, formatarData } from '../utils/formatar'
import comum from './comum.module.css'
import styles from './Carteira.module.css'

interface Movimento {
  mov_id: number
  serv_id: number | null
  serv_titulo: string | null
  mov_tipo: 'credito' | 'garantia' | 'recebido' | 'estorno' | 'etapa' | 'bonus'
  mov_valor: number
  mov_desc: string | null
  mov_data: string
}

interface DadosCarteira {
  disponivel: boolean
  saldo: number
  garantido: number
  guardados?: { serv_id: number; serv_titulo: string; valor: number }[]
  movimentos: Movimento[]
}

const ICONE = { credito: Coins, garantia: ShieldCheck, recebido: ArrowDownLeft, estorno: Undo2, etapa: ListChecks, bonus: Gift }
const ROTULO = { credito: 'Saldo fictício', garantia: 'Guardado na garantia', recebido: 'Pagamento recebido', estorno: 'Devolvido', etapa: 'Etapa paga', bonus: 'Bônus' }

/* Carteira fictícia: saldo da simulação de pagamento e o extrato */
export default function Carteira() {
  const { role } = useRole()
  const toast = useToast()
  const ehContratante = role === 'contratante'
  const [dados, setDados] = useState<DadosCarteira | null>(null)
  const [erro, setErro] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await api<DadosCarteira>('/carteira'))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível abrir a carteira.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function adicionar() {
    setAdicionando(true)
    try {
      const r = await api<{ mensagem: string }>('/carteira/credito', { metodo: 'POST' })
      toast.mostrar(r.mensagem)
      await carregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível adicionar saldo.', 'erro')
    } finally {
      setAdicionando(false)
    }
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!dados) return <Carregando variante="lista" />

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Carteira</h1>
      <p className={`${comum.subtitulo} placa`}>
        {ehContratante
          ? 'Guarde o pagamento de cada projeto na garantia: ele só vai para o freelancer quando você finalizar.'
          : 'Os pagamentos guardados pelos contratantes caem aqui quando o projeto é finalizado.'}
      </p>

      <p className={styles.faixa} role="note">
        <CircleAlert size={17} strokeWidth={2.2} aria-hidden="true" />
        <span>
          <strong>Simulação para o TCC.</strong> Nenhum dinheiro de verdade entra ou sai: os valores servem para mostrar como o
          pagamento com garantia funcionaria.
        </span>
      </p>

      {!dados.disponivel ? (
        <div className={comum.vazio}>
          <Ilustracao tipo="coruja" />
          <strong>A carteira está sendo preparada</strong>
          <p>Assim que o servidor for atualizado, o saldo e o extrato aparecem aqui.</p>
        </div>
      ) : (
        <>
          <div className={styles.numeros}>
            <section className={`${comum.painel} ${styles.saldo}`}>
              <span className={styles.rotulo}><Wallet size={16} strokeWidth={2.2} /> Saldo {ehContratante ? 'disponível' : ''}</span>
              <strong className={styles.valorGrande}>{formatarMoeda(dados.saldo)}</strong>
              {ehContratante && (
                <button type="button" className={comum.botaoOuro} onClick={adicionar} disabled={adicionando}>
                  {adicionando ? <span className="spinner" /> : <Plus size={16} strokeWidth={2.4} />} Adicionar R$ 1.000 fictícios
                </button>
              )}
            </section>
            <section className={`${comum.painel} ${styles.saldo}`}>
              <span className={styles.rotulo}><ShieldCheck size={16} strokeWidth={2.2} /> {ehContratante ? 'Guardado nos projetos' : 'Esperando a finalização'}</span>
              <strong className={styles.valorGrande}>{formatarMoeda(dados.garantido)}</strong>
              {(dados.guardados ?? []).length > 0 ? (
                <ul className={styles.guardados}>
                  {(dados.guardados ?? []).map((g) => (
                    <li key={g.serv_id}>
                      <span>{g.serv_titulo}</span>
                      <b>{formatarMoeda(g.valor)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className={comum.nota}>Nada guardado agora.</span>
              )}
            </section>
          </div>

          <section className={comum.painel}>
            <h2>Extrato</h2>
            {dados.movimentos.length === 0 ? (
              <p className={comum.nota}>
                Nenhum movimento ainda.{' '}
                {ehContratante ? 'Quando contratar alguém, guarde o pagamento pelo histórico.' : 'Quando um projeto seu for finalizado, o pagamento aparece aqui.'}
              </p>
            ) : (
              <ul className={styles.extrato}>
                {dados.movimentos.map((m) => {
                  const Icone = ICONE[m.mov_tipo] ?? ArrowUpRight
                  const entrada = m.mov_valor >= 0
                  return (
                    <li key={m.mov_id}>
                      <span className={`${styles.icone} ${entrada ? styles.entrada : styles.saida}`}><Icone size={16} strokeWidth={2.4} /></span>
                      <div className={styles.descricao}>
                        <strong>{ROTULO[m.mov_tipo] ?? m.mov_tipo}</strong>
                        <span>{m.mov_desc ?? m.serv_titulo ?? ''} · {formatarData(m.mov_data)}</span>
                      </div>
                      <b className={entrada ? styles.positivo : styles.negativo}>
                        {entrada ? '+' : '−'} {formatarMoeda(Math.abs(m.mov_valor))}
                      </b>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className={styles.rodapeExtrato}>
              <Link to={`/${role}/historico`} className={comum.botao} viewTransition>Ver projetos no histórico</Link>
              {dados.movimentos.length > 0 && (
                <button
                  type="button"
                  className={comum.botao}
                  onClick={() =>
                    baixarCsv(
                      'extrato-contrateja',
                      ['Data', 'Tipo', 'Descrição', 'Projeto', 'Valor (R$)'],
                      dados.movimentos.map((m) => [dataCsv(m.mov_data), ROTULO[m.mov_tipo] ?? m.mov_tipo, m.mov_desc, m.serv_titulo, m.mov_valor])
                    )
                  }
                >
                  <FileSpreadsheet size={16} strokeWidth={2.2} /> Baixar extrato (planilha)
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
