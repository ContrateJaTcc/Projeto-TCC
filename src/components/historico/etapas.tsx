import { useState } from 'react'
import { Check, Coins, ListChecks, Plus, Trash2 } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarData, formatarMoeda } from '../../utils/formatar'
import styles from './historico.module.css'

export interface Etapa {
  eta_id: number
  eta_titulo: string
  eta_ordem: number
  eta_concluida_em: string | null
  /* Pagamento por etapa (servidor antigo não manda) */
  eta_liberado_valor?: number | null
  eta_liberada_em?: string | null
}

interface EtapasProps {
  servId: number
  etapas: Etapa[]
  /* Contratante com o projeto em andamento: cria e remove */
  podeEditar: boolean
  /* Freelancer contratado com o projeto em andamento: marca como feita */
  podeMarcar: boolean
  /* Valor guardado na garantia (null = não guardado): com ele, o contratante paga etapa por etapa */
  garantia?: number | null
  /* Contratante com garantia ativa e projeto em andamento: aprova e paga etapas feitas */
  podePagar?: boolean
  /* Depois de pagar: o histórico recarrega (o valor guardado mudou) */
  aoPagar?: () => void
}

const LIMITE = 10

/* Etapas do projeto com a barra de progresso */
export default function Etapas({ servId, etapas: iniciais, podeEditar, podeMarcar, garantia = null, podePagar = false, aoPagar }: EtapasProps) {
  const toast = useToast()
  const [etapas, setEtapas] = useState(iniciais)
  const [nova, setNova] = useState('')
  const [ocupado, setOcupado] = useState<number | 'nova' | null>(null)

  /* Quem só olha e não há etapas: nada a mostrar */
  if (etapas.length === 0 && !podeEditar) return null

  const feitas = etapas.filter((e) => e.eta_concluida_em).length
  const porcento = etapas.length ? Math.round((feitas / etapas.length) * 100) : 0

  /* Parte de cada etapa: o que ainda está guardado dividido pelas etapas que faltam pagar (igual ao servidor) */
  const pagoEmEtapas = etapas.reduce((t, e) => t + (e.eta_liberado_valor ?? 0), 0)
  const faltamPagar = etapas.filter((e) => !e.eta_liberada_em).length
  const restante = garantia === null ? 0 : Math.max(0, Math.round((garantia - pagoEmEtapas) * 100) / 100)
  const parte = faltamPagar ? (faltamPagar === 1 ? restante : Math.round((restante / faltamPagar) * 100) / 100) : 0

  async function chamar(alvo: number | 'nova', caminho: string, metodo: 'POST' | 'PUT' | 'DELETE', corpo?: object) {
    setOcupado(alvo)
    try {
      const dados = await api<{ mensagem: string; etapas: Etapa[] }>(caminho, { metodo, corpo })
      setEtapas(dados.etapas)
      if (caminho.endsWith('/aprovar')) {
        toast.mostrar(dados.mensagem, 'sucesso')
        aoPagar?.()
      }
      return true
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível atualizar as etapas.', 'erro')
      return false
    } finally {
      setOcupado(null)
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    const titulo = nova.trim()
    if (!titulo) return
    if (await chamar('nova', `/servicos/${servId}/etapas`, 'POST', { titulo })) setNova('')
  }

  return (
    <section className={styles.etapas} aria-label="Etapas do projeto">
      <div className={styles.etapasTopo}>
        <span className={styles.etapasTitulo}>
          <ListChecks size={15} strokeWidth={2.2} />
          Etapas
        </span>
        {etapas.length > 0 && (
          <span className={styles.etapasConta}>
            {feitas} de {etapas.length} · {porcento}%
          </span>
        )}
      </div>

      {garantia !== null && etapas.length > 0 && (podePagar || pagoEmEtapas > 0) && (
        <p className={styles.etapasPagamento}>
          <Coins size={14} strokeWidth={2.2} aria-hidden="true" />
          {podePagar
            ? `Pagamento por etapa: aprove cada etapa feita e ${formatarMoeda(parte)} da garantia vão na hora para o freelancer.`
            : `${formatarMoeda(pagoEmEtapas)} já pagos por etapa; o resto sai quando o projeto for finalizado.`}
        </p>
      )}

      {etapas.length > 0 && (
        <div
          className={styles.barra}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcento}
          aria-label={`${feitas} de ${etapas.length} etapas feitas`}
        >
          <span style={{ width: `${porcento}%` }} />
        </div>
      )}

      {etapas.length > 0 && (
        <ul className={styles.listaEtapas}>
          {etapas.map((etapa) => {
            const feita = Boolean(etapa.eta_concluida_em)
            return (
              <li key={etapa.eta_id} className={feita ? styles.etapaFeita : ''}>
                {podeMarcar ? (
                  <button
                    type="button"
                    className={styles.caixa}
                    role="checkbox"
                    aria-checked={feita}
                    aria-label={`${etapa.eta_titulo}: ${feita ? 'feita' : 'marcar como feita'}`}
                    disabled={ocupado === etapa.eta_id}
                    onClick={() => chamar(etapa.eta_id, `/servicos/${servId}/etapas/${etapa.eta_id}`, 'PUT')}
                  >
                    {feita && <Check size={13} strokeWidth={3} />}
                  </button>
                ) : (
                  <span className={styles.caixa} aria-hidden="true">
                    {feita && <Check size={13} strokeWidth={3} />}
                  </span>
                )}
                <span className={styles.nomeEtapa}>{etapa.eta_titulo}</span>
                {feita && <span className={styles.quandoEtapa}>{formatarData(etapa.eta_concluida_em)}</span>}
                {etapa.eta_liberada_em ? (
                  <span className={styles.etapaPaga} title={`Paga em ${formatarData(etapa.eta_liberada_em)}`}>
                    <Coins size={12} strokeWidth={2.4} aria-hidden="true" /> {formatarMoeda(etapa.eta_liberado_valor ?? 0)} pago
                  </span>
                ) : (
                  podePagar &&
                  feita &&
                  parte > 0 && (
                    <button
                      type="button"
                      className={styles.pagarEtapa}
                      disabled={ocupado === etapa.eta_id}
                      onClick={() => chamar(etapa.eta_id, `/servicos/${servId}/etapas/${etapa.eta_id}/aprovar`, 'POST')}
                    >
                      {ocupado === etapa.eta_id ? <span className="spinner" /> : <Coins size={13} strokeWidth={2.4} />} Aprovar e pagar {formatarMoeda(parte)}
                    </button>
                  )
                )}
                {podeEditar && !etapa.eta_liberada_em && (
                  <button
                    type="button"
                    className={styles.removerEtapa}
                    aria-label={`Remover a etapa ${etapa.eta_titulo}`}
                    disabled={ocupado === etapa.eta_id}
                    onClick={() => chamar(etapa.eta_id, `/servicos/${servId}/etapas/${etapa.eta_id}`, 'DELETE')}
                  >
                    <Trash2 size={14} strokeWidth={2.2} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {podeEditar && etapas.length < LIMITE && (
        <form className={styles.novaEtapa} onSubmit={criar}>
          <input
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            maxLength={100}
            placeholder={etapas.length ? 'Nova etapa' : 'Divida o trabalho: ex. "Rascunho", "Revisão", "Final"'}
            aria-label="Nome da nova etapa"
          />
          <button type="submit" disabled={!nova.trim() || ocupado === 'nova'}>
            <Plus size={15} strokeWidth={2.4} />
            Adicionar
          </button>
        </form>
      )}
    </section>
  )
}
