import Mascote from './mascote'
import Brasao from './brasao'
import type { GuildaResumo } from '../../utils/aparencia'
import styles from './quarto.module.css'

interface Props {
  nome: string
  nivel: number
  /* Quantas insígnias a pessoa tem: viram troféus na estante */
  insignias: number
  testes?: number
  moldura?: string | null
  cor_nome?: string | null
  mascote?: { especie: string; nome: string } | null
  guilda?: GuildaResumo | null
}

/* Cor do tapete e das cortinas pela cor do nome comprada na loja */
const CORES: Record<string, string> = {
  cor_ciano: '#5ec4d6',
  cor_rosa: '#e07ab8',
  cor_verde: '#5fe0a0',
  cor_ouro: '#ffc23d',
  cor_roxo: '#9b6bff',
  cor_fogo: '#e8663a',
}

const TROFEUS = ['#ffc23d', '#d9dde8', '#e0995a', '#9b6bff', '#5ec4d6', '#5fe0a0', '#e07ab8', '#ffd877']

/*
 * Quarto no castelo, em pixel art: a estante mostra um troféu por insígnia (até 8), o quadro da parede
 * usa a moldura equipada, o tapete tem a cor do nome e o mascote dorme no meio. Cresce com o nível:
 * planta no nível 3, livros com teste de habilidade, estandarte da guilda.
 */
export default function QuartoCastelo({ nome, nivel, insignias, testes = 0, moldura, cor_nome, mascote, guilda }: Props) {
  const cor = (cor_nome && CORES[cor_nome]) || '#c2412d'
  const molduraCor = moldura?.includes('ouro') || moldura?.includes('campeao') ? '#ffc23d' : moldura?.includes('cristal') ? '#9fe8ff' : moldura?.includes('dragao') ? '#c2412d' : '#8a5a33'
  const trofeus = Math.min(8, insignias)
  const descricao = [
    `Quarto de ${nome.split(' ')[0]} no castelo`,
    trofeus ? `${trofeus} ${trofeus === 1 ? 'troféu' : 'troféus'} na estante` : 'estante esperando o primeiro troféu',
    mascote ? `o mascote ${mascote.nome} no tapete` : null,
    guilda ? `estandarte da guilda ${guilda.nome}` : null,
  ].filter(Boolean).join(', ')

  return (
    <figure className={styles.quarto} role="img" aria-label={descricao}>
      <svg viewBox="0 0 64 40" shapeRendering="crispEdges" className={styles.cena} aria-hidden="true">
        {/* Parede de pedra e chão de madeira */}
        <rect width="64" height="28" fill="#3a3358" />
        {Array.from({ length: 6 }, (_, l) => Array.from({ length: 9 }, (_, c) => (
          <rect key={`${l}-${c}`} x={c * 8 - (l % 2) * 4} y={l * 4.6} width="7.4" height="4" fill={(l + c) % 3 ? '#433b66' : '#4a4170'} />
        )))}
        <rect y="28" width="64" height="12" fill="#6b4a2b" />
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={i * 8} y="28" width="0.6" height="12" fill="#5a3d23" />)}
        <rect y="27.4" width="64" height="0.8" fill="#2a2440" />

        {/* Janela com a lua */}
        <rect x="6" y="5" width="12" height="11" fill="#1b1b30" />
        <rect x="7" y="6" width="10" height="9" fill="#26305e" />
        <rect x="13" y="7" width="3" height="3" fill="#fff3d6" />
        <rect x="11.6" y="6" width="0.8" height="9" fill="#1b1b30" />
        <rect x="7" y="10.2" width="10" height="0.8" fill="#1b1b30" />
        <rect x="5" y="4" width="2" height="13" fill={cor} />
        <rect x="17" y="4" width="2" height="13" fill={cor} />

        {/* Quadro com a moldura equipada */}
        <rect x="26" y="6" width="10" height="8" fill={molduraCor} />
        <rect x="27" y="7" width="8" height="6" fill="#5ec4d6" />
        <rect x="27" y="10" width="8" height="3" fill="#5fe0a0" />
        <rect x="30" y="8" width="2" height="2" fill="#ffc23d" />

        {/* Estante com os troféus */}
        <rect x="42" y="8" width="18" height="1.2" fill="#8a5a33" />
        <rect x="42" y="16" width="18" height="1.2" fill="#8a5a33" />
        {Array.from({ length: trofeus }, (_, i) => {
          const x = 43 + (i % 4) * 4.3
          const y = i < 4 ? 4.6 : 12.6
          return (
            <g key={i}>
              <rect x={x} y={y} width="2.6" height="2" fill={TROFEUS[i]} />
              <rect x={x + 0.8} y={y + 2} width="1" height="1" fill={TROFEUS[i]} />
              <rect x={x + 0.3} y={y + 3} width="2" height="0.4" fill="#1b1b30" />
            </g>
          )
        })}

        {/* Livros (passou em teste de habilidade) */}
        {testes > 0 && (
          <g>
            {['#c2412d', '#5ec4d6', '#ffc23d'].slice(0, Math.min(3, testes + 1)).map((c, i) => <rect key={i} x={50 + i * 1.6} y={19} width="1.4" height="5" fill={c} />)}
            <rect x="49" y="24" width="8" height="1" fill="#8a5a33" />
          </g>
        )}

        {/* Planta a partir do nível 3 */}
        {nivel >= 3 && (
          <g>
            <rect x="2" y="22" width="4" height="5" fill="#c2412d" />
            <rect x="1" y="17" width="2" height="5" fill="#3f9a62" />
            <rect x="3" y="15" width="2" height="7" fill="#5fe0a0" />
            <rect x="5" y="18" width="2" height="4" fill="#3f9a62" />
          </g>
        )}

        {/* Estandarte da guilda */}
        {guilda && <rect x="21" y="4" width="0.6" height="14" fill="#1b1b30" />}

        {/* Tapete na cor do nome */}
        <rect x="18" y="31" width="28" height="6" fill={cor} />
        <rect x="19" y="32" width="26" height="4" fill="#fff3d6" opacity="0.18" />
      </svg>

      {guilda && (
        <span className={styles.estandarte}>
          <Brasao brasao={guilda.brasao} cor={guilda.cor} tamanho={26} titulo={`Guilda ${guilda.nome}`} />
        </span>
      )}
      {mascote && (
        <span className={styles.mascote}>
          <Mascote especie={mascote.especie} nivel={nivel} cor={cor_nome} tamanho={52} nome={mascote.nome} parado />
        </span>
      )}
      <figcaption>
        Quarto de {nome.split(' ')[0]} · {trofeus ? `${trofeus} ${trofeus === 1 ? 'troféu' : 'troféus'}` : 'sem troféus ainda'}
      </figcaption>
    </figure>
  )
}
