import { useEffect, useState } from 'react'
import { Bell, Smartphone } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { avisosPadrao, CATEGORIAS_AVISO, ROTULO_CATEGORIA, type CanalAviso, type CategoriaAviso, type PreferenciaAvisos } from '../../utils/avisos'
import styles from '../../pages/Configuracoes.module.css'
import proprio from './avisos.module.css'

/* Avisos por tipo: o que chega no sino e no celular (avisos da conta sempre chegam) */
export default function AvisosPorTipo() {
  const toast = useToast()
  const [avisos, setAvisos] = useState<PreferenciaAvisos | null>(null)
  const [disponivel, setDisponivel] = useState(true)

  useEffect(() => {
    let vivo = true
    api<{ disponivel: boolean; avisos: PreferenciaAvisos }>('/usuarios/eu/avisos', { silencioso: true })
      .then((d) => {
        if (!vivo) return
        setAvisos(d.avisos)
        setDisponivel(d.disponivel)
      })
      .catch(() => vivo && setAvisos(avisosPadrao()))
    return () => {
      vivo = false
    }
  }, [])

  async function mudar(canal: CanalAviso, categoria: CategoriaAviso, ligado: boolean) {
    if (!avisos) return
    const anterior = avisos
    const novo = { ...avisos, [canal]: { ...avisos[canal], [categoria]: ligado } }
    setAvisos(novo)
    try {
      await api('/usuarios/eu/avisos', { metodo: 'PUT', corpo: { avisos: novo }, silencioso: true })
    } catch (e) {
      setAvisos(anterior)
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar.', 'erro')
    }
  }

  if (!avisos) return null

  return (
    <div className={`${styles.opcao} ${styles.opcaoColuna}`}>
      <div className={styles.opcaoTexto}>
        <strong>Avisos por tipo</strong>
        <span>Escolha o que chega no sino do site e no celular. Avisos da conta (segurança, suspensão) sempre chegam.</span>
      </div>
      {!disponivel ? (
        <span className={styles.texto}>Esta opção ainda não está disponível no servidor.</span>
      ) : (
        <table className={proprio.tabela}>
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col"><Bell size={14} strokeWidth={2.4} aria-hidden="true" /> Sino</th>
              <th scope="col"><Smartphone size={14} strokeWidth={2.4} aria-hidden="true" /> Celular</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS_AVISO.map((c) => (
              <tr key={c}>
                <th scope="row">
                  {ROTULO_CATEGORIA[c].titulo}
                  <small>{ROTULO_CATEGORIA[c].exemplo}</small>
                </th>
                {(['sino', 'celular'] as const).map((canal) => (
                  <td key={canal}>
                    <input
                      type="checkbox"
                      checked={avisos[canal][c]}
                      onChange={(e) => mudar(canal, c, e.target.checked)}
                      aria-label={`${ROTULO_CATEGORIA[c].titulo} no ${canal === 'sino' ? 'sino' : 'celular'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
