import { useEffect, useState } from 'react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Chave from './chave'

interface Privacidade {
  disponivel: boolean
  mostrar_online: boolean
  aparecer_busca: boolean
}

/* "Visto por último" e aparecer na busca (guardados na conta, valem em qualquer aparelho) */
export default function OpcoesPrivacidade({ papel }: { papel: string | null }) {
  const toast = useToast()
  const [dados, setDados] = useState<Privacidade | null>(null)

  useEffect(() => {
    let vivo = true
    api<Privacidade>('/usuarios/eu/privacidade', { silencioso: true })
      .then((d) => vivo && setDados(d))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  async function mudar(campo: 'mostrar_online' | 'aparecer_busca', valor: boolean) {
    if (!dados) return
    const anterior = dados
    setDados({ ...dados, [campo]: valor })
    try {
      await api('/usuarios/eu/privacidade', { metodo: 'PUT', corpo: { [campo]: valor }, silencioso: true })
      toast.mostrar('Privacidade salva.', 'sucesso')
    } catch (e) {
      setDados(anterior)
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar.', 'erro')
    }
  }

  if (!dados?.disponivel) return null

  return (
    <>
      <Chave
        rotulo="Mostrar quando estou online"
        dica='No chat e no portfólio aparece "online agora" ou "visto há 2 h". Desligado, ninguém vê (e você continua vendo os outros).'
        ligada={dados.mostrar_online}
        aoMudar={(v) => mudar('mostrar_online', v)}
      />
      {papel === 'freelancer' && (
        <Chave
          rotulo="Aparecer na busca de freelancers"
          dica="Desligado, você some da busca e do mapa dos contratantes (sem apagar a conta). Quem já conversa com você continua conversando."
          ligada={dados.aparecer_busca}
          aoMudar={(v) => mudar('aparecer_busca', v)}
        />
      )}
    </>
  )
}
