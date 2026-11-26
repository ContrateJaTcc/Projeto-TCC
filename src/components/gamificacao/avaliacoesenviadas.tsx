import { useState } from 'react'
import { BriefcaseBusiness, EyeOff, Eye, Pencil, Trash2, Star } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Avatar from '../avatar/avatar'
import FormAvaliacao from './formavaliacao'
import styles from '../../pages/Avaliacoes.module.css'

export interface AvaliacaoEnviada {
  aval_id: number
  serv_id: number
  usu_avaliado: number
  usu_nome: string
  usu_foto: string | null
  serv_titulo: string
  aval_nota: number
  aval_comentario: string | null
  aval_data: string
  aval_comunicacao?: number | null
  aval_prazo?: number | null
  aval_qualidade?: number | null
  aval_editada_em?: string | null
  /* Ainda às cegas: dá para corrigir ou apagar */
  editavel: boolean
}

interface Props {
  avaliacoes: AvaliacaoEnviada[]
  diasAsCegas: number
  /* Depois de corrigir ou apagar: a página recarrega as listas */
  aoMudar: () => void
}

/* Avaliações que eu fiz: enquanto estão às cegas, dá para corrigir a nota ou apagar */
export default function AvaliacoesEnviadas({ avaliacoes, diasAsCegas, aoMudar }: Props) {
  const toast = useToast()
  const [editando, setEditando] = useState<number | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [apagando, setApagando] = useState(false)

  async function apagar(a: AvaliacaoEnviada) {
    if (confirmando !== a.aval_id) {
      setConfirmando(a.aval_id)
      return
    }
    setConfirmando(null)
    setApagando(true)
    try {
      const r = await api<{ mensagem: string }>(`/avaliacoes/${a.aval_id}`, { metodo: 'DELETE' })
      toast.mostrar(r.mensagem, 'sucesso')
      aoMudar()
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível apagar a avaliação.', 'erro')
    } finally {
      setApagando(false)
    }
  }

  if (avaliacoes.length === 0) return null

  return (
    <section className={styles.enviadas} aria-labelledby="titulo-enviadas">
      <h2 id="titulo-enviadas" className="placa">Avaliações que você fez</h2>
      <p className={`${styles.subtitulo} placa`}>
        Enquanto a nota está às cegas (até a outra pessoa avaliar, ou {diasAsCegas} dias), dá para corrigir ou apagar.
      </p>

      <div className={`${styles.grade} cascata`}>
        {avaliacoes.map((a) => {
          const prazo = new Date(new Date(a.aval_data).getTime() + diasAsCegas * 86_400_000)
          return (
            <article key={a.aval_id} className={styles.cartao} aria-label={`Sua avaliação de ${a.usu_nome}`}>
              <header className={styles.topo}>
                <Avatar nome={a.usu_nome} size={48} foto={a.usu_foto} />
                <div>
                  <span className={styles.pergunta}>Você avaliou</span>
                  <strong className={styles.nome}>{a.usu_nome}</strong>
                </div>
              </header>
              <p className={styles.projeto}>
                <BriefcaseBusiness size={15} strokeWidth={2.2} />
                {a.serv_titulo}
              </p>

              {editando === a.aval_id ? (
                <FormAvaliacao
                  pendente={{ serv_id: a.serv_id, usu_id: a.usu_avaliado }}
                  inicial={{
                    aval_id: a.aval_id,
                    nota: a.aval_nota,
                    comentario: a.aval_comentario,
                    comunicacao: a.aval_comunicacao,
                    prazo: a.aval_prazo,
                    qualidade: a.aval_qualidade,
                  }}
                  onCancelar={() => setEditando(null)}
                  onEnviada={() => {
                    setEditando(null)
                    toast.mostrar('Avaliação corrigida. Ela continua às cegas até a outra pessoa avaliar.', 'sucesso')
                    aoMudar()
                  }}
                />
              ) : (
                <>
                  <p className={styles.notaDada} aria-label={`Nota ${a.aval_nota} de 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={18} strokeWidth={2} className={n <= a.aval_nota ? styles.estrelaCheia : styles.estrelaVazia} aria-hidden="true" />
                    ))}
                    {a.aval_editada_em && <small>corrigida</small>}
                  </p>
                  {a.aval_comentario && <p className={styles.comentarioDado}>“{a.aval_comentario}”</p>}

                  {a.editavel ? (
                    <>
                      <p className={styles.cegaPequena}>
                        <EyeOff size={14} strokeWidth={2.2} aria-hidden="true" />
                        Às cegas: dá para mudar até {a.usu_nome.split(' ')[0]} avaliar você ou até {prazo.toLocaleDateString('pt-BR')}.
                      </p>
                      <div className={styles.acoesEnviada}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditando(a.aval_id)
                            setConfirmando(null)
                          }}
                        >
                          <Pencil size={15} strokeWidth={2.4} aria-hidden="true" /> Corrigir
                        </button>
                        <button
                          type="button"
                          className={confirmando === a.aval_id ? styles.apagarConfirmar : styles.apagar}
                          onClick={() => apagar(a)}
                          onBlur={() => setConfirmando((atual) => (atual === a.aval_id ? null : atual))}
                          disabled={apagando}
                        >
                          <Trash2 size={15} strokeWidth={2.4} aria-hidden="true" />
                          {confirmando === a.aval_id ? 'Clique de novo para apagar' : 'Apagar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className={styles.cegaPequena}>
                      <Eye size={14} strokeWidth={2.2} aria-hidden="true" />
                      Já aparece no perfil: não dá mais para mudar.
                    </p>
                  )}
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
