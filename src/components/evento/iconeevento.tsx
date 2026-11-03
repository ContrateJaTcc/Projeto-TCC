import Desenho from '../pixel/desenho'
import type { CodigoEvento } from '../../utils/eventos'

/* O item escondido de cada evento, em pixel art (mesmo traço do cenário) */
const DESENHOS: Record<CodigoEvento, { linhas: string[]; cores: Record<string, string> }> = {
  halloween: {
    linhas: ['....s....', '...s.....', '.ooOoOoo.', 'ooyoooyoo', 'oooOoOooo', 'oyyyyyyyo', '.ooyoyoo.', '..ooooo..'],
    cores: { o: '#e0782a', O: '#a84b16', y: '#ffd45e', s: '#4c7a2e' },
  },
  natal: {
    linhas: ['..y...y..', '...y.y...', 'rrrryrrrr', 'rrrryrrrr', 'yyyyyyyyy', 'rrrryrrrr', 'rrrryrrrr', 'rrrryrrrr'],
    cores: { r: '#d8433a', y: '#ffd45e' },
  },
  ano_novo: {
    linhas: ['....y....', '....y....', '...yyy...', 'yyyyYyyyy', '.yyYYYyy.', '..yyyyy..', '.yy...yy.', 'yy.....yy'],
    cores: { y: '#ffd45e', Y: '#fff3c4' },
  },
  carnaval: {
    linhas: ['r...b...g', '..y...p..', '.b..g..r.', '...ppp...', '..ppppp..', '.pppMppp.', '..ppppp..', '...ppp...'],
    cores: { r: '#ff6b5e', b: '#5ec4d6', g: '#5fe0a0', y: '#ffd45e', p: '#c88bff', M: '#fbf5ef' },
  },
  festa_junina: {
    linhas: ['..rrrrr..', '.rryrrrr.', 'rrrrrrrrr', 'rryrrryrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '....f....'],
    cores: { r: '#ff6b5e', y: '#ffd45e', f: '#ffd45e' },
  },
}

export default function IconeEvento({ codigo, tamanho = 28 }: { codigo: CodigoEvento; tamanho?: number }) {
  const { linhas, cores } = DESENHOS[codigo]
  const largura = Math.max(...linhas.map((l) => l.length))
  return (
    <svg width={tamanho} height={(tamanho * linhas.length) / largura} viewBox={`0 0 ${largura} ${linhas.length}`} shapeRendering="crispEdges" aria-hidden="true">
      <Desenho linhas={linhas} cores={cores} />
    </svg>
  )
}
