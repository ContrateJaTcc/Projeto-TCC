import { useCallback, useEffect, useState } from 'react'
import { Timer, Play, Square, Check, X, ListChecks, Trash2, History, Repeat, ExternalLink, Plus } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarData, formatarMoeda } from '../../utils/formatar'
import styles from './trabalho.module.css'

/*
 * Painéis do trabalho em andamento no histórico: horas (projetos por hora), critérios de aceite,
 * versões da entrega e, depois de concluído, repetir o projeto todo mês.
 */

type Papel = 'freelancer' | 'contratante'

const horasTexto = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

/* Devolve [dados, recarregar] de uma rota do projeto (null enquanto carrega; undefined se o servidor não tem) */
function useDoProjeto<T extends { disponivel?: boolean }>(caminho: string) {
  const [dados, setDados] = useState<T | null | undefined>(null)
  const carregar = useCallback(() => {
    api<T>(caminho, { silencioso: true })
      .then((d) => setDados(d.disponivel === false ? undefined : d))
      .catch(() => setDados(undefined))
  }, [caminho])
  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])
  return [dados, carregar] as const
}

/* ---------- Horas trabalhadas ---------- */

interface Registro {
  hor_id: number
  hor_inicio: string
  hor_minutos: number | null
  hor_desc: string | null
  hor_status: 'rodando' | 'pendente' | 'aprovada' | 'recusada'
}

interface Horas {
  disponivel?: boolean
  por_hora: boolean
  registros: Registro[]
  minutos_aprovados: number
  minutos_pendentes: number
  valor_aprovado: number
  rodando: Registro | null
}

const ROTULO_STATUS = { rodando: 'rodando', pendente: 'esperando aprovação', aprovada: 'aprovada', recusada: 'recusada' }

export function HorasTrabalhadas({ servId, papel, emAndamento }: { servId: number; papel: Papel; emAndamento: boolean }) {
  const toast = useToast()
  const [dados, recarregar] = useDoProjeto<Horas>(`/servicos/${servId}/horas`)
  const [manual, setManual] = useState(false)
  const [minutos, setMinutos] = useState('60')
  const [desc, setDesc] = useState('')

  if (!dados || !dados.por_hora) return null

  async function enviar(corpo: object, caminho = `/servicos/${servId}/horas`, metodo: 'POST' | 'PUT' = 'POST') {
    try {
      const r = await api<{ mensagem: string }>(caminho, { metodo, corpo })
      toast.mostrar(r.mensagem, 'sucesso')
      setManual(false)
      setDesc('')
      recarregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar as horas.', 'erro')
    }
  }

  const free = papel === 'freelancer'

  return (
    <section className={styles.painel} aria-label="Horas trabalhadas">
      <h3><Timer size={16} strokeWidth={2.4} aria-hidden="true" /> Horas trabalhadas</h3>
      <p className={styles.resumo}>
        <strong>{horasTexto(dados.minutos_aprovados)}</strong> aprovadas ({formatarMoeda(dados.valor_aprovado)})
        {dados.minutos_pendentes > 0 && <> · {horasTexto(dados.minutos_pendentes)} esperando aprovação</>}
      </p>

      {free && emAndamento && (
        <div className={styles.acoes}>
          {dados.rodando ? (
            <button type="button" className={styles.botaoForte} onClick={() => enviar({ acao: 'parar' })}>
              <Square size={14} strokeWidth={2.6} /> Parar o cronômetro
            </button>
          ) : (
            <button type="button" className={styles.botaoForte} onClick={() => enviar({ acao: 'iniciar' })}>
              <Play size={14} strokeWidth={2.6} /> Começar a contar
            </button>
          )}
          <button type="button" className={styles.botao} onClick={() => setManual((v) => !v)} aria-expanded={manual}>
            <Plus size={14} strokeWidth={2.6} /> Lançar horas à mão
          </button>
          {dados.rodando && <span className={styles.rodando} role="status">Contando desde {new Date(dados.rodando.hor_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      )}

      {manual && (
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); enviar({ acao: 'manual', minutos: Number(minutos), desc }) }}>
          <label>
            Minutos
            <input inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </label>
          <label className={styles.cresce}>
            O que foi feito
            <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} placeholder="Ex.: Ajustei o layout da página de contato" />
          </label>
          <button type="submit" className={styles.botaoForte} disabled={!desc.trim() || Number(minutos) < 5}>Lançar</button>
        </form>
      )}

      {dados.registros.length > 0 && (
        <ul className={styles.lista}>
          {dados.registros.filter((r) => r.hor_status !== 'rodando').slice(0, 8).map((r) => (
            <li key={r.hor_id} className={styles[r.hor_status]}>
              <span>
                <strong>{r.hor_minutos ? horasTexto(r.hor_minutos) : '—'}</strong> · {formatarData(r.hor_inicio)}
                {r.hor_desc && <> · {r.hor_desc}</>}
              </span>
              <span className={styles.status}>{ROTULO_STATUS[r.hor_status]}</span>
              {!free && r.hor_status === 'pendente' && (
                <span className={styles.acoes}>
                  <button type="button" className={styles.botao} onClick={() => enviar({ acao: 'aprovar' }, `/servicos/${servId}/horas/${r.hor_id}`, 'PUT')} aria-label={`Aprovar ${r.hor_minutos} minutos`}>
                    <Check size={14} strokeWidth={2.6} /> Aprovar
                  </button>
                  <button type="button" className={styles.botao} onClick={() => enviar({ acao: 'recusar' }, `/servicos/${servId}/horas/${r.hor_id}`, 'PUT')} aria-label={`Recusar ${r.hor_minutos} minutos`}>
                    <X size={14} strokeWidth={2.6} /> Recusar
                  </button>
                </span>
              )}
              {free && r.hor_status === 'pendente' && (
                <button type="button" className={styles.icone} onClick={() => enviar({ acao: 'apagar' }, `/servicos/${servId}/horas/${r.hor_id}`, 'PUT')} aria-label="Apagar este registro">
                  <Trash2 size={14} strokeWidth={2.4} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ---------- Critérios de aceite ---------- */

interface Criterio {
  cri_id: number
  cri_texto: string
  cri_entregue_em: string | null
  cri_aprovado_em: string | null
}

export function CriteriosAceite({ servId, papel, emAndamento }: { servId: number; papel: Papel; emAndamento: boolean }) {
  const toast = useToast()
  const [dados, recarregar] = useDoProjeto<{ disponivel?: boolean; criterios: Criterio[] }>(`/servicos/${servId}/criterios`)
  const [novo, setNovo] = useState('')

  if (!dados) return null
  const contratante = papel === 'contratante'
  if (!dados.criterios.length && !(contratante && emAndamento)) return null

  async function mudar(caminho: string, corpo: object, metodo: 'POST' | 'PUT') {
    try {
      await api(caminho, { metodo, corpo })
      setNovo('')
      recarregar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível atualizar o critério.', 'erro')
    }
  }

  const aprovados = dados.criterios.filter((c) => c.cri_aprovado_em).length

  return (
    <section className={styles.painel} aria-label="Critérios de aceite">
      <h3><ListChecks size={16} strokeWidth={2.4} aria-hidden="true" /> Critérios de aceite</h3>
      <p className={styles.resumo}>
        {dados.criterios.length
          ? `${aprovados} de ${dados.criterios.length} aprovados. ${contratante ? 'Aprove cada item quando ele chegar como combinado.' : 'Marque cada item quando entregar.'}`
          : 'Liste o que precisa vir na entrega (ex.: "Logo em PNG e SVG"). O freelancer marca e você aprova item por item.'}
      </p>
      <ul className={styles.criterios}>
        {dados.criterios.map((c) => {
          const estado = c.cri_aprovado_em ? 'aprovado' : c.cri_entregue_em ? 'entregue' : 'falta'
          const rota = `/servicos/${servId}/criterios/${c.cri_id}`
          return (
            <li key={c.cri_id} className={styles[estado]}>
              {contratante ? (
                <span className={styles.marca} aria-hidden="true">{estado === 'aprovado' ? '✔' : estado === 'entregue' ? '●' : '○'}</span>
              ) : (
                <input
                  type="checkbox"
                  checked={Boolean(c.cri_entregue_em)}
                  disabled={Boolean(c.cri_aprovado_em) || !emAndamento}
                  onChange={(e) => mudar(rota, { acao: e.target.checked ? 'entregue' : 'desfazer' }, 'PUT')}
                  aria-label={`Entreguei: ${c.cri_texto}`}
                />
              )}
              <span className={styles.cresce}>{c.cri_texto}</span>
              <span className={styles.status}>{estado === 'aprovado' ? 'aprovado' : estado === 'entregue' ? 'entregue, falta aprovar' : 'falta'}</span>
              {contratante && emAndamento && estado === 'entregue' && (
                <span className={styles.acoes}>
                  <button type="button" className={styles.botao} onClick={() => mudar(rota, { acao: 'aprovar' }, 'PUT')} aria-label={`Aprovar: ${c.cri_texto}`}><Check size={14} strokeWidth={2.6} /> Aprovar</button>
                  <button type="button" className={styles.botao} onClick={() => mudar(rota, { acao: 'reprovar' }, 'PUT')} aria-label={`Pedir para refazer: ${c.cri_texto}`}><X size={14} strokeWidth={2.6} /> Refazer</button>
                </span>
              )}
              {contratante && emAndamento && estado !== 'aprovado' && (
                <button type="button" className={styles.icone} onClick={() => mudar(rota, { acao: 'apagar' }, 'PUT')} aria-label={`Apagar o critério ${c.cri_texto}`}>
                  <Trash2 size={14} strokeWidth={2.4} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {contratante && emAndamento && (
        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); mudar(`/servicos/${servId}/criterios`, { texto: novo }, 'POST') }}>
          <label className={styles.cresce}>
            Novo critério
            <input value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={150} placeholder='Ex.: "Site funcionando no celular"' />
          </label>
          <button type="submit" className={styles.botaoForte} disabled={novo.trim().length < 3}>Adicionar critério</button>
        </form>
      )}
    </section>
  )
}

/* ---------- Versões da entrega ---------- */

interface Versao {
  ver_id: number
  ver_numero: number
  ver_nota: string | null
  ver_link: string | null
  ver_data: string
}

export function VersoesEntrega({ servId }: { servId: number }) {
  const [dados] = useDoProjeto<{ disponivel?: boolean; versoes: Versao[] }>(`/servicos/${servId}/versoes`)
  if (!dados?.versoes.length) return null
  return (
    <section className={styles.painel} aria-label="Versões da entrega">
      <h3><History size={16} strokeWidth={2.4} aria-hidden="true" /> Versões da entrega</h3>
      <ol className={styles.lista}>
        {dados.versoes.map((v) => (
          <li key={v.ver_id}>
            <span className={styles.cresce}>
              <strong>Versão {v.ver_numero}</strong> · {formatarData(v.ver_data)}
              {v.ver_nota && <> · {v.ver_nota}</>}
            </span>
            {v.ver_link && (
              <a href={v.ver_link} target="_blank" rel="noreferrer" className={styles.botao}>
                Abrir <ExternalLink size={13} strokeWidth={2.4} aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Projeto recorrente ---------- */

export function RepetirProjeto({ servId, repetir, repetirEm, aoMudar }: { servId: number; repetir?: boolean; repetirEm?: string | null; aoMudar: () => void }) {
  const toast = useToast()
  if (repetir === undefined) return null

  async function enviar(caminho: string, metodo: 'PUT' | 'POST', corpo?: object) {
    try {
      const r = await api<{ mensagem: string }>(caminho, { metodo, corpo })
      toast.mostrar(r.mensagem, 'sucesso')
      aoMudar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível repetir o projeto.', 'erro')
    }
  }

  return (
    <section className={styles.painel} aria-label="Repetir o projeto">
      <h3><Repeat size={16} strokeWidth={2.4} aria-hidden="true" /> Projeto do mês</h3>
      <p className={styles.resumo}>
        {repetir && repetirEm
          ? `Este projeto volta todo mês, já com convite para o mesmo freelancer. O próximo sai em ${formatarData(`${repetirEm}T12:00:00`)}.`
          : 'Trabalho fixo (posts, manutenção)? Faça ele voltar todo mês, já com convite para o mesmo freelancer.'}
      </p>
      <div className={styles.acoes}>
        <label className={styles.chave}>
          <input type="checkbox" checked={repetir} onChange={(e) => enviar(`/servicos/${servId}/repetir`, 'PUT', { ativo: e.target.checked })} />
          Repetir todo mês
        </label>
        <button type="button" className={styles.botao} onClick={() => enviar(`/servicos/${servId}/repetir-agora`, 'POST')}>
          Publicar de novo agora
        </button>
      </div>
    </section>
  )
}
