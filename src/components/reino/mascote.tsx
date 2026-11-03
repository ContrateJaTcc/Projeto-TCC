import Desenho from '../pixel/desenho'
import { faseDoNivel, ROTULO_FASE, type Especie } from '../../utils/reino'
import styles from './reino.module.css'

/*
 * Mascote do castelo em pixel art. Cresce com o nível do freelancer:
 * filhote (níveis 1 e 2), jovem com cachecol (3 a 5) e adulto com coroa (6 em diante).
 * O cachecol usa a cor de nome comprada na loja.
 */

const TINTA = '#1b1b30'

const SPRITES: Record<Especie, { linhas: string[]; cores: Record<string, string>; pescoco: number; cachecol: string; coroa: number }> = {
  gato: {
    linhas: [
      '................',
      '..OO........OO..',
      '..OMO......OMO..',
      '..OMMO....OMMO..',
      '..OMMMOOOOMMMO..',
      '.OMMMMMMMMMMMMO.',
      '.OMMMMMMMMMMMMO.',
      '.OMMMOMMMMOMMMO.',
      '.OMMMMMPPMMMMMO.',
      '.OLMMMMMMMMMMLO.',
      '..OMMMMMMMMMMO..',
      '..OMLLLLLLLLMO..',
      '..OMLLLLLLLLMO..',
      '..OMMOMMMMOMMO..',
      '..OOO.OOOO.OOO..',
      '................',
    ],
    cores: { O: TINTA, M: '#f2a65a', L: '#ffe3c2', P: '#e86a8a' },
    pescoco: 10,
    cachecol: '..OSSSSSSSSSSO..',
    coroa: 2,
  },
  dragao: {
    linhas: [
      '................',
      '...O........O...',
      '...OO......OO...',
      '....OOOOOOOO....',
      '...OMMMMMMMMO...',
      '..OMMOMMMMOMMO..',
      '..OMMMMMMMMMMO..',
      'O.OMMMLLLLMMMO.O',
      'OOOMMMMMMMMMMOOO',
      'OWOMMLLLLLLMMOWO',
      'OWWOMMMMMMMMOWWO',
      '.OWOMLLLLLLMOWO.',
      '..OOMMMMMMMMOO..',
      '...OMMOMMOMMO...',
      '...OOO.OO.OOO...',
      '................',
    ],
    cores: { O: TINTA, M: '#4fae6a', L: '#c9e8a4', W: '#2f7a48' },
    pescoco: 10,
    cachecol: 'OWWOSSSSSSSSOWWO',
    coroa: 1,
  },
  coruja: {
    linhas: [
      '................',
      '...OO......OO...',
      '...OMO....OMO...',
      '...OMMOOOOMMO...',
      '..OMMMMMMMMMMO..',
      '..OLLLMMMMLLLO..',
      '..OLOLMMMMLOLO..',
      '..OLLLMPPMLLLO..',
      '..OMMMMPPMMMMO..',
      '.OWMMLLLLLLMMWO.',
      '.OWMLLLLLLLLMWO.',
      '.OWMLLLLLLLLMWO.',
      '..OMMLLLLLLMMO..',
      '...OMMMMMMMMO...',
      '....OPO..OPO....',
      '................',
    ],
    cores: { O: TINTA, M: '#9a6b45', L: '#f1dfc0', W: '#6e4a2e', P: '#f2b33d' },
    pescoco: 9,
    cachecol: '.OWSSSSSSSSSSWO.',
    coroa: 1,
  },
  slime: {
    linhas: [
      '................',
      '................',
      '................',
      '......OOOO......',
      '....OOMMMMOO....',
      '...OMMMLLMMMO...',
      '..OMMMLLMMMMMO..',
      '..OMMMMMMMMMMO..',
      '.OMMOMMMMMMOMMO.',
      '.OMMOMMMMMMOMMO.',
      '.OMMMMMPPMMMMMO.',
      '.OMMMMMMMMMMMMO.',
      'OMMMMMMMMMMMMMMO',
      'OMMMMMMMMMMMMMMO',
      '.OOOOOOOOOOOOOO.',
      '................',
    ],
    cores: { O: TINTA, M: '#5ec4d6', L: '#d6f6fb', P: TINTA },
    pescoco: 11,
    cachecol: '.OSSSSSSSSSSSSO.',
    coroa: 1,
  },
}

/* Cachecol na cor do nome comprada na loja (sem cor, vermelho do estandarte) */
const COR_CACHECOL: Record<string, string> = { cor_ouro: '#e8b13a', cor_rosa: '#e07a96', cor_ciano: '#2aa3bb', cor_lilas: '#9b72d6' }

interface MascoteProps {
  especie: Especie | string
  nivel: number
  /* Cor de nome equipada (cor_ouro, cor_rosa...) */
  cor?: string | null
  tamanho?: number
  /* Nome para leitores de tela; sem nome, o desenho é decorativo */
  nome?: string | null
  parado?: boolean
}

export default function Mascote({ especie, nivel, cor, tamanho = 96, nome, parado = false }: MascoteProps) {
  const sprite = SPRITES[(especie as Especie) in SPRITES ? (especie as Especie) : 'gato']
  const fase = faseDoNivel(nivel)
  const linhas = fase === 'filhote' ? sprite.linhas : sprite.linhas.map((l, i) => (i === sprite.pescoco ? sprite.cachecol : l))
  const cores = { ...sprite.cores, S: (cor && COR_CACHECOL[cor]) ?? '#c2412d', Y: '#f2c66d' }
  /* Filhote é menor: o desenho fica no meio de uma área maior */
  const vista = fase === 'filhote' ? '-3 -5 22 22' : '0 0 16 16'

  return (
    <svg
      className={`${styles.mascote} ${parado ? '' : styles.balanca}`}
      width={tamanho}
      height={tamanho}
      viewBox={vista}
      shapeRendering="crispEdges"
      role={nome ? 'img' : undefined}
      aria-label={nome ? `${nome}, ${ROTULO_FASE[fase].toLowerCase()}` : undefined}
      aria-hidden={nome ? undefined : true}
    >
      <Desenho linhas={linhas} cores={cores} />
      {fase === 'adulto' && <Desenho linhas={['Y..Y', 'YYYY']} cores={cores} x={6} y={sprite.coroa} />}
    </svg>
  )
}
