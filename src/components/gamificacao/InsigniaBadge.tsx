import { useEffect, useState } from 'react'
import {
  buscarInsignia,
  type InsigniaResposta,
  type NomeInsignia,
} from '../../services/insigniasService'

const VISUAL: Record<NomeInsignia, { nivel: string; imagem: string }> = {
  'Quartzo Rosa':      { nivel: 'Bronze',   imagem: '/insignias/quartzo_rosa.png' },
  'Rubelita':          { nivel: 'Prata',    imagem: '/insignias/rubelita.png' },
  'Opala de Fogo':     { nivel: 'Ouro',     imagem: '/insignias/opala_de_fogo.png' },
  'Turmalina Paraíba': { nivel: 'Diamante', imagem: '/insignias/turmalina_paraiba.png' },
}

export default function InsigniaBadge({ freeId }: { freeId: number }) {
  const [dados, setDados] = useState<InsigniaResposta | null>(null)

  useEffect(() => {
    let ativo = true
    buscarInsignia(freeId)
      .then((r) => ativo && setDados(r))
      .catch(() => ativo && setDados(null))
    return () => { ativo = false }
  }, [freeId])

  if (!dados?.insignia) return null
  const visual = VISUAL[dados.insignia]

  return (
    <div
      title={`${dados.servicos_concluidos} serviços concluídos · ${dados.total_avaliacoes} avaliações · média ${dados.media_avaliacoes}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <img src={visual.imagem} alt={`Insígnia ${dados.insignia}`} width={72} style={{ borderRadius: 12 }} />
      <div>
        <strong>{dados.insignia}</strong>
        <div style={{ fontSize: 13, opacity: 0.8 }}>{visual.nivel}</div>
      </div>
    </div>
  )
}