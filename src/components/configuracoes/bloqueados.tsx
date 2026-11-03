import { useEffect, useState } from 'react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { formatarData } from '../../utils/formatar'
import styles from '../../pages/Configuracoes.module.css'
import proprio from './cartas.module.css'

interface Bloqueado {
  usu_id: number
  usu_nome: string
  tipo_usuario: string
  blo_data: string
}

/* Pessoas bloqueadas (no chat ou no portfólio), com o botão de desbloquear */
export default function ListaBloqueados() {
  const toast = useToast()
  const [lista, setLista] = useState<Bloqueado[] | null>(null)

  useEffect(() => {
    let vivo = true
    api<{ disponivel: boolean; bloqueados: Bloqueado[] }>('/usuarios/eu/bloqueados', { silencioso: true })
      .then((d) => vivo && setLista(d.disponivel ? d.bloqueados : null))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (lista === null) return null

  async function desbloquear(b: Bloqueado) {
    try {
      const r = await api<{ mensagem: string }>(`/usuarios/bloqueios/${b.usu_id}`, { metodo: 'DELETE' })
      setLista((l) => l?.filter((x) => x.usu_id !== b.usu_id) ?? null)
      toast.mostrar(r.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível desbloquear.', 'erro')
    }
  }

  return (
    <div className={`${styles.opcao} ${styles.opcaoColuna}`}>
      <div className={styles.opcaoTexto}>
        <strong>Pessoas bloqueadas</strong>
        <span>{lista.length ? 'Elas não mandam mensagem, proposta, convite nem candidatura para você.' : 'Ninguém. Dá para bloquear alguém pelo chat ou pelo portfólio.'}</span>
      </div>
      {lista.length > 0 && (
        <ul className={proprio.lista}>
          {lista.map((b) => (
            <li key={b.usu_id}>
              <div>
                <strong>{b.usu_nome}</strong>
                <span>{b.tipo_usuario === 'freelancer' ? 'Freelancer' : 'Contratante'} · desde {formatarData(b.blo_data)}</span>
              </div>
              <button type="button" className={styles.botao} onClick={() => desbloquear(b)}>Desbloquear</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
