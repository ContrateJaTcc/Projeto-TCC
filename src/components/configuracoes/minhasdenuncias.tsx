import { useEffect, useState } from 'react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarData } from '../../utils/formatar'
import styles from '../../pages/Configuracoes.module.css'
import proprio from './cartas.module.css'

interface Denuncia {
  den_id: number
  alvo_tipo: 'servico' | 'usuario' | 'mensagem'
  alvo: string
  motivo: string
  detalhe: string | null
  status: 'aberta' | 'resolvida' | 'descartada'
  data: string
}

const MOTIVOS: Record<string, string> = {
  golpe: 'golpe ou fraude',
  spam: 'spam ou propaganda',
  ofensivo: 'conteúdo ofensivo',
  falso: 'informações falsas',
  outro: 'outro motivo',
}

const STATUS: Record<Denuncia['status'], string> = {
  aberta: 'em análise',
  resolvida: 'analisada: a administração tomou providências',
  descartada: 'analisada: nada fora das regras',
}

/* O que eu denunciei e em que pé está; enquanto está em análise, dá para retirar */
export default function MinhasDenuncias() {
  const toast = useToast()
  const [lista, setLista] = useState<Denuncia[] | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)

  useEffect(() => {
    let vivo = true
    api<{ denuncias: Denuncia[] }>('/denuncias/minhas', { silencioso: true })
      .then((d) => vivo && setLista(d.denuncias))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (lista === null) return null

  async function retirar(d: Denuncia) {
    if (confirmando !== d.den_id) {
      setConfirmando(d.den_id)
      return
    }
    setConfirmando(null)
    try {
      const r = await api<{ mensagem: string }>(`/denuncias/${d.den_id}`, { metodo: 'DELETE' })
      setLista((l) => l?.filter((x) => x.den_id !== d.den_id) ?? null)
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível retirar a denúncia.', 'erro')
    }
  }

  return (
    <div className={`${styles.opcao} ${styles.opcaoColuna}`}>
      <div className={styles.opcaoTexto}>
        <strong>Minhas denúncias</strong>
        <span>
          {lista.length
            ? 'Quem foi denunciado não sabe que foi você. Enquanto estiver em análise, dá para retirar.'
            : 'Nenhuma. Dá para denunciar um projeto, um perfil ou uma mensagem pelo botão "Denunciar".'}
        </span>
      </div>
      {lista.length > 0 && (
        <ul className={proprio.lista} aria-label="Minhas denúncias">
          {lista.map((d) => (
            <li key={d.den_id}>
              <div>
                <strong>{d.alvo}</strong>
                <span>
                  {MOTIVOS[d.motivo] ?? d.motivo} · {formatarData(d.data)} · {STATUS[d.status]}
                </span>
              </div>
              {d.status === 'aberta' && (
                <button
                  type="button"
                  className={styles.botao}
                  onClick={() => retirar(d)}
                  onBlur={() => setConfirmando((atual) => (atual === d.den_id ? null : atual))}
                  aria-label={confirmando === d.den_id ? `Confirmar: retirar a denúncia de ${d.alvo}` : `Retirar a denúncia de ${d.alvo}`}
                >
                  {confirmando === d.den_id ? 'Confirmar' : 'Retirar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
