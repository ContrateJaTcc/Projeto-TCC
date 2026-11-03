import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Check, X, Clock, ArrowLeft, Send } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { formatarData } from '../utils/formatar'
import { comemorar } from '../utils/preferencias'
import comum from './comum.module.css'
import styles from './Testes.module.css'

interface Teste {
  tipo_id: number
  nome: string
  perguntas: number
  aprovado_em: string | null
  ultima_em: string | null
  acertos: number | null
  pode_refazer_em: string | null
}

interface Lista {
  disponivel: boolean
  para_passar: number
  xp: number
  testes: Teste[]
}

interface Prova {
  tipo_id: number
  nome: string
  para_passar: number
  perguntas: { enunciado: string; opcoes: string[] }[]
}

interface Resultado {
  acertos: number
  total: number
  aprovado: boolean
  gabarito: number[] | null
  mensagem: string
}

const LETRAS = ['A', 'B', 'C', 'D', 'E']

/* "daqui a 5 h" */
function quando(iso: string) {
  const horas = Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000))
  return `daqui a ${horas} h`
}

/* Testes de habilidade: 5 perguntas por área; quem passa ganha o selo "Testado em ..." no perfil */
export default function Testes() {
  const toast = useToast()
  const [lista, setLista] = useState<Lista | null>(null)
  const [erro, setErro] = useState('')
  const [prova, setProva] = useState<Prova | null>(null)
  const [respostas, setRespostas] = useState<(number | null)[]>([])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [abrindo, setAbrindo] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    try {
      setLista(await api<Lista>('/testes'))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os testes.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function abrir(t: Teste) {
    setAbrindo(t.tipo_id)
    try {
      const p = await api<Prova>(`/testes/${t.tipo_id}`)
      setProva(p)
      setRespostas(p.perguntas.map(() => null))
      setResultado(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível abrir o teste.', 'erro')
    } finally {
      setAbrindo(null)
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!prova || respostas.some((r) => r === null)) return
    setEnviando(true)
    try {
      const r = await api<Resultado>(`/testes/${prova.tipo_id}`, { metodo: 'POST', corpo: { respostas } })
      setResultado(r)
      toast.mostrar(r.mensagem, r.aprovado ? 'sucesso' : 'info')
      if (r.aprovado) comemorar()
      carregar()
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível corrigir o teste.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!lista) return <Carregando variante="lista" />

  /* ---------- Fazendo o teste ---------- */
  if (prova) {
    const respondidas = respostas.filter((r) => r !== null).length
    return (
      <div className={`${comum.pagina} ${comum.estreita}`}>
        <button type="button" className={comum.voltar} onClick={() => setProva(null)}>
          <ArrowLeft size={16} strokeWidth={2.4} /> Voltar aos testes
        </button>
        <h1 className="placa">Teste de {prova.nome}</h1>
        <p className={`${comum.subtitulo} placa`}>
          {prova.perguntas.length} perguntas. Acertando {prova.para_passar}, você ganha o selo da área e +{lista.xp} XP. Se não passar, dá para tentar
          de novo em 24 horas.
        </p>

        <form className={styles.prova} onSubmit={enviar}>
          {prova.perguntas.map((p, i) => {
            const certa = resultado?.gabarito?.[i]
            return (
              <fieldset key={i} className={`${comum.painel} ${styles.pergunta}`} disabled={Boolean(resultado)}>
                <legend className={styles.enunciado}>
                  <span className={styles.numero}>{i + 1}</span> {p.enunciado}
                </legend>
                <div className={styles.opcoes}>
                  {p.opcoes.map((o, j) => {
                    const marcada = respostas[i] === j
                    const estado = certa === undefined ? '' : j === certa ? styles.certa : marcada ? styles.errada : ''
                    return (
                      <label key={j} className={`${styles.opcao} ${marcada ? styles.marcada : ''} ${estado}`}>
                        <input
                          type="radio"
                          name={`pergunta-${i}`}
                          checked={marcada}
                          onChange={() => setRespostas((atual) => atual.map((r, k) => (k === i ? j : r)))}
                        />
                        <span className={styles.letra} aria-hidden="true">{LETRAS[j]}</span>
                        <span>{o}</span>
                        {certa !== undefined && j === certa && <Check size={16} strokeWidth={2.6} aria-label="resposta certa" />}
                        {certa !== undefined && marcada && j !== certa && <X size={16} strokeWidth={2.6} aria-label="sua resposta" />}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}

          {resultado ? (
            <div className={`${comum.painel} ${resultado.aprovado ? styles.aprovado : styles.reprovado}`} role="status">
              <strong className={styles.placar}>
                {resultado.acertos} de {resultado.total}
              </strong>
              <p>{resultado.mensagem}</p>
              <button type="button" className={comum.botao} onClick={() => setProva(null)}>
                <ArrowLeft size={15} strokeWidth={2.4} /> Voltar aos testes
              </button>
            </div>
          ) : (
            <div className={styles.rodape}>
              <span className={comum.nota}>{respondidas} de {prova.perguntas.length} respondidas</span>
              <button type="submit" className={comum.botaoOuro} disabled={enviando || respondidas < prova.perguntas.length}>
                {enviando ? <span className="spinner" /> : <Send size={15} strokeWidth={2.4} />} Entregar respostas
              </button>
            </div>
          )}
        </form>
      </div>
    )
  }

  /* ---------- Lista das áreas ---------- */
  return (
    <div className={comum.pagina}>
      <h1 className="placa">Testes de habilidade</h1>
      <p className={`${comum.subtitulo} placa`}>
        Mostre que você sabe: cada teste tem 5 perguntas rápidas. Quem acerta {lista.para_passar} ganha o selo "Testado em ..." no perfil, na busca
        de freelancers e no perfil público, mais {lista.xp} XP.
      </p>

      {!lista.disponivel && (
        <div className={comum.vazio}>
          <GraduationCap size={28} strokeWidth={2} />
          <strong>Os testes estão sendo preparados</strong>
          <p>Assim que o servidor for atualizado, eles aparecem aqui.</p>
        </div>
      )}

      {lista.disponivel && (
        <ul className={styles.grade}>
          {lista.testes.map((t) => (
            <li key={t.tipo_id} className={`${styles.cartao} ${t.aprovado_em ? styles.feito : ''}`}>
              <span className={styles.icone} aria-hidden="true">
                <GraduationCap size={24} strokeWidth={2.2} />
              </span>
              <strong>{t.nome}</strong>
              <span className={comum.nota}>{t.perguntas} perguntas · passa com {lista.para_passar}</span>
              {t.aprovado_em ? (
                <span className={styles.selo}>
                  <Check size={14} strokeWidth={2.6} /> Aprovado em {formatarData(t.aprovado_em)}
                </span>
              ) : t.pode_refazer_em ? (
                <span className={styles.espera}>
                  <Clock size={14} strokeWidth={2.4} /> {t.acertos} de {t.perguntas} da última vez. Nova tentativa {quando(t.pode_refazer_em)}.
                </span>
              ) : (
                <button type="button" className={comum.botaoOuro} onClick={() => abrir(t)} disabled={abrindo === t.tipo_id}>
                  {abrindo === t.tipo_id ? <span className="spinner" /> : <GraduationCap size={15} strokeWidth={2.4} />}
                  {t.ultima_em ? 'Tentar de novo' : 'Fazer o teste'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
